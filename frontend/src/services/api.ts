import {
  UserConfig,
  Strategy,
  Order,
  Position,
  WalletSummary,
  WalletLedgerItem,
  TradingSession,
  Achievement,
  Signal,
  TickerData
} from '../types';

const API_BASE = '/api';

export const api = {
  // Dashboard
  getDashboard: async () => {
    const res = await fetch(`${API_BASE}/dashboard`);
    if (!res.ok) throw new Error('Failed to fetch dashboard');
    return res.json();
  },

  // Market Data
  getTicker: async (symbol: string = 'BTCUSD'): Promise<TickerData> => {
    const res = await fetch(`${API_BASE}/market-data/ticker?symbol=${symbol}`);
    if (!res.ok) throw new Error('Failed to fetch ticker');
    return res.json();
  },

  getCandles: async (symbol: string = 'BTCUSD', resolution: string = '15m', count: number = 100) => {
    const res = await fetch(`${API_BASE}/market-data/candles?symbol=${symbol}&resolution=${resolution}&count=${count}`);
    if (!res.ok) throw new Error('Failed to fetch candles');
    return res.json();
  },

  getSymbols: async () => {
    const res = await fetch(`${API_BASE}/market-data/symbols`);
    if (!res.ok) throw new Error('Failed to fetch symbols');
    return res.json();
  },

  // Strategies
  getStrategies: async (): Promise<Strategy[]> => {
    const res = await fetch(`${API_BASE}/strategies`);
    if (!res.ok) throw new Error('Failed to fetch strategies');
    return res.json();
  },

  updateStrategy: async (id: string, payload: Partial<Strategy>) => {
    const res = await fetch(`${API_BASE}/strategies/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Failed to update strategy');
    return res.json();
  },

  generateSignal: async (strategyId: string) => {
    const res = await fetch(`${API_BASE}/strategies/${strategyId}/generate-signal`, {
      method: 'POST'
    });
    if (!res.ok) throw new Error('Failed to generate signal');
    return res.json();
  },

  runBacktest: async (payload: any) => {
    const res = await fetch(`${API_BASE}/strategies/backtest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Failed to run backtest');
    return res.json();
  },

  // Orders
  getOrders: async (status?: string): Promise<Order[]> => {
    const url = status ? `${API_BASE}/orders?status=${status}` : `${API_BASE}/orders`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch orders');
    return res.json();
  },

  createOrder: async (payload: any) => {
    const res = await fetch(`${API_BASE}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to create order' }));
      throw new Error(err.detail || 'Failed to create order');
    }
    return res.json();
  },

  editOrder: async (orderId: string, payload: any) => {
    const res = await fetch(`${API_BASE}/orders/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to edit order' }));
      throw new Error(err.detail || 'Failed to edit order');
    }
    return res.json();
  },

  cancelOrder: async (orderId: string, reason?: string) => {
    const res = await fetch(`${API_BASE}/orders/${orderId}/cancel?reason=${encodeURIComponent(reason || 'Cancelled by user')}`, {
      method: 'POST'
    });
    if (!res.ok) throw new Error('Failed to cancel order');
    return res.json();
  },

  executeOrderNow: async (orderId: string) => {
    const res = await fetch(`${API_BASE}/orders/${orderId}/execute-now`, {
      method: 'POST'
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to execute order' }));
      throw new Error(err.detail || 'Failed to execute order');
    }
    return res.json();
  },

  // Positions
  getPositions: async (status: string = 'open'): Promise<Position[]> => {
    const res = await fetch(`${API_BASE}/positions?status=${status}`);
    if (!res.ok) throw new Error('Failed to fetch positions');
    return res.json();
  },

  closePosition: async (positionId: string, reason?: string) => {
    const res = await fetch(`${API_BASE}/positions/${positionId}/close?reason=${encodeURIComponent(reason || 'Closed by user')}`, {
      method: 'POST'
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to close position' }));
      throw new Error(err.detail || 'Failed to close position');
    }
    return res.json();
  },

  // Automation & Emergency Stop
  getAutomationStatus: async () => {
    const res = await fetch(`${API_BASE}/automation/status`);
    if (!res.ok) throw new Error('Failed to fetch automation status');
    return res.json();
  },

  pauseAutomation: async () => {
    const res = await fetch(`${API_BASE}/automation/pause`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to pause automation');
    return res.json();
  },

  resumeAutomation: async () => {
    const res = await fetch(`${API_BASE}/automation/resume`, { method: 'POST' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to resume automation' }));
      throw new Error(err.detail || 'Failed to resume automation');
    }
    return res.json();
  },

  triggerEmergencyStop: async (policy: string = 'market_close', reason?: string) => {
    const res = await fetch(`${API_BASE}/automation/emergency-stop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ close_positions_policy: policy, reason: reason || 'Manual emergency stop triggered' })
    });
    if (!res.ok) throw new Error('Failed to trigger emergency stop');
    return res.json();
  },

  resetEmergencyStop: async () => {
    const res = await fetch(`${API_BASE}/automation/emergency-stop/reset`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to reset emergency stop');
    return res.json();
  },

  // Sessions
  getSessions: async (): Promise<TradingSession[]> => {
    const res = await fetch(`${API_BASE}/sessions`);
    if (!res.ok) throw new Error('Failed to fetch sessions');
    return res.json();
  },

  createSession: async (payload: any) => {
    const res = await fetch(`${API_BASE}/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Failed to create session');
    return res.json();
  },

  startSessionNow: async (sessionId: string) => {
    const res = await fetch(`${API_BASE}/sessions/${sessionId}/start-now`, { method: 'POST' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to start session now' }));
      throw new Error(err.detail || 'Failed to start session now');
    }
    return res.json();
  },

  cancelSession: async (sessionId: string) => {
    const res = await fetch(`${API_BASE}/sessions/${sessionId}/cancel`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to cancel session');
    return res.json();
  },

  // Wallet
  getWalletSummary: async (): Promise<WalletSummary> => {
    const res = await fetch(`${API_BASE}/wallet`);
    if (!res.ok) throw new Error('Failed to fetch wallet summary');
    return res.json();
  },

  getWalletLedger: async (limit: number = 50): Promise<WalletLedgerItem[]> => {
    const res = await fetch(`${API_BASE}/wallet/ledger?limit=${limit}`);
    if (!res.ok) throw new Error('Failed to fetch wallet ledger');
    return res.json();
  },

  depositSimulated: async (amount: number) => {
    const res = await fetch(`${API_BASE}/wallet/deposit-simulated`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount_tokens: amount })
    });
    if (!res.ok) throw new Error('Failed to deposit simulated tokens');
    return res.json();
  },

  withdrawSimulated: async (amount: number) => {
    const res = await fetch(`${API_BASE}/wallet/withdraw-simulated`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount_tokens: amount })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to withdraw' }));
      throw new Error(err.detail || 'Failed to withdraw');
    }
    return res.json();
  },

  // Achievements
  getAchievements: async () => {
    const res = await fetch(`${API_BASE}/achievements`);
    if (!res.ok) throw new Error('Failed to fetch achievements');
    return res.json();
  },

  unlockAchievement: async (badgeKey: string) => {
    const res = await fetch(`${API_BASE}/achievements/unlock?badge_key=${badgeKey}`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to unlock achievement');
    return res.json();
  },

  requestPromotion: async (tier: 'medium' | 'pro') => {
    const res = await fetch(`${API_BASE}/achievements/request-promotion?tier=${tier}`, { method: 'POST' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Promotion criteria not met' }));
      throw new Error(err.detail || 'Promotion criteria not met');
    }
    return res.json();
  },

  // Analytics
  getAnalytics: async () => {
    const res = await fetch(`${API_BASE}/analytics`);
    if (!res.ok) throw new Error('Failed to fetch analytics');
    return res.json();
  },

  // Settings
  getSettings: async (): Promise<UserConfig> => {
    const res = await fetch(`${API_BASE}/settings`);
    if (!res.ok) throw new Error('Failed to fetch settings');
    return res.json();
  },

  updateSettings: async (payload: Partial<UserConfig>) => {
    const res = await fetch(`${API_BASE}/settings`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Failed to update settings');
    return res.json();
  },

  testDeltaConnection: async () => {
    const res = await fetch(`${API_BASE}/settings/test-delta-connection`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to test Delta connection');
    return res.json();
  },

  // Auth & Account Management
  register: async (payload: { username: string; email: string; password: string; experience_level: string }) => {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Registration failed' }));
      throw new Error(err.detail || 'Registration failed');
    }
    return res.json();
  },

  demoLogin: async (tier: string = 'beginner') => {
    const res = await fetch(`${API_BASE}/auth/demo-login?tier=${encodeURIComponent(tier)}`, {
      method: 'POST'
    });
    if (!res.ok) throw new Error('Demo login failed');
    return res.json();
  },

  login: async (payload: { username_or_email: string; password: string }) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Login failed' }));
      throw new Error(err.detail || 'Login failed');
    }
    return res.json();
  },

  getMe: async () => {
    const res = await fetch(`${API_BASE}/auth/me`);
    if (!res.ok) return { logged_in: false, user: null };
    return res.json();
  },

  requestTierUpgrade: async (target_tier: string, user_consent_acknowledged: boolean = true) => {
    const res = await fetch(`${API_BASE}/auth/tier-upgrade`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target_tier, user_consent_acknowledged })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Tier upgrade request failed' }));
      throw new Error(err.detail || 'Tier upgrade request failed');
    }
    return res.json();
  },

  startAutonomousEngine: async () => {
    const res = await fetch(`${API_BASE}/automation/start`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to start autonomous trading engine');
    return res.json();
  },

  pauseAutonomousEngine: async () => {
    const res = await fetch(`${API_BASE}/automation/pause`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to pause autonomous trading engine');
    return res.json();
  }
};
