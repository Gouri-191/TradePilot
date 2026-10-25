import asyncio
import logging
import uuid
from datetime import datetime, timedelta
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models import Strategy, Order, Position, UserConfig, SignalLog, AuditLog, WalletLedger
from app.services.delta_client import delta_client
from app.services.strategy_engine import StrategyEngine
from app.services.risk_manager import RiskManager
from app.services.explanation_service import ExplanationService
from app.services.execution_engine import ExecutionEngine
from app.config import settings

logger = logging.getLogger("autonomous_engine")

class AutonomousTradingEngine:
    """
    Continuous background autonomous trading engine for TradePilot.
    - Runs continuous tick scanning across crypto instruments.
    - Evaluates active algorithmic strategies in real-time.
    - Enforces 10-point mandatory risk compliance before proposing trades.
    - Queues orders into the 10-second human intervention grace period.
    - Auto-submits eligible orders when grace countdown completes.
    - Actively monitors open positions for Stop-Loss and Take-Profit triggers.
    """
    is_running: bool = True
    ticks_evaluated: int = 0
    signals_generated: int = 0
    trades_executed: int = 0
    last_scan_at: str = datetime.utcnow().isoformat()
    last_action_note: str = "Engine initialized in standby mode."

    @classmethod
    async def run_engine_loop(cls):
        logger.info("⚡ Autonomous Trading Engine started. Actively scanning markets...")
        while True:
            try:
                if cls.is_running:
                    await cls._tick()
            except Exception as e:
                logger.error(f"Error in autonomous engine tick: {e}", exc_info=True)
            
            await asyncio.sleep(4) # Run loop every 4 seconds

    @classmethod
    async def _tick(cls):
        db: Session = SessionLocal()
        cls.ticks_evaluated += 1
        cls.last_scan_at = datetime.utcnow().isoformat()

        try:
            cfg = db.query(UserConfig).first()
            if not cfg or cfg.emergency_stop_triggered:
                cls.last_action_note = "Emergency Stop active - all automated executions halted."
                return

            if not cfg.autonomous_engine_active:
                cls.last_action_note = "Automation paused by user toggle."
                return

            # 1. Update Open Positions & Check Stop-Loss / Take-Profit Triggers
            open_positions = db.query(Position).filter(Position.status == "open").all()
            for pos in open_positions:
                ticker = await delta_client.get_ticker(pos.symbol)
                curr_price = ticker.get("mark_price", pos.current_price)
                pos.current_price = curr_price

                # Check PnL
                if pos.side == "buy":
                    pos.unrealized_pnl = round((curr_price - pos.entry_price) * pos.quantity / 85.0, 4)
                else:
                    pos.unrealized_pnl = round((pos.entry_price - curr_price) * pos.quantity / 85.0, 4)

                # Check Stop-Loss Trigger
                if pos.stop_loss:
                    sl_hit = (pos.side == "buy" and curr_price <= pos.stop_loss) or \
                             (pos.side == "sell" and curr_price >= pos.stop_loss)
                    if sl_hit:
                        logger.info(f"🛑 Position {pos.id} hit Stop-Loss at ${curr_price}! Auto-closing position.")
                        ExecutionEngine.close_position(db, pos.id, exit_price=curr_price, reason=f"Auto Stop-Loss Triggered at ${curr_price:,.2f}")
                        cls.last_action_note = f"Position {pos.symbol} Stop-Loss hit at ${curr_price:,.2f}. Exited safely."
                        continue

                # Check Take-Profit Trigger
                if pos.take_profit:
                    tp_hit = (pos.side == "buy" and curr_price >= pos.take_profit) or \
                             (pos.side == "sell" and curr_price <= pos.take_profit)
                    if tp_hit:
                        logger.info(f"🎯 Position {pos.id} hit Take-Profit at ${curr_price}! Auto-taking profit.")
                        ExecutionEngine.close_position(db, pos.id, exit_price=curr_price, reason=f"Auto Take-Profit Triggered at ${curr_price:,.2f}")
                        cls.last_action_note = f"Position {pos.symbol} Take-Profit captured at ${curr_price:,.2f}!"
                        continue

            # 2. Process Pending Grace Period Orders
            now = datetime.utcnow()
            pending_orders = db.query(Order).filter(
                Order.status == "proposal_grace",
                Order.grace_expires_at <= now
            ).all()

            for ord_item in pending_orders:
                logger.info(f"⏳ Grace period expired for {ord_item.id}. Submitting to exchange matching engine.")
                res = await ExecutionEngine.execute_order_now(db, ord_item.id)
                if res.get("success"):
                    cls.trades_executed += 1
                    cls.last_action_note = f"Auto-executed {ord_item.side.upper()} {ord_item.symbol} after grace countdown."
                else:
                    cls.last_action_note = f"Order {ord_item.id} rejected on final re-validation: {res.get('error')}"

            # 3. Scan Active Strategies for New Automated Setups
            active_strategies = db.query(Strategy).filter(Strategy.is_active == True).all()
            for strat in active_strategies:
                # Check if there is already an open position for this EXACT strategy
                # Or if max concurrent positions reached across all open
                open_for_strat = db.query(Position).filter(
                    Position.status == "open",
                    Position.symbol == strat.symbol
                ).count()
                if open_for_strat >= 2: # Allow up to 2 positions per symbol across different strategies/setups
                    continue

                # Check if there's already a pending order in grace for this symbol
                existing_pending = db.query(Order).filter(
                    Order.status == "proposal_grace",
                    Order.symbol == strat.symbol
                ).first()
                if existing_pending:
                    continue

                # Fetch candles & evaluate strategy
                candles = await delta_client.get_candles(strat.symbol, strat.timeframe, 60)
                if len(candles) < 20:
                    continue

                import json
                params = json.loads(strat.parameters_json or "{}")
                eval_res = StrategyEngine.evaluate_strategy(strat.strategy_type, candles, params)
                signal_side = eval_res.get("signal_side")

                if signal_side:
                    cls.signals_generated += 1
                    price = eval_res["price"]
                    sl = eval_res["stop_loss"]
                    tp = eval_res.get("take_profit")
                    # Dynamic risk-calibrated position sizing based on portfolio equity and stop distance
                    stop_dist = max(abs(price - sl), 0.1)
                    ledger_last = db.query(WalletLedger).order_by(WalletLedger.id.desc()).first()
                    total_tokens = ledger_last.running_balance if ledger_last else settings.STARTING_TOKEN_BALANCE
                    equity_usd = (total_tokens * settings.TOKEN_NOMINAL_INR) / 85.0
                    target_risk_usd = (equity_usd * ((cfg.max_risk_per_trade_pct or 0.5) / 100.0)) * 0.8
                    raw_qty = target_risk_usd / stop_dist

                    if "BTC" in strat.symbol:
                        qty = max(0.001, round(raw_qty, 3))
                    elif "ETH" in strat.symbol:
                        qty = max(0.01, round(raw_qty, 2))
                    else:
                        qty = max(0.1, round(raw_qty, 1))

                    # Validate 10-point mandatory risk suite
                    passed, reason_msg, risk_metrics = RiskManager.evaluate_order(
                        db=db,
                        symbol=strat.symbol,
                        side=signal_side,
                        price=price,
                        quantity=qty,
                        stop_loss=sl,
                        take_profit=tp
                    )

                    # Generate Multi-Level Explanations
                    exp = ExplanationService.generate_explanation(
                        strategy_type=strat.strategy_type,
                        side=signal_side,
                        price=price,
                        stop_loss=sl,
                        take_profit=tp,
                        indicators=eval_res.get("indicators", {}),
                        risk_metrics=risk_metrics
                    )

                    sig_log = SignalLog(
                        id=f"SIG-{uuid.uuid4().hex[:8].upper()}",
                        symbol=strat.symbol,
                        strategy_type=strat.strategy_type,
                        side=signal_side,
                        price=price,
                        plain_explanation=exp["plain_explanation"],
                        technical_explanation=exp["technical_explanation"],
                        risk_explanation=exp["risk_explanation"],
                        status="approved" if passed else "rejected",
                        indicators_json=json.dumps(eval_res.get("indicators", {}))
                    )
                    db.add(sig_log)
                    db.commit()

                    if passed:
                        # Queue into grace period proposal
                        created_ord = ExecutionEngine.create_proposal(
                            db=db,
                            symbol=strat.symbol,
                            side=signal_side,
                            price=price,
                            quantity=qty,
                            stop_loss=sl,
                            take_profit=tp,
                            strategy_id=strat.id,
                            signal_id=sig_log.id
                        )
                        cls.last_action_note = f"Proposed {signal_side.upper()} {strat.symbol} via {strat.name}. 10s grace window active."
                        logger.info(f"✨ Proposed order {created_ord.id} ({signal_side.upper()} {strat.symbol}) queued into grace period.")
                        break # One order proposal per tick to preserve risk spacing
                    else:
                        cls.last_action_note = f"Signal rejected by risk guard: {reason_msg}"

            db.commit()
        except Exception as err:
            db.rollback()
            logger.error(f"Error in engine tick processing: {err}")
        finally:
            db.close()

    @classmethod
    def get_status(cls, db: Session) -> Dict[str, Any]:
        cfg = db.query(UserConfig).first()
        active_strats = db.query(Strategy).filter(Strategy.is_active == True).count()
        open_pos_count = db.query(Position).filter(Position.status == "open").count()
        grace_orders_count = db.query(Order).filter(Order.status == "proposal_grace").count()

        return {
            "is_running": cls.is_running and (cfg.autonomous_engine_active if cfg else True),
            "emergency_stop_triggered": cfg.emergency_stop_triggered if cfg else False,
            "ticks_evaluated": cls.ticks_evaluated,
            "signals_generated": cls.signals_generated,
            "trades_executed": cls.trades_executed,
            "active_strategies_count": active_strats,
            "open_positions_count": open_pos_count,
            "pending_grace_orders_count": grace_orders_count,
            "last_scan_at": cls.last_scan_at,
            "last_action_note": cls.last_action_note
        }
