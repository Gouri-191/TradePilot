export type ExperienceLevel = 'beginner' | 'medium' | 'pro';
export type TradingProfile = 'defensive' | 'balanced' | 'active';
export type AutomationStatus = 'running' | 'paused' | 'stopped' | 'emergency_stopped';

export interface UserConfig {
  experience_level: ExperienceLevel;
  active_theme: 'dark' | 'light';
  onboarding_completed: boolean;
  trading_profile: TradingProfile;
  max_risk_per_trade_pct: number;
  daily_loss_limit_pct: number;
  max_gross_exposure_pct: number;
  max_leverage: number;
  max_concurrent_positions: number;
  grace_period_seconds: number;
  emergency_stop_triggered: boolean;
  delta_api_key_configured: boolean;
  delta_api_key?: string;
  delta_api_secret?: string;
  delta_use_testnet: boolean;
}

export type StrategyType = 
  | 'ema_rsi' 
  | 'donchian_atr' 
  | 'bollinger_stoch' 
  | 'vwap_imbalance' 
  | 'supertrend_macd' 
  | 'vsa_liquidity_sweep';

export interface UserProfile {
  id: number;
  username: string;
  email: string;
  experience_level: ExperienceLevel;
}

export interface DeltaApiInfo {
  status: string;
  vault_status?: string;
  endpoint: string;
  environment: string;
  symbol: string;
  latency_ms: number;
  is_authenticated: boolean;
}

export interface AutonomousEngineStatus {
  is_running: boolean;
  emergency_stop_triggered: boolean;
  ticks_evaluated: number;
  signals_generated: number;
  trades_executed: number;
  open_positions_count: number;
  pending_grace_orders_count: number;
  last_scan_at: string;
  last_action_note: string;
}

export interface Strategy {
  id: string;
  name: string;
  strategy_type: StrategyType | string;
  symbol: string;
  timeframe: string;
  is_active: boolean;
  profile: TradingProfile;
  allocated_tokens: number;
  parameters: Record<string, any>;
  description_plain: string;
  created_at: string;
}

export interface Order {
  id: string;
  client_order_id?: string;
  symbol: string;
  side: 'buy' | 'sell';
  order_type: 'limit' | 'market';
  price: number;
  quantity: number;
  filled_quantity: number;
  status: 'proposal_grace' | 'submitted' | 'open' | 'partially_filled' | 'filled' | 'cancelled' | 'rejected';
  stop_loss?: number;
  take_profit?: number;
  grace_expires_at?: string;
  seconds_remaining?: number;
  exchange_order_id?: string;
  reject_reason?: string;
  strategy_id?: string;
  signal_id?: string;
  plain_explanation?: string;
  technical_explanation?: string;
  indicators?: Record<string, any>;
  is_testnet: boolean;
  created_at: string;
}

export interface Position {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  entry_price: number;
  current_price: number;
  quantity: number;
  leverage: number;
  stop_loss?: number;
  take_profit?: number;
  unrealized_pnl: number;
  realized_pnl: number;
  liquidation_price?: number;
  margin_allocated: number;
  status: 'open' | 'closed';
  is_testnet: boolean;
  opened_at: string;
}

export interface WalletSummary {
  total_tokens: number;
  available_tokens: number;
  allocated_tokens: number;
  nominal_inr_value: number;
  nominal_token_rate: number;
  realized_pnl_tokens: number;
  unrealized_pnl_tokens: number;
  daily_pnl_tokens: number;
  disclaimer: string;
}

export interface WalletLedgerItem {
  id: number;
  transaction_id: string;
  tx_type: string;
  amount_tokens: number;
  nominal_inr: number;
  running_balance: number;
  description: string;
  reference_id?: string;
  created_at: string;
}

export interface TradingSession {
  id: string;
  name: string;
  strategy_id: string;
  profile: TradingProfile;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  timezone: string;
  status: 'upcoming' | 'active' | 'completed' | 'cancelled';
  max_risk_pct: number;
  max_loss_tokens: number;
  trades_count: number;
  realized_pnl_tokens: number;
  is_recurring: boolean;
  recurrence_pattern?: string;
  created_at: string;
}

export interface Achievement {
  id: string;
  badge_key: string;
  title: string;
  description: string;
  category: 'learning' | 'strategy' | 'risk' | 'execution';
  icon: string;
  criteria: string;
  is_unlocked: boolean;
  unlocked_at?: string;
  progress_pct: number;
}

export interface Signal {
  id: string;
  symbol: string;
  strategy_type: string;
  side: string;
  price: number;
  plain_explanation: string;
  technical_explanation: string;
  risk_explanation: string;
  status?: string;
  created_at: string;
}

export interface TickerData {
  symbol: string;
  mark_price: number;
  spot_price: number;
  bid: number;
  ask: number;
  high_24h: number;
  low_24h: number;
  volume_24h: number;
  open_interest: number;
  funding_rate: number;
  source: string;
  timestamp: string;
}
