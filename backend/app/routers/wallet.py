from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import WalletLedger
from app.schemas import DepositSimulatedRequest, WithdrawSimulatedRequest
from app.services.wallet_service import WalletService

router = APIRouter(prefix="/api/wallet", tags=["Wallet"])

@router.get("")
def get_wallet_summary(db: Session = Depends(get_db)):
    return WalletService.get_summary(db)

@router.get("/ledger")
def get_wallet_ledger(limit: int = 50, db: Session = Depends(get_db)):
    WalletService.initialize_wallet_if_empty(db)
    txs = db.query(WalletLedger).order_by(WalletLedger.id.desc()).limit(limit).all()
    return [
        {
            "id": tx.id,
            "transaction_id": tx.transaction_id,
            "tx_type": tx.tx_type,
            "amount_tokens": tx.amount_tokens,
            "nominal_inr": tx.nominal_inr,
            "running_balance": tx.running_balance,
            "description": tx.description,
            "reference_id": tx.reference_id,
            "created_at": tx.created_at.isoformat()
        } for tx in txs
    ]

@router.post("/deposit-simulated")
def deposit_simulated_tokens(req: DepositSimulatedRequest, db: Session = Depends(get_db)):
    tx = WalletService.record_transaction(
        db=db,
        tx_type="deposit",
        amount_tokens=req.amount_tokens,
        description=f"User Testnet Credit Top-Up (+{req.amount_tokens} Tokens)",
        reference_id="USER_TOPUP"
    )
    return {"success": True, "transaction_id": tx.transaction_id, "new_balance": tx.running_balance}

@router.post("/withdraw-simulated")
def withdraw_simulated_tokens(req: WithdrawSimulatedRequest, db: Session = Depends(get_db)):
    summary = WalletService.get_summary(db)
    if req.amount_tokens > summary["available_tokens"]:
        raise HTTPException(status_code=400, detail=f"Insufficient available balance ({summary['available_tokens']} tokens available)")

    tx = WalletService.record_transaction(
        db=db,
        tx_type="simulated_withdrawal",
        amount_tokens=-req.amount_tokens,
        description=f"Simulated Sandbox Withdrawal (-{req.amount_tokens} Tokens)",
        reference_id="SIM_WITHDRAWAL"
    )
    return {
        "success": True,
        "transaction_id": tx.transaction_id,
        "new_balance": tx.running_balance,
        "legal_notice": "DEMO SIMULATION: No real fiat (INR) or crypto funds are moved. TradePilot operates on a simulated token ledger for algorithmic validation."
    }
