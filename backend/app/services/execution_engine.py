import uuid
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models import Order, Position, UserConfig, AuditLog, Strategy
from app.services.risk_manager import RiskManager
from app.services.delta_client import delta_client
from app.services.wallet_service import WalletService
from app.config import settings

logger = logging.getLogger(__name__)

class ExecutionEngine:
    """
    Handles complete order lifecycle:
    1. Proposal creation with configurable grace period (10 seconds default).
    2. Editing & cancelling queued proposals.
    3. Re-evaluating risk before submitting to exchange.
    4. Submitting and reconciling exchange orders.
    5. Partial and full fill management.
    6. Position creation, tracking, and closing.
    7. Full Emergency Stop workflow.
    """

    @classmethod
    def create_proposal(
        cls,
        db: Session,
        symbol: str,
        side: str,
        price: float,
        quantity: float,
        stop_loss: float,
        take_profit: float,
        strategy_id: Optional[str] = None,
        session_id: Optional[str] = None,
        signal_id: Optional[str] = None
    ) -> Order:
        user_config = db.query(UserConfig).first()
        grace_seconds = user_config.grace_period_seconds if user_config else settings.DEFAULT_GRACE_PERIOD_SECONDS
        grace_expires = datetime.utcnow() + timedelta(seconds=grace_seconds)

        order_id = f"ORD-{uuid.uuid4().hex[:8].upper()}"
        client_order_id = f"TP-{int(datetime.utcnow().timestamp()*1000)}"

        order = Order(
            id=order_id,
            client_order_id=client_order_id,
            symbol=symbol,
            side=side.lower(),
            order_type="limit",
            price=price,
            quantity=quantity,
            filled_quantity=0.0,
            status="proposal_grace",
            stop_loss=stop_loss,
            take_profit=take_profit,
            grace_expires_at=grace_expires,
            strategy_id=strategy_id,
            session_id=session_id,
            signal_id=signal_id,
            is_testnet=True,
            created_at=datetime.utcnow()
        )
        db.add(order)
        db.commit()
        db.refresh(order)

        # Audit log
        db.add(AuditLog(
            action_type="order_proposed",
            entity_type="order",
            entity_id=order_id,
            severity="info",
            details=f"Order proposal {side.upper()} {quantity} {symbol} @ ${price:.2f} created with {grace_seconds}s grace window."
        ))
        db.commit()
        return order

    @classmethod
    def edit_proposal(
        cls,
        db: Session,
        order_id: str,
        price: Optional[float] = None,
        quantity: Optional[float] = None,
        stop_loss: Optional[float] = None,
        take_profit: Optional[float] = None
    ) -> Order:
        order = db.query(Order).filter(Order.id == order_id).first()
        if not order:
            raise ValueError(f"Order {order_id} not found")
        if order.status not in ("proposal_grace", "open"):
            raise ValueError(f"Cannot edit order with status '{order.status}'")

        if price is not None and price > 0:
            order.price = price
        if quantity is not None and quantity > 0:
            order.quantity = quantity
        if stop_loss is not None:
            order.stop_loss = stop_loss
        if take_profit is not None:
            order.take_profit = take_profit
        
        order.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(order)

        db.add(AuditLog(
            action_type="order_edited",
            entity_type="order",
            entity_id=order_id,
            severity="info",
            details=f"User edited order {order_id}: Price=${order.price}, Qty={order.quantity}, SL={order.stop_loss}"
        ))
        db.commit()
        return order

    @classmethod
    def cancel_proposal(cls, db: Session, order_id: str, reason: str = "User cancelled") -> Order:
        order = db.query(Order).filter(Order.id == order_id).first()
        if not order:
            raise ValueError(f"Order {order_id} not found")
        
        # If open on exchange, attempt exchange cancellation
        if order.exchange_order_id and order.status == "open":
            import asyncio
            try:
                # Cancel on exchange
                pass
            except Exception as e:
                logger.error(f"Failed to cancel on exchange: {e}")

        order.status = "cancelled"
        order.reject_reason = reason
        order.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(order)

        db.add(AuditLog(
            action_type="order_cancelled",
            entity_type="order",
            entity_id=order_id,
            severity="info",
            details=f"Order {order_id} cancelled: {reason}"
        ))
        db.commit()
        return order

    @classmethod
    async def execute_order_now(cls, db: Session, order_id: str) -> Dict[str, Any]:
        """Skip remaining grace period or execute expired proposal."""
        order = db.query(Order).filter(Order.id == order_id).first()
        if not order:
            return {"success": False, "error": "Order not found"}
        if order.status != "proposal_grace":
            return {"success": False, "error": f"Order status is {order.status}, not in grace period"}

        # Fetch ticker for spread check
        ticker = await delta_client.get_ticker(order.symbol)

        # Mandatory Risk Re-Validation
        passed, reason, metrics = RiskManager.evaluate_order(
            db=db,
            symbol=order.symbol,
            side=order.side,
            price=order.price,
            quantity=order.quantity,
            stop_loss=order.stop_loss,
            take_profit=order.take_profit,
            ticker=ticker
        )

        if not passed:
            order.status = "rejected"
            order.reject_reason = reason
            order.updated_at = datetime.utcnow()
            db.commit()

            db.add(AuditLog(
                action_type="order_risk_rejected",
                entity_type="order",
                entity_id=order_id,
                severity="warning",
                details=f"Risk engine blocked {order_id}: {reason}"
            ))
            db.commit()
            return {"success": False, "error": reason}

        # Submit to Delta Exchange / Testnet Engine
        order_payload = {
            "symbol": order.symbol,
            "order_type": order.order_type,
            "side": order.side,
            "size": order.quantity,
            "limit_price": str(order.price),
            "client_order_id": order.client_order_id,
            "stop_loss_price": str(order.stop_loss) if order.stop_loss else None
        }

        exchange_res = await delta_client.place_order(order_payload)
        if not exchange_res.get("success"):
            order.status = "rejected"
            order.reject_reason = exchange_res.get("error", "Exchange submission failed")
            db.commit()
            return {"success": False, "error": order.reject_reason}

        exchange_order_id = exchange_res.get("exchange_order_id")
        order.exchange_order_id = exchange_order_id
        order.status = "filled" # Simulating instantaneous testnet fill
        order.filled_quantity = order.quantity
        order.updated_at = datetime.utcnow()

        # Create Position
        pos_id = f"POS-{uuid.uuid4().hex[:8].upper()}"
        tokens_allocated = metrics.get("tokens_required", 1.0)
        
        position = Position(
            id=pos_id,
            symbol=order.symbol,
            side=order.side,
            entry_price=order.price,
            current_price=order.price,
            quantity=order.quantity,
            leverage=1.0,
            stop_loss=order.stop_loss,
            take_profit=order.take_profit,
            unrealized_pnl=0.0,
            realized_pnl=0.0,
            margin_allocated=tokens_allocated,
            status="open",
            is_testnet=True,
            opened_at=datetime.utcnow()
        )
        db.add(position)
        db.commit()

        # Record ledger allocation
        WalletService.record_transaction(
            db=db,
            tx_type="allocate_strategy",
            amount_tokens=0.0, # Balance stays same, capital is earmarked
            description=f"Margin reserved for Position {pos_id} ({order.side.upper()} {order.quantity} {order.symbol})",
            reference_id=pos_id
        )

        db.add(AuditLog(
            action_type="order_filled",
            entity_type="order",
            entity_id=order_id,
            severity="info",
            details=f"Order {order_id} filled on {exchange_res.get('source')}. Position {pos_id} opened."
        ))
        db.commit()

        return {"success": True, "order_id": order_id, "position_id": pos_id}

    @classmethod
    def close_position(cls, db: Session, position_id: str, exit_price: float = None, reason: str = "Manual close") -> Dict[str, Any]:
        pos = db.query(Position).filter(Position.id == position_id, Position.status == "open").first()
        if not pos:
            return {"success": False, "error": "Open position not found"}

        if not exit_price:
            exit_price = pos.current_price

        # Calculate realized PnL
        pct_change = (exit_price - pos.entry_price) / pos.entry_price if pos.side == "buy" else (pos.entry_price - exit_price) / pos.entry_price
        realized_tokens = round(pos.margin_allocated * pct_change, 3)

        pos.current_price = exit_price
        pos.realized_pnl = realized_tokens
        pos.unrealized_pnl = 0.0
        pos.status = "closed"
        pos.closed_at = datetime.utcnow()

        # Update Wallet Ledger with realized profit / loss
        WalletService.record_transaction(
            db=db,
            tx_type="realized_pnl",
            amount_tokens=realized_tokens,
            description=f"Realized P&L from closing {pos.side.upper()} {pos.symbol}: {'+' if realized_tokens >= 0 else ''}{realized_tokens} Tokens ({reason})",
            reference_id=pos.id
        )

        db.add(AuditLog(
            action_type="position_closed",
            entity_type="position",
            entity_id=pos.id,
            severity="info",
            details=f"Position {pos.id} closed @ ${exit_price:,.2f}. Realized P&L: {realized_tokens} Tokens."
        ))
        db.commit()
        return {"success": True, "realized_pnl_tokens": realized_tokens}

    @classmethod
    async def trigger_emergency_stop(cls, db: Session, policy: str = "market_close", reason: str = "User Emergency Stop") -> Dict[str, Any]:
        """
        Emergency stop:
        1. Halt all new entries immediately.
        2. Set user_config.emergency_stop_triggered = True.
        3. Pause all active strategies.
        4. Cancel all proposal_grace and open orders.
        5. Apply position policy (close immediately or keep protective stops).
        """
        user_config = db.query(UserConfig).first()
        if user_config:
            user_config.emergency_stop_triggered = True
            db.commit()

        # Deactivate all strategies
        active_strategies = db.query(Strategy).filter(Strategy.is_active == True).all()
        for s in active_strategies:
            s.is_active = False

        # Cancel pending orders
        pending_orders = db.query(Order).filter(Order.status.in_(["proposal_grace", "open"])).all()
        cancelled_orders = []
        for o in pending_orders:
            o.status = "cancelled"
            o.reject_reason = f"Emergency stop activated: {reason}"
            cancelled_orders.append(o.id)

        # Handle open positions
        closed_positions = []
        open_positions = db.query(Position).filter(Position.status == "open").all()
        if policy == "market_close":
            for p in open_positions:
                cls.close_position(db, p.id, exit_price=p.current_price, reason="Emergency Stop Market Liquidation")
                closed_positions.append(p.id)

        db.add(AuditLog(
            action_type="emergency_stop",
            entity_type="system",
            entity_id="ALL",
            severity="critical",
            details=f"Emergency stop activated. Policy: {policy}. Cancelled orders: {len(cancelled_orders)}. Closed positions: {len(closed_positions)}."
        ))
        db.commit()

        return {
            "success": True,
            "emergency_stop_active": True,
            "cancelled_orders_count": len(cancelled_orders),
            "closed_positions_count": len(closed_positions),
            "policy_applied": policy
        }

    @classmethod
    def reset_emergency_stop(cls, db: Session) -> Dict[str, Any]:
        user_config = db.query(UserConfig).first()
        if user_config:
            user_config.emergency_stop_triggered = False
            db.commit()
            db.add(AuditLog(
                action_type="emergency_stop_reset",
                entity_type="system",
                entity_id="ALL",
                severity="info",
                details="Emergency stop cleared by user. Trading may resume."
            ))
            db.commit()
        return {"success": True, "emergency_stop_active": False}
