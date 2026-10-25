import sys
import os
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app.main import app
from app.database import engine, Base, SessionLocal
from app.services.wallet_service import WalletService
from app.services.strategy_engine import StrategyEngine
from app.services.risk_manager import RiskManager
from app.models import UserConfig

print("Testing database table creation...")
Base.metadata.create_all(bind=engine)

db = SessionLocal()
try:
    cfg = db.query(UserConfig).first()
    if not cfg:
        cfg = UserConfig()
        db.add(cfg)
        db.commit()
    print("User config initialized:", cfg.experience_level)
    
    WalletService.initialize_wallet_if_empty(db)
    summary = WalletService.get_summary(db)
    print(f"Wallet summary: {summary['total_tokens']} Tokens (~INR {summary['nominal_inr_value']})")
finally:
    db.close()

print("ALL BACKEND CHECKS PASSED!")
