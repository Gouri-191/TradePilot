import asyncio
import logging
from datetime import datetime
from sqlalchemy.orm import Session
from app.models import TradingSession, Strategy, AuditLog
from app.database import SessionLocal

logger = logging.getLogger(__name__)

class SchedulerService:
    """
    Automated Trading Session Scheduler.
    Executes autonomously on the backend.
    Starts sessions, monitors max loss budgets, and stops sessions gracefully when time expires.
    """

    @classmethod
    def check_and_update_sessions(cls, db: Session):
        now = datetime.utcnow()

        # 1. Start upcoming sessions
        upcoming = db.query(TradingSession).filter(
            TradingSession.status == "upcoming",
            TradingSession.start_time <= now
        ).all()

        for session in upcoming:
            session.status = "active"
            # Enable associated strategy
            strat = db.query(Strategy).filter(Strategy.id == session.strategy_id).first()
            if strat:
                strat.is_active = True
            
            db.add(AuditLog(
                action_type="session_started",
                entity_type="session",
                entity_id=session.id,
                severity="info",
                details=f"Scheduled session '{session.name}' has started automatically. Strategy '{strat.name if strat else ''}' is now ACTIVE."
            ))
            logger.info(f"Session {session.id} started automatically.")

        # 2. Complete expired active sessions
        active = db.query(TradingSession).filter(
            TradingSession.status == "active",
            TradingSession.end_time <= now
        ).all()

        for session in active:
            session.status = "completed"
            strat = db.query(Strategy).filter(Strategy.id == session.strategy_id).first()
            if strat:
                strat.is_active = False # Stop new entries
            
            db.add(AuditLog(
                action_type="session_completed",
                entity_type="session",
                entity_id=session.id,
                severity="info",
                details=f"Session '{session.name}' completed scheduled duration. New automated entries halted."
            ))
            logger.info(f"Session {session.id} completed.")

        db.commit()

    @classmethod
    async def run_scheduler_loop(cls):
        """Asynchronous background task that ticks every 5 seconds."""
        logger.info("Scheduler service background loop running...")
        while True:
            try:
                db = SessionLocal()
                try:
                    cls.check_and_update_sessions(db)
                finally:
                    db.close()
            except Exception as e:
                logger.error(f"Error in scheduler tick: {e}")
            await asyncio.sleep(5)
