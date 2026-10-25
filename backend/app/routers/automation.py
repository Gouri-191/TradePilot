from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Strategy, UserConfig, AuditLog
from app.schemas import EmergencyStopRequest
from app.services.execution_engine import ExecutionEngine
from app.services.autonomous_engine import AutonomousTradingEngine

router = APIRouter(prefix="/api/automation", tags=["Automation"])

@router.get("/status")
def get_automation_status(db: Session = Depends(get_db)):
    engine_status = AutonomousTradingEngine.get_status(db)
    user_config = db.query(UserConfig).first()
    active_strategies = db.query(Strategy).filter(Strategy.is_active == True).all()
    
    status = "stopped"
    if user_config and user_config.emergency_stop_triggered:
        status = "emergency_stopped"
    elif engine_status["is_running"] and len(active_strategies) > 0:
        status = "running"
    elif not engine_status["is_running"]:
        status = "paused"

    return {
        "status": status,
        "is_engine_active": engine_status["is_running"],
        "emergency_stop_triggered": user_config.emergency_stop_triggered if user_config else False,
        "ticks_evaluated": engine_status["ticks_evaluated"],
        "signals_generated": engine_status["signals_generated"],
        "trades_executed": engine_status["trades_executed"],
        "open_positions_count": engine_status["open_positions_count"],
        "pending_grace_orders_count": engine_status["pending_grace_orders_count"],
        "last_scan_at": engine_status["last_scan_at"],
        "last_action_note": engine_status["last_action_note"],
        "active_strategies_count": len(active_strategies),
        "active_strategies": [{"id": s.id, "name": s.name, "symbol": s.symbol} for s in active_strategies]
    }

@router.post("/start")
@router.post("/resume")
def start_automation(db: Session = Depends(get_db)):
    """Starts or resumes the continuous autonomous trading engine."""
    user_config = db.query(UserConfig).first()
    if user_config and user_config.emergency_stop_triggered:
        raise HTTPException(status_code=400, detail="Cannot start while Emergency Stop is active. Reset Emergency Stop first.")
    
    if user_config:
        user_config.autonomous_engine_active = True
    AutonomousTradingEngine.is_running = True
    
    # Ensure at least first strategy is active if none active
    active = db.query(Strategy).filter(Strategy.is_active == True).count()
    if active == 0:
        first_s = db.query(Strategy).first()
        if first_s:
            first_s.is_active = True

    db.add(AuditLog(
        action_type="automation_started",
        entity_type="autonomous_engine",
        entity_id="ALL",
        severity="info",
        details="Autonomous continuous trading engine activated by user."
    ))
    db.commit()
    return {"success": True, "status": "running", "engine_active": True}

@router.post("/pause")
def pause_automation(db: Session = Depends(get_db)):
    """Pauses autonomous scanning without closing open positions."""
    user_config = db.query(UserConfig).first()
    if user_config:
        user_config.autonomous_engine_active = False
    AutonomousTradingEngine.is_running = False

    db.add(AuditLog(
        action_type="automation_paused",
        entity_type="autonomous_engine",
        entity_id="ALL",
        severity="info",
        details="User paused autonomous trading engine. Existing open positions remain protected by stops; new entries halted."
    ))
    db.commit()
    return {"success": True, "status": "paused", "engine_active": False, "notice": "Autonomous engine paused safely. Open positions remain protected."}

@router.post("/emergency-stop")
async def trigger_emergency_stop_endpoint(req: EmergencyStopRequest, db: Session = Depends(get_db)):
    AutonomousTradingEngine.is_running = False
    res = await ExecutionEngine.trigger_emergency_stop(
        db=db,
        policy=req.close_positions_policy,
        reason=req.reason
    )
    return res

@router.post("/emergency-stop/reset")
def reset_emergency_stop_endpoint(db: Session = Depends(get_db)):
    return ExecutionEngine.reset_emergency_stop(db)
