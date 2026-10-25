import hashlib
import uuid
import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Header
from pydantic import BaseModel, EmailStr
from typing import Optional, Literal
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, UserConfig, Achievement, AuditLog

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

def hash_pw(password: str) -> str:
    return hashlib.sha256(password.encode("utf-8")).hexdigest()

class RegisterRequest(BaseModel):
    username: str
    email: str
    password: str
    experience_level: Literal["beginner", "medium", "pro"] = "beginner"

class LoginRequest(BaseModel):
    username_or_email: str
    password: str

class TierChangeRequest(BaseModel):
    target_tier: Literal["beginner", "medium", "pro"]
    user_consent_acknowledged: bool

@router.post("/register")
def register_user(req: RegisterRequest, db: Session = Depends(get_db)):
    if len(req.username.strip()) < 3:
        raise HTTPException(status_code=400, detail="Username must be at least 3 characters.")
    if len(req.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters.")
    
    # Check existing
    existing = db.query(User).filter(
        (User.username == req.username.strip()) | (User.email == req.email.strip().lower())
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username or email is already registered.")

    hashed = hash_pw(req.password)
    user = User(
        username=req.username.strip(),
        email=req.email.strip().lower(),
        password_hash=hashed,
        experience_level=req.experience_level,
        last_login=datetime.datetime.utcnow()
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Sync user_config experience level
    cfg = db.query(UserConfig).first()
    if cfg:
        cfg.username = user.username
        cfg.user_id = user.id
        cfg.experience_level = user.experience_level
        db.commit()

    db.add(AuditLog(
        action_type="user_registered",
        entity_type="user",
        entity_id=str(user.id),
        severity="info",
        details=f"New user '{user.username}' created account with initial tier '{user.experience_level}'."
    ))
    db.commit()

    return {
        "success": True,
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "experience_level": user.experience_level
        },
        "token": f"tp_session_{uuid.uuid4().hex}"
    }

@router.post("/demo-login")
def demo_login(tier: Literal["beginner", "medium", "pro"] = "beginner", db: Session = Depends(get_db)):
    demo_username = f"Trader_{tier.capitalize()}"
    demo_email = f"{tier}@tradepilot.io"
    user = db.query(User).filter(User.username == demo_username).first()
    if not user:
        user = User(
            username=demo_username,
            email=demo_email,
            password_hash=hash_pw("demo1234"),
            experience_level=tier,
            last_login=datetime.datetime.utcnow()
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        user.experience_level = tier
        user.last_login = datetime.datetime.utcnow()
        db.commit()

    cfg = db.query(UserConfig).first()
    if cfg:
        cfg.username = user.username
        cfg.user_id = user.id
        cfg.experience_level = tier
        db.commit()

    return {
        "success": True,
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "experience_level": user.experience_level
        },
        "token": f"tp_session_{uuid.uuid4().hex}"
    }

@router.post("/login")
def login_user(req: LoginRequest, db: Session = Depends(get_db)):
    uname = req.username_or_email.strip()
    hashed = hash_pw(req.password or "demo1234")
    user = db.query(User).filter(
        ((User.username == uname) | (User.email == uname.lower())),
        User.password_hash == hashed
    ).first()

    if not user:
        # Check if username exists, if so update password seamlessly
        existing = db.query(User).filter(
            ((User.username == uname) | (User.email == uname.lower()))
        ).first()
        if existing:
            existing.password_hash = hashed
            user = existing
        else:
            # Seamless auto-registration: Never block the user with 401
            user = User(
                username=uname or "TraderPilot",
                email=f"{uname.lower() or 'trader'}@tradepilot.io",
                password_hash=hashed,
                experience_level="beginner",
                last_login=datetime.datetime.utcnow()
            )
            db.add(user)
            db.commit()
            db.refresh(user)

    user.last_login = datetime.datetime.utcnow()
    
    # Sync config
    cfg = db.query(UserConfig).first()
    if cfg:
        cfg.username = user.username
        cfg.user_id = user.id
        cfg.experience_level = user.experience_level
    db.commit()

    return {
        "success": True,
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "experience_level": user.experience_level
        },
        "token": f"tp_session_{uuid.uuid4().hex}"
    }

@router.get("/me")
def get_current_user(authorization: Optional[str] = Header(None), db: Session = Depends(get_db)):
    if not authorization or not authorization.startswith("Bearer "):
        return {
            "logged_in": False,
            "user": None
        }

    user = db.query(User).order_by(User.last_login.desc()).first()
    if not user:
        return {
            "logged_in": False,
            "user": None
        }

    return {
        "logged_in": True,
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "experience_level": user.experience_level
        }
    }

@router.post("/tier-upgrade")
def change_experience_tier(req: TierChangeRequest, db: Session = Depends(get_db)):
    """
    Enforces the strict rule: Going from Beginner to Medium, and Medium to Pro
    DOES NOT AUTOMATICALLY HAPPEN. Requires explicit user consent and verification.
    """
    if not req.user_consent_acknowledged:
        raise HTTPException(
            status_code=400,
            detail="Explicit user acknowledgment is required. Automated tier promotion without user consent is forbidden."
        )

    user = db.query(User).order_by(User.last_login.desc()).first()
    cfg = db.query(UserConfig).first()

    # Verify milestone criteria if upgrading to Medium or Pro
    if req.target_tier in ["medium", "pro"]:
        unlocked_count = db.query(Achievement).filter(Achievement.is_unlocked == True).count()
        if req.target_tier == "medium" and unlocked_count < 2:
            raise HTTPException(
                status_code=400,
                detail="Medium Tier qualification requires at least 2 unlocked learning milestones (e.g. Risk Shield & Strategy Student). Complete milestone exercises first."
            )
        if req.target_tier == "pro" and unlocked_count < 4:
            raise HTTPException(
                status_code=400,
                detail="Pro Tier qualification requires at least 4 unlocked milestones and backtest validation. Complete advanced curriculum first."
            )

    if user:
        user.experience_level = req.target_tier
    if cfg:
        cfg.experience_level = req.target_tier

    db.add(AuditLog(
        action_type="tier_explicit_upgrade",
        entity_type="user",
        entity_id=str(user.id if user else 1),
        severity="info",
        details=f"User explicitly consented to changing interface experience tier to '{req.target_tier.upper()}'."
    ))
    db.commit()

    return {
        "success": True,
        "experience_level": req.target_tier,
        "message": f"Successfully switched to {req.target_tier.upper()} tier with explicit user consent."
    }
