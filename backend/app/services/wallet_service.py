import uuid
from datetime import datetime
from sqlalchemy.orm import Session
from app.models import WalletLedger, Position, Strategy
from app.config import settings

class WalletService:
    """
    Simulated Token Wallet & Auditable Ledger.
    1 Token = ₹1,000 INR nominal demo valuation.
    All balances are strictly derived from immutable ledger transaction records.
    Unrealized P&L is NEVER credited as realized balance.
    """

    @classmethod
    def initialize_wallet_if_empty(cls, db: Session):
        existing = db.query(WalletLedger).first()
        if not existing:
            # Seed genesis deposit of 40 tokens = ₹40,000 nominal
            cls.record_transaction(
                db=db,
                tx_type="deposit",
                amount_tokens=settings.STARTING_TOKEN_BALANCE,
                description="Initial Simulated Testnet Credit Grant (40 Tokens = ₹40,000 nominal)",
                reference_id="GENESIS_GRANT"
            )

    @classmethod
    def get_summary(cls, db: Session) -> dict:
        cls.initialize_wallet_if_empty(db)
        
        last_tx = db.query(WalletLedger).order_by(WalletLedger.id.desc()).first()
        total_tokens = last_tx.running_balance if last_tx else settings.STARTING_TOKEN_BALANCE

        # Sum allocated tokens in open positions
        open_positions = db.query(Position).filter(Position.status == "open").all()
        allocated_tokens = sum(p.margin_allocated for p in open_positions)
        available_tokens = max(0.0, total_tokens - allocated_tokens)

        # Realized P&L from ledger
        realized_txs = db.query(WalletLedger).filter(WalletLedger.tx_type == "realized_pnl").all()
        realized_pnl = sum(tx.amount_tokens for tx in realized_txs)

        # Unrealized P&L from open positions
        unrealized_pnl = sum(p.unrealized_pnl for p in open_positions)

        # Today's realized P&L
        today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        daily_txs = db.query(WalletLedger).filter(
            WalletLedger.tx_type == "realized_pnl",
            WalletLedger.created_at >= today_start
        ).all()
        daily_pnl = sum(tx.amount_tokens for tx in daily_txs)

        nominal_value_inr = round(total_tokens * settings.TOKEN_NOMINAL_INR, 2)

        return {
            "total_tokens": round(total_tokens, 3),
            "available_tokens": round(available_tokens, 3),
            "allocated_tokens": round(allocated_tokens, 3),
            "nominal_inr_value": nominal_value_inr,
            "nominal_token_rate": settings.TOKEN_NOMINAL_INR,
            "realized_pnl_tokens": round(realized_pnl, 3),
            "unrealized_pnl_tokens": round(unrealized_pnl, 3),
            "daily_pnl_tokens": round(daily_pnl, 3),
            "disclaimer": "Simulated credit tokens for testing and algorithmic training only. Nominal rate ₹1,000/token. Tokens have no legal tender value, represent no claim on monetary funds, and cannot be redeemed for real currency."
        }

    @classmethod
    def record_transaction(
        cls,
        db: Session,
        tx_type: str,
        amount_tokens: float,
        description: str,
        reference_id: str = None
    ) -> WalletLedger:
        last_tx = db.query(WalletLedger).order_by(WalletLedger.id.desc()).first()
        prev_balance = last_tx.running_balance if last_tx else 0.0
        
        new_balance = round(prev_balance + amount_tokens, 3)
        nominal_inr = round(amount_tokens * settings.TOKEN_NOMINAL_INR, 2)
        tx_id = f"TX-{uuid.uuid4().hex[:10].upper()}"

        ledger_entry = WalletLedger(
            transaction_id=tx_id,
            tx_type=tx_type,
            amount_tokens=amount_tokens,
            nominal_inr=nominal_inr,
            running_balance=new_balance,
            description=description,
            reference_id=reference_id,
            created_at=datetime.utcnow()
        )
        db.add(ledger_entry)
        db.commit()
        db.refresh(ledger_entry)
        return ledger_entry
