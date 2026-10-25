import json
import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Strategy, SignalLog, Order, UserConfig
from app.schemas import StrategyCreate, StrategyUpdate, BacktestRequest, BacktestResponse
from app.services.strategy_engine import StrategyEngine
from app.services.delta_client import delta_client
from app.services.explanation_service import ExplanationService
from app.services.risk_manager import RiskManager
from app.services.execution_engine import ExecutionEngine

router = APIRouter(prefix="/api/strategies", tags=["Strategies"])

INITIAL_STRATEGIES = [
    {
        "id": "strat-ema-rsi",
        "name": "EMA Crossover + RSI Guard",
        "strategy_type": "ema_rsi",
        "symbol": "BTCUSD",
        "timeframe": "15m",
        "is_active": True,
        "profile": "balanced",
        "allocated_tokens": 10.0,
        "parameters_json": json.dumps({
            "ema_fast": 9,
            "ema_slow": 21,
            "rsi_period": 14,
            "rsi_overbought": 70,
            "rsi_oversold": 30,
            "adx_filter": True,
            "adx_threshold": 25.0
        }),
        "description_plain": "Captures medium-term crypto momentum when short-term trend overtakes long-term trend, confirmed by RSI momentum and ADX trend strength."
    },
    {
        "id": "strat-donchian-atr",
        "name": "Donchian Breakout + ATR Volatility",
        "strategy_type": "donchian_atr",
        "symbol": "BTCUSD",
        "timeframe": "15m",
        "is_active": False,
        "profile": "active",
        "allocated_tokens": 10.0,
        "parameters_json": json.dumps({
            "donchian_lookback": 20,
            "atr_period": 14,
            "atr_multiplier": 2.0
        }),
        "description_plain": "Enters on 20-period price highs or lows, dynamically setting stop-loss distance as a multiple of Average True Range (ATR)."
    },
    {
        "id": "strat-bollinger-stoch",
        "name": "Bollinger Bands + Stochastic Reversion",
        "strategy_type": "bollinger_stoch",
        "symbol": "ETHUSD",
        "timeframe": "15m",
        "is_active": True,
        "profile": "defensive",
        "allocated_tokens": 8.0,
        "parameters_json": json.dumps({
            "bb_period": 20,
            "bb_std": 2.0,
            "stoch_oversold": 20.0,
            "stoch_overbought": 80.0
        }),
        "description_plain": "Statistical mean reversion: Identifies 2-sigma oversold / overbought conditions in range-bound markets and targets the central mean."
    },
    {
        "id": "strat-vwap-imbalance",
        "name": "VWAP Liquidity + Volume Imbalance",
        "strategy_type": "vwap_imbalance",
        "symbol": "BTCUSD",
        "timeframe": "5m",
        "is_active": True,
        "profile": "balanced",
        "allocated_tokens": 10.0,
        "parameters_json": json.dumps({
            "deviation_threshold_pct": 0.25,
            "atr_period": 14
        }),
        "description_plain": "Exploits order flow liquidity imbalances by identifying excessive discounts from the Volume-Weighted Average Price (VWAP)."
    },
    {
        "id": "strat-supertrend-macd",
        "name": "SuperTrend + MACD Trend Reversal",
        "strategy_type": "supertrend_macd",
        "symbol": "SOLUSD",
        "timeframe": "15m",
        "is_active": True,
        "profile": "active",
        "allocated_tokens": 6.0,
        "parameters_json": json.dumps({
            "period": 10,
            "multiplier": 3.0
        }),
        "description_plain": "Multi-timeframe trend following algorithm combining adaptive trailing SuperTrend stops with MACD momentum divergence."
    },
    {
        "id": "strat-vsa-sweep",
        "name": "Smart Money Liquidity Sweep (SMC)",
        "strategy_type": "vsa_liquidity_sweep",
        "symbol": "BTCUSD",
        "timeframe": "15m",
        "is_active": False,
        "profile": "active",
        "allocated_tokens": 8.0,
        "parameters_json": json.dumps({
            "lookback": 20,
            "atr_period": 14
        }),
        "description_plain": "Detects institutional stop-loss runs beyond key swing levels, capturing swift absorption reversals back inside fair value."
    }
]

def seed_strategies_if_needed(db: Session):
    for s_data in INITIAL_STRATEGIES:
        exist = db.query(Strategy).filter(Strategy.id == s_data["id"]).first()
        if not exist:
            db.add(Strategy(**s_data))
    db.commit()

@router.get("")
def list_strategies(db: Session = Depends(get_db)):
    seed_strategies_if_needed(db)
    strategies = db.query(Strategy).all()
    results = []
    for s in strategies:
        results.append({
            "id": s.id,
            "name": s.name,
            "strategy_type": s.strategy_type,
            "symbol": s.symbol,
            "timeframe": s.timeframe,
            "is_active": s.is_active,
            "profile": s.profile,
            "allocated_tokens": s.allocated_tokens,
            "parameters": json.loads(s.parameters_json or "{}"),
            "description_plain": s.description_plain,
            "created_at": s.created_at.isoformat()
        })
    return results

@router.patch("/{strategy_id}")
def update_strategy(strategy_id: str, payload: StrategyUpdate, db: Session = Depends(get_db)):
    s = db.query(Strategy).filter(Strategy.id == strategy_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Strategy not found")
    
    if payload.name is not None:
        s.name = payload.name
    if payload.is_active is not None:
        s.is_active = payload.is_active
    if payload.profile is not None:
        s.profile = payload.profile
    if payload.allocated_tokens is not None:
        s.allocated_tokens = payload.allocated_tokens
    if payload.parameters_json is not None:
        s.parameters_json = payload.parameters_json
    if payload.timeframe is not None:
        s.timeframe = payload.timeframe
    if payload.symbol is not None:
        s.symbol = payload.symbol

    db.commit()
    return {"success": True, "strategy_id": strategy_id, "is_active": s.is_active}

@router.post("/{strategy_id}/generate-signal")
async def generate_signal(strategy_id: str, db: Session = Depends(get_db)):
    """Evaluate strategy on live candles and generate a proposed trade with full explanations."""
    s = db.query(Strategy).filter(Strategy.id == strategy_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Strategy not found")

    candles = await delta_client.get_candlesticks(symbol=s.symbol, resolution=s.timeframe, count=60)
    params = json.loads(s.parameters_json or "{}")

    eval_result = StrategyEngine.evaluate_strategy(s.strategy_type, candles, params)
    side = eval_result.get("signal_side", "buy")
    price = eval_result.get("price")
    stop_loss = eval_result.get("stop_loss")
    take_profit = eval_result.get("take_profit")
    indicators = eval_result.get("indicators", {})

    # Order sizing: default 0.01 BTC or equivalent
    quantity = 0.01 if "BTC" in s.symbol else (0.1 if "ETH" in s.symbol else 1.0)
    ticker = await delta_client.get_ticker(s.symbol)

    passed, reason, risk_metrics = RiskManager.evaluate_order(
        db=db,
        symbol=s.symbol,
        side=side,
        price=price,
        quantity=quantity,
        stop_loss=stop_loss,
        take_profit=take_profit,
        ticker=ticker
    )

    # Generate multi-level explanations
    explanations = ExplanationService.generate_explanation(
        strategy_type=s.strategy_type,
        side=side,
        price=price,
        stop_loss=stop_loss,
        take_profit=take_profit,
        indicators=indicators,
        risk_metrics=risk_metrics
    )

    # Save to SignalLog
    signal_id = f"SIG-{uuid.uuid4().hex[:8].upper()}"
    sig = SignalLog(
        id=signal_id,
        symbol=s.symbol,
        strategy_type=s.strategy_type,
        side=side,
        price=price,
        plain_explanation=explanations["plain_explanation"],
        technical_explanation=explanations["technical_explanation"],
        risk_explanation=explanations["risk_explanation"],
        status="proposed" if passed else "rejected",
        indicators_json=json.dumps(indicators)
    )
    db.add(sig)
    db.commit()

    # If passed and strategy is active, create pending proposal with 10s grace period
    order_proposal = None
    if passed and s.is_active:
        order_proposal = ExecutionEngine.create_proposal(
            db=db,
            symbol=s.symbol,
            side=side,
            price=price,
            quantity=quantity,
            stop_loss=stop_loss,
            take_profit=take_profit,
            strategy_id=s.id,
            signal_id=signal_id
        )

    return {
        "signal_id": signal_id,
        "symbol": s.symbol,
        "side": side,
        "price": price,
        "stop_loss": stop_loss,
        "take_profit": take_profit,
        "risk_passed": passed,
        "risk_reason": reason,
        "plain_explanation": explanations["plain_explanation"],
        "technical_explanation": explanations["technical_explanation"],
        "risk_explanation": explanations["risk_explanation"],
        "order_proposed": {
            "order_id": order_proposal.id,
            "grace_expires_at": order_proposal.grace_expires_at.isoformat(),
            "status": order_proposal.status
        } if order_proposal else None
    }

@router.post("/backtest")
async def run_backtest_endpoint(req: BacktestRequest):
    candles = await delta_client.get_candlesticks(symbol=req.symbol, resolution=req.timeframe, count=160)
    result = StrategyEngine.run_backtest(
        candles=candles,
        strategy_type=req.strategy_type,
        initial_tokens=req.initial_tokens,
        parameters=req.parameters,
        fee_pct=req.fee_pct,
        slippage_pct=req.slippage_pct
    )
    return result
