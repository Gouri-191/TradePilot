from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import UserConfig
from app.schemas import UserConfigUpdate
from app.services.delta_client import delta_client

router = APIRouter(prefix="/api/settings", tags=["Settings"])

def get_or_create_user_config(db: Session) -> UserConfig:
    config = db.query(UserConfig).first()
    if not config:
        config = UserConfig(
            username="Trader",
            experience_level="beginner",
            active_theme="dark",
            onboarding_completed=False,
            trading_profile="balanced",
            max_risk_per_trade_pct=0.5,
            daily_loss_limit_pct=2.0,
            max_gross_exposure_pct=20.0,
            max_leverage=3.0,
            max_concurrent_positions=2,
            grace_period_seconds=10,
            delta_api_key="HIErDiqRn1ofpsHENrQTCfIsmxMTDb",
            delta_use_testnet=True
        )
        db.add(config)
        db.commit()
        db.refresh(config)
    elif not config.delta_api_key:
        config.delta_api_key = "HIErDiqRn1ofpsHENrQTCfIsmxMTDb"
        db.commit()
    return config

@router.get("")
def get_settings(db: Session = Depends(get_db)):
    config = get_or_create_user_config(db)
    return {
        "experience_level": config.experience_level,
        "active_theme": config.active_theme,
        "onboarding_completed": config.onboarding_completed,
        "trading_profile": config.trading_profile,
        "max_risk_per_trade_pct": config.max_risk_per_trade_pct,
        "daily_loss_limit_pct": config.daily_loss_limit_pct,
        "max_gross_exposure_pct": config.max_gross_exposure_pct,
        "max_leverage": config.max_leverage,
        "max_concurrent_positions": config.max_concurrent_positions,
        "grace_period_seconds": config.grace_period_seconds,
        "emergency_stop_triggered": config.emergency_stop_triggered,
        "delta_api_key_configured": bool(config.delta_api_key),
        "delta_use_testnet": config.delta_use_testnet
    }

@router.patch("")
def update_settings(payload: UserConfigUpdate, db: Session = Depends(get_db)):
    config = get_or_create_user_config(db)

    if payload.experience_level is not None:
        config.experience_level = payload.experience_level
    if payload.active_theme is not None:
        config.active_theme = payload.active_theme
    if payload.onboarding_completed is not None:
        config.onboarding_completed = payload.onboarding_completed
    if payload.trading_profile is not None:
        config.trading_profile = payload.trading_profile
    if payload.max_risk_per_trade_pct is not None:
        config.max_risk_per_trade_pct = min(2.0, payload.max_risk_per_trade_pct) # System cap 2.0%
    if payload.daily_loss_limit_pct is not None:
        config.daily_loss_limit_pct = payload.daily_loss_limit_pct
    if payload.max_gross_exposure_pct is not None:
        config.max_gross_exposure_pct = payload.max_gross_exposure_pct
    if payload.max_leverage is not None:
        config.max_leverage = min(5.0, payload.max_leverage)
    if payload.max_concurrent_positions is not None:
        config.max_concurrent_positions = min(5, payload.max_concurrent_positions)
    if payload.grace_period_seconds is not None:
        config.grace_period_seconds = max(5, payload.grace_period_seconds)
    if payload.delta_api_key is not None:
        config.delta_api_key = payload.delta_api_key
        delta_client.api_key = payload.delta_api_key
    if payload.delta_api_secret is not None:
        config.delta_api_secret = payload.delta_api_secret
        delta_client.api_secret = payload.delta_api_secret
    if payload.delta_use_testnet is not None:
        config.delta_use_testnet = payload.delta_use_testnet

    db.commit()
    return {"success": True, "message": "Settings updated successfully"}

@router.post("/test-delta-connection")
async def test_delta_connection(db: Session = Depends(get_db)):
    """Tests connectivity to Delta Exchange Testnet."""
    ticker = await delta_client.get_ticker("BTCUSD")
    return {
        "success": True,
        "target": "Delta Exchange Testnet",
        "symbol": "BTCUSD",
        "mark_price": ticker.get("mark_price"),
        "source": ticker.get("source"),
        "status": "connected" if "delta" in ticker.get("source") else "simulated_fallback"
    }
