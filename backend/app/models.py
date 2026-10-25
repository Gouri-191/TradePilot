import datetime
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    experience_level = Column(String(20), default="beginner") # beginner, medium, pro
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    last_login = Column(DateTime, default=datetime.datetime.utcnow)

class UserConfig(Base):
    __tablename__ = "user_config"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=True)
    username = Column(String(50), default="CryptoPilot")
    experience_level = Column(String(20), default="beginner") # beginner, medium, pro
    active_theme = Column(String(20), default="dark")          # dark, light
    onboarding_completed = Column(Boolean, default=False)
    trading_profile = Column(String(20), default="balanced")   # defensive, balanced, active
    autonomous_engine_active = Column(Boolean, default=True)   # continuous autonomous trading engine
    max_risk_per_trade_pct = Column(Float, default=0.5)
    daily_loss_limit_pct = Column(Float, default=2.0)
    max_gross_exposure_pct = Column(Float, default=20.0)
    max_leverage = Column(Float, default=3.0)
    max_concurrent_positions = Column(Integer, default=2)
    grace_period_seconds = Column(Integer, default=10)
    emergency_stop_triggered = Column(Boolean, default=False)
    delta_api_key = Column(String(100), nullable=True)
    delta_api_secret = Column(String(100), nullable=True)
    delta_use_testnet = Column(Boolean, default=True)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

class Strategy(Base):
    __tablename__ = "strategies"

    id = Column(String(50), primary_key=True)
    name = Column(String(100), nullable=False)
    strategy_type = Column(String(50), nullable=False) # ema_rsi, donchian_atr
    symbol = Column(String(20), default="BTCUSD")
    timeframe = Column(String(10), default="15m")
    is_active = Column(Boolean, default=False)
    profile = Column(String(20), default="balanced")   # defensive, balanced, active
    allocated_tokens = Column(Float, default=10.0)
    parameters_json = Column(Text, default="{}")
    description_plain = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

class Order(Base):
    __tablename__ = "orders"

    id = Column(String(50), primary_key=True)
    client_order_id = Column(String(100), unique=True, index=True)
    symbol = Column(String(20), nullable=False)
    side = Column(String(10), nullable=False)         # buy, sell
    order_type = Column(String(20), default="limit")   # limit, market, stop_limit
    price = Column(Float, nullable=False)
    quantity = Column(Float, nullable=False)
    filled_quantity = Column(Float, default=0.0)
    status = Column(String(30), default="proposal_grace") 
    # proposal_grace, approved, submitted, open, partially_filled, filled, cancelled, rejected
    stop_loss = Column(Float, nullable=True)
    take_profit = Column(Float, nullable=True)
    grace_expires_at = Column(DateTime, nullable=True)
    exchange_order_id = Column(String(100), nullable=True)
    reject_reason = Column(Text, nullable=True)
    strategy_id = Column(String(50), nullable=True)
    session_id = Column(String(50), nullable=True)
    signal_id = Column(String(50), nullable=True)
    is_testnet = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

class Position(Base):
    __tablename__ = "positions"

    id = Column(String(50), primary_key=True)
    symbol = Column(String(20), nullable=False)
    side = Column(String(10), nullable=False) # buy (long), sell (short)
    entry_price = Column(Float, nullable=False)
    current_price = Column(Float, nullable=False)
    quantity = Column(Float, nullable=False)
    leverage = Column(Float, default=1.0)
    stop_loss = Column(Float, nullable=True)
    take_profit = Column(Float, nullable=True)
    unrealized_pnl = Column(Float, default=0.0)
    realized_pnl = Column(Float, default=0.0)
    liquidation_price = Column(Float, nullable=True)
    margin_allocated = Column(Float, default=0.0)
    status = Column(String(20), default="open") # open, closed
    is_testnet = Column(Boolean, default=True)
    opened_at = Column(DateTime, default=datetime.datetime.utcnow)
    closed_at = Column(DateTime, nullable=True)

class WalletLedger(Base):
    __tablename__ = "wallet_ledger"

    id = Column(Integer, primary_key=True, index=True)
    transaction_id = Column(String(50), unique=True, index=True)
    tx_type = Column(String(30), nullable=False)
    # deposit, allocate_strategy, release_strategy, realized_pnl, trading_fee, simulated_withdrawal
    amount_tokens = Column(Float, nullable=False)
    nominal_inr = Column(Float, nullable=False)
    running_balance = Column(Float, nullable=False)
    description = Column(String(255), nullable=False)
    reference_id = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class TradingSession(Base):
    __tablename__ = "trading_sessions"

    id = Column(String(50), primary_key=True)
    name = Column(String(100), nullable=False)
    strategy_id = Column(String(50), nullable=False)
    profile = Column(String(20), default="balanced")
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=False)
    duration_minutes = Column(Integer, default=60)
    timezone = Column(String(50), default="UTC")
    status = Column(String(20), default="upcoming") # upcoming, active, completed, cancelled
    max_risk_pct = Column(Float, default=0.5)
    max_loss_tokens = Column(Float, default=2.0)
    trades_count = Column(Integer, default=0)
    realized_pnl_tokens = Column(Float, default=0.0)
    is_recurring = Column(Boolean, default=False)
    recurrence_pattern = Column(String(50), nullable=True) # daily, weekdays, weekends
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class Achievement(Base):
    __tablename__ = "achievements"

    id = Column(String(50), primary_key=True)
    badge_key = Column(String(50), unique=True)
    title = Column(String(100), nullable=False)
    description = Column(Text, nullable=False)
    category = Column(String(50), default="learning") # learning, strategy, risk, execution
    icon = Column(String(50), default="Award")
    criteria = Column(Text, nullable=False)
    is_unlocked = Column(Boolean, default=False)
    unlocked_at = Column(DateTime, nullable=True)
    progress_pct = Column(Integer, default=0)

class SignalLog(Base):
    __tablename__ = "signal_logs"

    id = Column(String(50), primary_key=True)
    symbol = Column(String(20), nullable=False)
    strategy_type = Column(String(50), nullable=False)
    side = Column(String(10), nullable=False)
    price = Column(Float, nullable=False)
    plain_explanation = Column(Text, nullable=False)
    technical_explanation = Column(Text, nullable=False)
    risk_explanation = Column(Text, nullable=False)
    status = Column(String(20), default="proposed") # proposed, approved, rejected, executed, cancelled
    indicators_json = Column(Text, default="{}")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    action_type = Column(String(50), nullable=False)
    entity_type = Column(String(50), nullable=False)
    entity_id = Column(String(100), nullable=True)
    severity = Column(String(20), default="info") # info, warning, error, critical
    details = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
