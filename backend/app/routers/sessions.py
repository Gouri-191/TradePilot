import uuid
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import TradingSession, Strategy, UserConfig, AuditLog
from app.schemas import TradingSessionCreate
from app.services.autonomous_engine import AutonomousTradingEngine

router = APIRouter(prefix="/api/sessions", tags=["Sessions"])

@router.get("")
def list_sessions(db: Session = Depends(get_db)):
    sessions = db.query(TradingSession).order_by(TradingSession.start_time.asc()).all()
    return [
        {
            "id": s.id,
            "name": s.name,
            "strategy_id": s.strategy_id,
            "profile": s.profile,
            "start_time": s.start_time.isoformat(),
            "end_time": s.end_time.isoformat(),
            "duration_minutes": s.duration_minutes,
            "timezone": s.timezone,
            "status": s.status,
            "max_risk_pct": s.max_risk_pct,
            "max_loss_tokens": s.max_loss_tokens,
            "trades_count": s.trades_count,
            "realized_pnl_tokens": s.realized_pnl_tokens,
            "is_recurring": s.is_recurring,
            "recurrence_pattern": s.recurrence_pattern,
            "created_at": s.created_at.isoformat()
        } for s in sessions
    ]

@router.post("")
def create_session(payload: TradingSessionCreate, db: Session = Depends(get_db)):
    session_id = f"SES-{uuid.uuid4().hex[:8].upper()}"
    now = datetime.utcnow()

    # If start_immediately is requested, set status to active and align timestamps from right now
    if payload.start_immediately:
        actual_start = now
        actual_end = now + timedelta(minutes=payload.duration_minutes)
        status = "active"
    else:
        actual_start = payload.start_time
        actual_end = payload.end_time
        status = "upcoming"

    new_sess = TradingSession(
        id=session_id,
        name=payload.name,
        strategy_id=payload.strategy_id,
        profile=payload.profile,
        start_time=actual_start,
        end_time=actual_end,
        duration_minutes=payload.duration_minutes,
        timezone=payload.timezone,
        status=status,
        max_risk_pct=payload.max_risk_pct,
        max_loss_tokens=payload.max_loss_tokens,
        is_recurring=payload.is_recurring,
        recurrence_pattern=payload.recurrence_pattern,
        created_at=now
    )
    db.add(new_sess)

    if payload.start_immediately:
        # Arm strategy & autonomous engine immediately
        strat = db.query(Strategy).filter(Strategy.id == payload.strategy_id).first()
        if strat:
            strat.is_active = True
        
        cfg = db.query(UserConfig).first()
        if cfg:
            cfg.autonomous_engine_active = True
        AutonomousTradingEngine.is_running = True

        db.add(AuditLog(
            action_type="session_started_now",
            entity_type="session",
            entity_id=session_id,
            severity="info",
            details=f"Session '{payload.name}' started IMMEDIATELY. Strategy '{strat.name if strat else payload.strategy_id}' is ACTIVE and scanning."
        ))
    else:
        db.add(AuditLog(
            action_type="session_scheduled",
            entity_type="session",
            entity_id=session_id,
            severity="info",
            details=f"Scheduled trading session '{payload.name}' from {actual_start} to {actual_end} ({payload.timezone})"
        ))

    db.commit()
    db.refresh(new_sess)

    return {"success": True, "session_id": session_id, "status": status}

@router.post("/{session_id}/start-now")
def start_session_now(session_id: str, db: Session = Depends(get_db)):
    sess = db.query(TradingSession).filter(TradingSession.id == session_id).first()
    if not sess:
        raise HTTPException(status_code=404, detail="Session not found")
    
    if sess.status == "completed":
        raise HTTPException(status_code=400, detail="Cannot restart an already completed session. Please schedule a new one.")

    now = datetime.utcnow()
    sess.status = "active"
    sess.start_time = now
    sess.end_time = now + timedelta(minutes=sess.duration_minutes)

    # Activate linked strategy
    strat = db.query(Strategy).filter(Strategy.id == sess.strategy_id).first()
    if strat:
        strat.is_active = True

    # Ensure engine is active
    cfg = db.query(UserConfig).first()
    if cfg:
        cfg.autonomous_engine_active = True
    AutonomousTradingEngine.is_running = True

    db.add(AuditLog(
        action_type="session_started_now",
        entity_type="session",
        entity_id=session_id,
        severity="info",
        details=f"User triggered START NOW on session '{sess.name}'. Strategy '{strat.name if strat else sess.strategy_id}' activated for {sess.duration_minutes}m."
    ))

    db.commit()
    return {
        "success": True,
        "session_id": session_id,
        "status": "active",
        "start_time": sess.start_time.isoformat(),
        "end_time": sess.end_time.isoformat()
    }

@router.post("/{session_id}/cancel")
def cancel_session(session_id: str, db: Session = Depends(get_db)):
    sess = db.query(TradingSession).filter(TradingSession.id == session_id).first()
    if not sess:
        raise HTTPException(status_code=404, detail="Session not found")
    sess.status = "cancelled"
    strat = db.query(Strategy).filter(Strategy.id == sess.strategy_id).first()
    if strat:
        strat.is_active = False
    db.commit()
    return {"success": True, "session_id": session_id, "status": "cancelled"}
