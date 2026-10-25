import logging
from datetime import datetime
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from app.models import Achievement, UserConfig, Order, Position, Strategy, AuditLog

logger = logging.getLogger(__name__)

INITIAL_BADGES = [
    {
        "id": "badge-1",
        "badge_key": "first_steps",
        "title": "First Steps",
        "description": "Complete the interactive TradePilot onboarding walkthrough.",
        "category": "learning",
        "icon": "Compass",
        "criteria": "Complete onboarding sequence and experience selection."
    },
    {
        "id": "badge-2",
        "badge_key": "market_explorer",
        "title": "Market Explorer",
        "description": "Learn the core cryptocurrency trading concepts and glossary definitions.",
        "category": "learning",
        "icon": "BookOpen",
        "criteria": "Review 5 core terms in the trading glossary drawer."
    },
    {
        "id": "badge-3",
        "badge_key": "strategy_student",
        "title": "Strategy Student",
        "description": "Configure an automated strategy profile (EMA Crossover or Donchian Breakout).",
        "category": "strategy",
        "icon": "Sliders",
        "criteria": "Customize parameters or select a trading profile."
    },
    {
        "id": "badge-4",
        "badge_key": "backtest_analyst",
        "title": "Backtest Analyst",
        "description": "Run a historical backtest to evaluate strategy performance and drawdown.",
        "category": "strategy",
        "icon": "BarChart2",
        "criteria": "Execute an interactive backtest run on historical candles."
    },
    {
        "id": "badge-5",
        "badge_key": "risk_aware",
        "title": "Risk Aware",
        "description": "Complete the risk management module and configure mandatory stop-loss safeguards.",
        "category": "risk",
        "icon": "ShieldCheck",
        "criteria": "Review 10-point mandatory risk check architecture."
    },
    {
        "id": "badge-6",
        "badge_key": "testnet_trader",
        "title": "Testnet Trader",
        "description": "Execute your first simulated or Delta Testnet crypto order.",
        "category": "execution",
        "icon": "Zap",
        "criteria": "Have an order successfully filled on testnet."
    },
    {
        "id": "badge-7",
        "badge_key": "consistency_builder",
        "title": "Consistency Builder",
        "description": "Schedule and complete automated trading sessions without human intervention.",
        "category": "execution",
        "icon": "Calendar",
        "criteria": "Complete at least 1 automated trading session."
    },
    {
        "id": "badge-8",
        "badge_key": "disciplined_risk",
        "title": "Disciplined Risk Guard",
        "description": "Maintain 100% stop-loss discipline across all trading operations.",
        "category": "risk",
        "icon": "Award",
        "criteria": "Place 3 consecutive trades with enforced stop-loss orders."
    }
]

class AchievementService:
    """Manages responsible learning badges and user tier progression."""

    @classmethod
    def seed_achievements(cls, db: Session):
        for badge_data in INITIAL_BADGES:
            existing = db.query(Achievement).filter(Achievement.badge_key == badge_data["badge_key"]).first()
            if not existing:
                ach = Achievement(
                    id=badge_data["id"],
                    badge_key=badge_data["badge_key"],
                    title=badge_data["title"],
                    description=badge_data["description"],
                    category=badge_data["category"],
                    icon=badge_data["icon"],
                    criteria=badge_data["criteria"],
                    is_unlocked=False,
                    progress_pct=0
                )
                db.add(ach)
        db.commit()

    @classmethod
    def unlock(cls, db: Session, badge_key: str) -> bool:
        ach = db.query(Achievement).filter(Achievement.badge_key == badge_key).first()
        if ach and not ach.is_unlocked:
            ach.is_unlocked = True
            ach.unlocked_at = datetime.utcnow()
            ach.progress_pct = 100
            db.commit()

            db.add(AuditLog(
                action_type="badge_unlocked",
                entity_type="achievement",
                entity_id=badge_key,
                severity="info",
                details=f"Achievement unlocked: '{ach.title}' - {ach.description}"
            ))
            db.commit()
            return True
        return False

    @classmethod
    def check_progression_eligibility(cls, db: Session) -> Dict[str, Any]:
        """
        Calculates qualification for Medium and Pro tiers.
        Important progression rule: Never auto-promote merely due to elapsed time.
        Requires demonstrated knowledge and explicit user consent.
        """
        user_config = db.query(UserConfig).first()
        current_tier = user_config.experience_level if user_config else "beginner"

        unlocked_count = db.query(Achievement).filter(Achievement.is_unlocked == True).count()
        trades_count = db.query(Order).filter(Order.status == "filled").count()

        # Medium qualification: Onboarding done + at least 3 badges + at least 1 trade
        medium_eligible = (unlocked_count >= 3 and trades_count >= 1)
        # Pro qualification: At least 5 badges + at least 3 trades
        pro_eligible = (unlocked_count >= 5 and trades_count >= 3)

        return {
            "current_tier": current_tier,
            "unlocked_badges_count": unlocked_count,
            "total_badges_count": len(INITIAL_BADGES),
            "trades_count": trades_count,
            "medium_eligible": medium_eligible,
            "pro_eligible": pro_eligible,
            "rule_notice": "TradePilot never auto-promotes without explicit user consent. You control your interface tier."
        }
