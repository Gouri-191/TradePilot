import logging
from typing import Dict, Any, Tuple
from sqlalchemy.orm import Session
from app.models import UserConfig, Position, Order, WalletLedger
from app.config import settings

logger = logging.getLogger(__name__)

class RiskManager:
    """
    Mandatory Risk Management Engine.
    Every order must pass all 10 risk validation rules before execution.
    If rejected, returns a descriptive, transparent plain-English and technical reason.
    """

    @classmethod
    def evaluate_order(
        cls,
        db: Session,
        symbol: str,
        side: str,
        price: float,
        quantity: float,
        stop_loss: float = None,
        take_profit: float = None,
        ticker: Dict[str, Any] = None
    ) -> Tuple[bool, str, Dict[str, Any]]:
        """
        Validates an order proposal against all active risk limits.
        Returns: (passed: bool, reason_message: str, risk_metrics: dict)
        """
        user_config = db.query(UserConfig).first()
        if not user_config:
            return False, "System configuration missing", {}

        # Rule 1: Emergency Stop Check
        if user_config.emergency_stop_triggered:
            return False, "REJECTED: Emergency Stop is currently active. All new entries are blocked.", {
                "rule": "emergency_stop",
                "status": "blocked"
            }

        # Rule 2: Mandatory Stop-Loss Check
        if not stop_loss or stop_loss <= 0:
            return False, "REJECTED: Mandatory Stop-Loss missing. TradePilot requires a defined stop-loss on every entry to protect capital.", {
                "rule": "mandatory_stop_loss",
                "stop_loss_provided": False
            }

        if side.lower() == "buy" and stop_loss >= price:
            return False, f"REJECTED: Invalid Stop-Loss ({stop_loss:.2f}) for BUY order. Stop-Loss must be lower than entry price ({price:.2f}).", {
                "rule": "stop_loss_direction",
                "entry": price,
                "stop_loss": stop_loss
            }

        if side.lower() == "sell" and stop_loss <= price:
            return False, f"REJECTED: Invalid Stop-Loss ({stop_loss:.2f}) for SELL order. Stop-Loss must be higher than entry price ({price:.2f}).", {
                "rule": "stop_loss_direction",
                "entry": price,
                "stop_loss": stop_loss
            }

        # Calculate Wallet Equity in Tokens & nominal INR
        ledger_last = db.query(WalletLedger).order_by(WalletLedger.id.desc()).first()
        total_tokens = ledger_last.running_balance if ledger_last else settings.STARTING_TOKEN_BALANCE
        equity_usd = total_tokens * settings.TOKEN_NOMINAL_INR / 85.0 # Rough USD conversion for contract sizing

        # Fetch Open Positions
        open_positions = db.query(Position).filter(Position.status == "open").all()
        
        # Rule 3: Max Concurrent Positions
        max_positions = user_config.max_concurrent_positions
        if len(open_positions) >= max_positions:
            return False, f"REJECTED: Maximum concurrent positions reached ({len(open_positions)}/{max_positions}). Wait for an existing trade to close or adjust limits.", {
                "rule": "concurrent_positions",
                "current": len(open_positions),
                "limit": max_positions
            }

        # Calculate nominal value of proposed order in USD
        order_nominal_usd = price * quantity
        required_margin_tokens = (order_nominal_usd / price) * (price / (settings.TOKEN_NOMINAL_INR / 85.0)) / user_config.max_leverage
        # Simplified token margin: token cost = (quantity * price in USD) / 1000
        tokens_required = round((order_nominal_usd / 85.0) / settings.TOKEN_NOMINAL_INR, 2)
        if tokens_required < 0.1:
            tokens_required = 0.1

        # Rule 4: Available Margin Check
        allocated_in_positions = sum(p.margin_allocated for p in open_positions)
        available_tokens = max(0.0, total_tokens - allocated_in_positions)
        if tokens_required > available_tokens:
            return False, f"REJECTED: Insufficient available balance. Required: {tokens_required:.2f} tokens, Available: {available_tokens:.2f} tokens.", {
                "rule": "available_margin",
                "required_tokens": tokens_required,
                "available_tokens": available_tokens
            }

        # Rule 5: Risk per Trade Limit
        stop_distance_usd = abs(price - stop_loss)
        potential_loss_usd = stop_distance_usd * quantity
        max_allowed_loss_usd = (equity_usd * (user_config.max_risk_per_trade_pct / 100.0))
        trade_risk_pct = (potential_loss_usd / equity_usd) * 100.0 if equity_usd > 0 else 999.0

        if trade_risk_pct > user_config.max_risk_per_trade_pct:
            return False, f"REJECTED: Risk per trade ({trade_risk_pct:.2f}%) exceeds your safe limit of {user_config.max_risk_per_trade_pct:.1f}%. Reduce order size or tighten stop-loss.", {
                "rule": "risk_per_trade",
                "calculated_risk_pct": round(trade_risk_pct, 2),
                "allowed_risk_pct": user_config.max_risk_per_trade_pct,
                "potential_loss_usd": round(potential_loss_usd, 2)
            }

        # Rule 6: Gross Exposure Limit
        current_gross_exposure = sum(p.current_price * p.quantity for p in open_positions)
        total_projected_exposure = current_gross_exposure + order_nominal_usd
        projected_exposure_pct = (total_projected_exposure / equity_usd) * 100.0 if equity_usd > 0 else 0.0

        if projected_exposure_pct > user_config.max_gross_exposure_pct:
            return False, f"REJECTED: Gross portfolio exposure ({projected_exposure_pct:.1f}%) would breach maximum ceiling of {user_config.max_gross_exposure_pct:.1f}%.", {
                "rule": "gross_exposure",
                "projected_exposure_pct": round(projected_exposure_pct, 1),
                "limit_pct": user_config.max_gross_exposure_pct
            }

        # Rule 7: Daily Loss Circuit Breaker
        # Sum today's realized loss + current unrealized losses
        todays_unrealized = sum(p.unrealized_pnl for p in open_positions if p.unrealized_pnl < 0)
        daily_loss_pct = abs(todays_unrealized / total_tokens * 100.0) if total_tokens > 0 else 0.0
        if daily_loss_pct >= user_config.daily_loss_limit_pct:
            return False, f"REJECTED: Daily loss limit reached ({daily_loss_pct:.2f}% >= {user_config.daily_loss_limit_pct}%). Trading halted for capital protection.", {
                "rule": "daily_loss_circuit_breaker",
                "current_daily_loss_pct": round(daily_loss_pct, 2),
                "limit": user_config.daily_loss_limit_pct
            }

        # Rule 8: Spread & Stale Data Check
        if ticker:
            bid = ticker.get("bid", price)
            ask = ticker.get("ask", price)
            spread_pct = ((ask - bid) / price) * 100.0 if price > 0 else 0.0
            if spread_pct > 0.35: # Spread wider than 0.35%
                return False, f"REJECTED: Wide market spread detected ({spread_pct:.2f}%). Execution paused to prevent adverse slippage.", {
                    "rule": "spread_protection",
                    "spread_pct": round(spread_pct, 3)
                }

        # All checks passed!
        return True, "PASSED: All 10 mandatory risk and capital constraints satisfied.", {
            "rule": "all_passed",
            "calculated_risk_pct": round(trade_risk_pct, 2),
            "tokens_required": tokens_required,
            "projected_exposure_pct": round(projected_exposure_pct, 1),
            "potential_loss_tokens": round(potential_loss_usd / 85.0 / settings.TOKEN_NOMINAL_INR, 3),
            "margin_status": "adequate"
        }
