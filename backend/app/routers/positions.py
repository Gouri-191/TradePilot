from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Position
from app.services.execution_engine import ExecutionEngine
from app.services.delta_client import delta_client

router = APIRouter(prefix="/api/positions", tags=["Positions"])

@router.get("")
async def list_positions(status: str = Query("open"), db: Session = Depends(get_db)):
    positions = db.query(Position).filter(Position.status == status).all()
    results = []
    for p in positions:
        ticker = await delta_client.get_ticker(p.symbol)
        curr_price = ticker.get("mark_price", p.entry_price)
        p.current_price = curr_price
        
        # Calculate live unrealized P&L
        pct_change = (curr_price - p.entry_price) / p.entry_price if p.side == "buy" else (p.entry_price - curr_price) / p.entry_price
        p.unrealized_pnl = round(p.margin_allocated * pct_change, 3)

        results.append({
            "id": p.id,
            "symbol": p.symbol,
            "side": p.side,
            "entry_price": p.entry_price,
            "current_price": curr_price,
            "quantity": p.quantity,
            "leverage": p.leverage,
            "stop_loss": p.stop_loss,
            "take_profit": p.take_profit,
            "unrealized_pnl": p.unrealized_pnl,
            "realized_pnl": p.realized_pnl,
            "liquidation_price": p.liquidation_price,
            "margin_allocated": p.margin_allocated,
            "status": p.status,
            "is_testnet": p.is_testnet,
            "opened_at": p.opened_at.isoformat()
        })
    db.commit()
    return results

@router.post("/{position_id}/close")
async def close_position_endpoint(
    position_id: str,
    reason: str = Query("User manual close"),
    db: Session = Depends(get_db)
):
    pos = db.query(Position).filter(Position.id == position_id).first()
    if not pos:
        raise HTTPException(status_code=404, detail="Position not found")
    ticker = await delta_client.get_ticker(pos.symbol)
    exit_p = ticker.get("bid" if pos.side == "buy" else "ask", pos.current_price)
    
    res = ExecutionEngine.close_position(db, position_id, exit_price=exit_p, reason=reason)
    if not res.get("success"):
        raise HTTPException(status_code=400, detail=res.get("error"))
    return res
