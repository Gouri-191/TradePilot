from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

class UserConfigBase(BaseModel):
    experience_level: str = "beginner"
    active_theme: str = "dark"
    onboarding_completed: bool = False
    trading_profile: str = "balanced"
    max_risk_per_trade_pct: float = 0.5
    daily_loss_limit_pct: float = 2.0
    max_gross_exposure_pct: float = 20.0
    max_leverage: float = 3.0
    max_concurrent_positions: int = 2
    grace_period_seconds: int = 10
    delta_api_key: Optional[str] = None
    delta_api_secret: Optional[str] = None
    delta_use_testnet: bool = True

class UserConfigUpdate(BaseModel):
    experience_level: Optional[str] = None
    active_theme: Optional[str] = None
    onboarding_completed: Optional[bool] = None
    trading_profile: Optional[str] = None
    max_risk_per_trade_pct: Optional[float] = None
    daily_loss_limit_pct: Optional[float] = None
    max_gross_exposure_pct: Optional[float] = None
    max_leverage: Optional[float] = None
    max_concurrent_positions: Optional[int] = None
    grace_period_seconds: Optional[int] = None
    delta_api_key: Optional[str] = None
    delta_api_secret: Optional[str] = None
    delta_use_testnet: Optional[bool] = None

class UserConfigResponse(UserConfigBase):
    id: int
    emergency_stop_triggered: bool
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class StrategyBase(BaseModel):
    name: str
    strategy_type: str # ema_rsi, donchian_atr
    symbol: str = "BTCUSD"
    timeframe: str = "15m"
    is_active: bool = False
    profile: str = "balanced"
    allocated_tokens: float = 10.0
    parameters_json: str = "{}"
    description_plain: str = ""

class StrategyCreate(StrategyBase):
    id: str

class StrategyUpdate(BaseModel):
    name: Optional[str] = None
    is_active: Optional[bool] = None
    profile: Optional[str] = None
    allocated_tokens: Optional[float] = None
    parameters_json: Optional[str] = None
    timeframe: Optional[str] = None
    symbol: Optional[str] = None

class StrategyResponse(StrategyBase):
    id: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class OrderCreate(BaseModel):
    symbol: str
    side: str # buy, sell
    order_type: str = "limit"
    price: float
    quantity: float
    stop_loss: Optional[float] = None
    take_profit: Optional[float] = None
    strategy_id: Optional[str] = None
    session_id: Optional[str] = None

class OrderUpdate(BaseModel):
    price: Optional[float] = None
    quantity: Optional[float] = None
    stop_loss: Optional[float] = None
    take_profit: Optional[float] = None

class OrderResponse(BaseModel):
    id: str
    client_order_id: Optional[str] = None
    symbol: str
    side: str
    order_type: str
    price: float
    quantity: float
    filled_quantity: float
    status: str
    stop_loss: Optional[float] = None
    take_profit: Optional[float] = None
    grace_expires_at: Optional[datetime] = None
    seconds_remaining: Optional[int] = None
    exchange_order_id: Optional[str] = None
    reject_reason: Optional[str] = None
    strategy_id: Optional[str] = None
    is_testnet: bool
    created_at: datetime

    class Config:
        from_attributes = True

class PositionResponse(BaseModel):
    id: str
    symbol: str
    side: str
    entry_price: float
    current_price: float
    quantity: float
    leverage: float
    stop_loss: Optional[float] = None
    take_profit: Optional[float] = None
    unrealized_pnl: float
    realized_pnl: float
    liquidation_price: Optional[float] = None
    margin_allocated: float
    status: str
    is_testnet: bool
    opened_at: datetime

    class Config:
        from_attributes = True

class WalletSummaryResponse(BaseModel):
    total_tokens: float
    available_tokens: float
    allocated_tokens: float
    nominal_inr_value: float
    nominal_token_rate: float
    realized_pnl_tokens: float
    unrealized_pnl_tokens: float
    daily_pnl_tokens: float
    disclaimer: str

class WalletLedgerResponse(BaseModel):
    id: int
    transaction_id: str
    tx_type: str
    amount_tokens: float
    nominal_inr: float
    running_balance: float
    description: str
    reference_id: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class DepositSimulatedRequest(BaseModel):
    amount_tokens: float = Field(..., gt=0, le=1000)

class WithdrawSimulatedRequest(BaseModel):
    amount_tokens: float = Field(..., gt=0)

class TradingSessionCreate(BaseModel):
    name: str
    strategy_id: str
    profile: str = "balanced"
    start_time: datetime
    end_time: datetime
    duration_minutes: int = 60
    timezone: str = "UTC"
    max_risk_pct: float = 0.5
    max_loss_tokens: float = 2.0
    is_recurring: bool = False
    recurrence_pattern: Optional[str] = None
    start_immediately: bool = False

class TradingSessionResponse(BaseModel):
    id: str
    name: str
    strategy_id: str
    profile: str
    start_time: datetime
    end_time: datetime
    duration_minutes: int
    timezone: str
    status: str
    max_risk_pct: float
    max_loss_tokens: float
    trades_count: int
    realized_pnl_tokens: float
    is_recurring: bool
    recurrence_pattern: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class AchievementResponse(BaseModel):
    id: str
    badge_key: str
    title: str
    description: str
    category: str
    icon: str
    criteria: str
    is_unlocked: bool
    unlocked_at: Optional[datetime] = None
    progress_pct: int

    class Config:
        from_attributes = True

class SignalResponse(BaseModel):
    id: str
    symbol: str
    strategy_type: str
    side: str
    price: float
    plain_explanation: str
    technical_explanation: str
    risk_explanation: str
    status: str
    indicators_json: str
    created_at: datetime

    class Config:
        from_attributes = True

class BacktestRequest(BaseModel):
    strategy_type: str = "ema_rsi"
    symbol: str = "BTCUSD"
    timeframe: str = "15m"
    lookback_days: int = 30
    initial_tokens: float = 40.0
    parameters: Dict[str, Any] = {}
    fee_pct: float = 0.05
    slippage_pct: float = 0.02

class BacktestResponse(BaseModel):
    total_trades: int
    winning_trades: int
    losing_trades: int
    win_rate_pct: float
    total_return_pct: float
    final_balance_tokens: float
    max_drawdown_pct: float
    profit_factor: float
    sharpe_ratio: float
    equity_curve: List[Dict[str, Any]]
    trades: List[Dict[str, Any]]
    disclaimer: str

class EmergencyStopRequest(BaseModel):
    close_positions_policy: str = "market_close" # market_close or keep_protective_stop
    reason: Optional[str] = "Manual emergency stop triggered"
