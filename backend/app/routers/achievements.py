from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Achievement, UserConfig
from app.services.achievement_service import AchievementService

router = APIRouter(prefix="/api/achievements", tags=["Achievements"])

@router.get("")
def list_achievements(db: Session = Depends(get_db)):
    AchievementService.seed_achievements(db)
    badges = db.query(Achievement).all()
    progression = AchievementService.check_progression_eligibility(db)

    return {
        "progression": progression,
        "badges": [
            {
                "id": b.id,
                "badge_key": b.badge_key,
                "title": b.title,
                "description": b.description,
                "category": b.category,
                "icon": b.icon,
                "criteria": b.criteria,
                "is_unlocked": b.is_unlocked,
                "unlocked_at": b.unlocked_at.isoformat() if b.unlocked_at else None,
                "progress_pct": b.progress_pct
            } for b in badges
        ]
    }

@router.post("/unlock")
def unlock_achievement(badge_key: str = Query(...), db: Session = Depends(get_db)):
    unlocked = AchievementService.unlock(db, badge_key)
    return {"success": True, "badge_key": badge_key, "unlocked": unlocked}

@router.post("/request-promotion")
def request_tier_promotion(tier: str = Query(..., pattern="^(medium|pro)$"), db: Session = Depends(get_db)):
    eligibility = AchievementService.check_progression_eligibility(db)
    if tier == "medium" and not eligibility["medium_eligible"]:
        raise HTTPException(status_code=400, detail="Criteria for Medium tier not yet met. Complete onboarding, tutorials, and at least 1 trade.")
    if tier == "pro" and not eligibility["pro_eligible"]:
        raise HTTPException(status_code=400, detail="Criteria for Pro tier not yet met. Unlock at least 5 badges and complete 3 trades.")

    user_config = db.query(UserConfig).first()
    if user_config:
        user_config.experience_level = tier
        db.commit()

    return {"success": True, "new_tier": tier, "notice": f"Upgraded to {tier.capitalize()} interface with explicit consent."}
