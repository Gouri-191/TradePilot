import os
from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    APP_NAME: str = "TradePilot API"
    ENVIRONMENT: str = "testnet"
    DEBUG: bool = True
    DATABASE_URL: str = "sqlite:///./tradepilot.db"
    
    # Delta Exchange Testnet Endpoints
    DELTA_TESTNET_API_URL: str = "https://cdn.testnet.delta.exchange"
    DELTA_TESTNET_ORDER_URL: str = "https://api.testnet.delta.exchange"
    DELTA_API_KEY: Optional[str] = "HIErDiqRn1ofpsHENrQTCfIsmxMTDb"
    DELTA_API_SECRET: Optional[str] = None
    
    # System Risk Limits
    MAX_RISK_PER_TRADE_PCT: float = 2.0     # Hard cap 2%
    DEFAULT_RISK_PER_TRADE_PCT: float = 0.5 # Default 0.5%
    MAX_DAILY_LOSS_PCT: float = 2.0        # Circuit breaker at 2%
    MAX_GROSS_EXPOSURE_PCT: float = 20.0   # 20% max equity in active trades
    MAX_CONCURRENT_POSITIONS: int = 2      # Max 2 concurrent positions
    DEFAULT_GRACE_PERIOD_SECONDS: int = 10 # 10s review grace period
    
    # Token Wallet Config
    TOKEN_NOMINAL_INR: float = 1000.0      # 1 Token = ₹1,000 INR
    STARTING_TOKEN_BALANCE: float = 1000.0 # 1000 Tokens = ₹10,00,000 INR nominal (~$11,760 USD)
    
    class Config:
        env_file = ".env"
        extra = "allow"

settings = Settings()
