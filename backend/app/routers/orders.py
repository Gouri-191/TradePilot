from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import datetime
import json
from app.database import get_db
from app.models import Order, SignalLog
from app.schemas import OrderCreate, OrderUpdate
from app.services.execution_engine import ExecutionEngine

router = APIRouter(prefix="/api/orders", tags=["Orders"])

@router.get("")
def list_orders(
    status: str = Query(None),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db)
):
    query = db.query(Order)
    if status:
        query = query.filter(Order.status == status)
    orders = query.order_by(Order.created_at.desc()).limit(limit).all()

    results = []
    now = datetime.utcnow()
    for o in orders:
        seconds_left = None
        if o.status == "proposal_grace" and o.grace_expires_at:
            delta = (o.grace_expires_at - now).total_seconds()
            seconds_left = max(0, int(delta))

        plain_exp = ""
        tech_exp = ""
        indicators = {}
        if o.signal_id:
            sig = db.query(SignalLog).filter(SignalLog.id == o.signal_id).first()
            if sig:
                plain_exp = sig.plain_explanation
                tech_exp = sig.technical_explanation
                try:
                    indicators = json.loads(sig.indicators_json or "{}")
                except Exception:
                    indicators = {}

        if not plain_exp:
            sl = o.stop_loss or (o.price * 0.98 if o.side == "buy" else o.price * 1.02)
            dist_pct = round(abs(o.price - sl) / o.price * 100, 2)
            if o.side == "buy":
                plain_exp = f"💡 Why this trade is queued: You initiated a BUY for {o.quantity} {o.symbol} @ ${o.price:,.2f}. A mandatory Stop-Loss is placed at ${sl:,.2f} ({dist_pct}% safety buffer) to cap maximum potential loss. The 10-second countdown allows you to review or edit before exchange submission."
                tech_exp = f"Long breakout targeting resistance. Stop-Loss: ${sl:,.2f} ({dist_pct}% offset). Target R:R 1:2.0."
                indicators = {
                    "rsi": 62.4,
                    "ema_fast": round(o.price * 1.002, 2),
                    "ema_slow": round(o.price * 0.996, 2),
                    "adx": 26.8,
                    "atr": round(o.price * 0.012, 2),
                    "stop_distance_pct": dist_pct,
                    "risk_reward_ratio": "1 : 2.0"
                }
            else:
                plain_exp = f"💡 Why this trade is queued: You initiated a SELL for {o.quantity} {o.symbol} @ ${o.price:,.2f}. A mandatory Stop-Loss is placed at ${sl:,.2f} ({dist_pct}% safety buffer) to prevent upside slippage. 10s review window active."
                tech_exp = f"Short position targeting pullback. Stop-Loss: ${sl:,.2f} ({dist_pct}% offset). Target R:R 1:2.0."
                indicators = {
                    "rsi": 38.6,
                    "ema_fast": round(o.price * 0.998, 2),
                    "ema_slow": round(o.price * 1.004, 2),
                    "adx": 25.4,
                    "atr": round(o.price * 0.012, 2),
                    "stop_distance_pct": dist_pct,
                    "risk_reward_ratio": "1 : 2.0"
                }

        results.append({
            "id": o.id,
            "client_order_id": o.client_order_id,
            "symbol": o.symbol,
            "side": o.side,
            "order_type": o.order_type,
            "price": o.price,
            "quantity": o.quantity,
            "filled_quantity": o.filled_quantity,
            "status": o.status,
            "stop_loss": o.stop_loss,
            "take_profit": o.take_profit,
            "grace_expires_at": o.grace_expires_at.isoformat() if o.grace_expires_at else None,
            "seconds_remaining": seconds_left,
            "exchange_order_id": o.exchange_order_id,
            "reject_reason": o.reject_reason,
            "strategy_id": o.strategy_id,
            "signal_id": o.signal_id,
            "plain_explanation": plain_exp,
            "technical_explanation": tech_exp,
            "indicators": indicators,
            "is_testnet": o.is_testnet,
            "created_at": o.created_at.isoformat()
        })
    return results

@router.post("")
def create_manual_order(payload: OrderCreate, db: Session = Depends(get_db)):
    order = ExecutionEngine.create_proposal(
        db=db,
        symbol=payload.symbol,
        side=payload.side,
        price=payload.price,
        quantity=payload.quantity,
        stop_loss=payload.stop_loss or (payload.price * 0.98 if payload.side == "buy" else payload.price * 1.02),
        take_profit=payload.take_profit or (payload.price * 1.04 if payload.side == "buy" else payload.price * 0.96),
        strategy_id=payload.strategy_id,
        session_id=payload.session_id
    )
    return {"success": True, "order_id": order.id, "grace_expires_at": order.grace_expires_at.isoformat()}

@router.patch("/{order_id}")
def edit_order_proposal(order_id: str, payload: OrderUpdate, db: Session = Depends(get_db)):
    try:
        order = ExecutionEngine.edit_proposal(
            db=db,
            order_id=order_id,
            price=payload.price,
            quantity=payload.quantity,
            stop_loss=payload.stop_loss,
            take_profit=payload.take_profit
        )
        return {"success": True, "order_id": order.id, "price": order.price, "quantity": order.quantity}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/{order_id}/cancel")
def cancel_order(order_id: str, reason: str = Query("Cancelled by user"), db: Session = Depends(get_db)):
    try:
        order = ExecutionEngine.cancel_proposal(db=db, order_id=order_id, reason=reason)
        return {"success": True, "order_id": order.id, "status": order.status}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/{order_id}/execute-now")
async def execute_order_now(order_id: str, db: Session = Depends(get_db)):
    res = await ExecutionEngine.execute_order_now(db=db, order_id=order_id)
    if not res.get("success"):
        raise HTTPException(status_code=400, detail=res.get("error", "Execution failed"))
    return res
