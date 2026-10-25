import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { PendingGraceBanner } from '../components/common/PendingGraceBanner';
import {
  Settings,
  ShieldCheck,
  Key,
  Sliders,
  Moon,
  Sun,
  CheckCircle2,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { ExperienceLevel, TradingProfile } from '../types';

export const SettingsPage: React.FC = () => {
  const {
    theme,
    toggleTheme,
    experienceLevel,
    setExperienceLevel,
    tradingProfile,
    setTradingProfile,
    refreshAll,
    showToast
  } = useApp();

  const [maxRisk, setMaxRisk] = useState(0.5);
  const [dailyLoss, setDailyLoss] = useState(2.0);
  const [maxExposure, setMaxExposure] = useState(20.0);
  const [maxLeverage, setMaxLeverage] = useState(3.0);
  const [maxPositions, setMaxPositions] = useState(2);
  const [graceSeconds, setGraceSeconds] = useState(10);
  
  // Delta API
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [useTestnet, setUseTestnet] = useState(true);
  const [testingDelta, setTestingDelta] = useState(false);
  const [deltaStatus, setDeltaStatus] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.getSettings().then(cfg => {
      setMaxRisk(cfg.max_risk_per_trade_pct);
      setDailyLoss(cfg.daily_loss_limit_pct);
      setMaxExposure(cfg.max_gross_exposure_pct);
      setMaxLeverage(cfg.max_leverage);
      setMaxPositions(cfg.max_concurrent_positions);
      setGraceSeconds(cfg.grace_period_seconds);
      setUseTestnet(cfg.delta_use_testnet);
    }).catch(console.error);
  }, []);

  const handleSaveRisk = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.updateSettings({
        max_risk_per_trade_pct: maxRisk,
        daily_loss_limit_pct: dailyLoss,
        max_gross_exposure_pct: maxExposure,
        max_leverage: maxLeverage,
        max_concurrent_positions: maxPositions,
        grace_period_seconds: graceSeconds
      });
      showToast('Risk settings saved to backend.', 'success');
      await refreshAll();
    } catch (err: any) {
      showToast(err.message || 'Failed to save settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDeltaApi = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.updateSettings({
        delta_api_key: apiKey || undefined,
        delta_api_secret: apiSecret || undefined,
        delta_use_testnet: useTestnet
      });
      showToast('Delta Exchange Testnet credentials updated securely on server.', 'success');
      setApiKey('');
      setApiSecret('');
    } catch (err: any) {
      showToast(err.message || 'Failed to update credentials', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTestingDelta(true);
    try {
      const res = await api.testDeltaConnection();
      setDeltaStatus(res);
      showToast('Delta Exchange connectivity test succeeded!', 'success');
    } catch (e: any) {
      showToast(e.message || 'Connectivity check failed', 'error');
    } finally {
      setTestingDelta(false);
    }
  };

  return (
    <div className="space-y-6">
      <PendingGraceBanner />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl glass-panel relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            System & API Settings
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Configure risk ceilings, interface level, and Delta Exchange Testnet integration
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Risk Guard Settings */}
        <div className="rounded-2xl glass-panel p-6 relative overflow-hidden space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <ShieldCheck className="w-5 h-5 text-emerald-500" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Mandatory Risk Management Limits
            </h3>
          </div>

          <form onSubmit={handleSaveRisk} className="space-y-3.5 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Risk / Trade (% Equity)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  max="2.0"
                  value={maxRisk}
                  onChange={e => setMaxRisk(parseFloat(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl glass-input text-slate-900 dark:text-white font-mono"
                  required
                />
                <span className="text-[10px] text-slate-400">Hard system cap: 2.0%</span>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Daily Loss Circuit Breaker (%)
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  max="5.0"
                  value={dailyLoss}
                  onChange={e => setDailyLoss(parseFloat(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl glass-input text-slate-900 dark:text-white font-mono"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Max Gross Exposure (%)
                </label>
                <input
                  type="number"
                  min="5"
                  max="50"
                  value={maxExposure}
                  onChange={e => setMaxExposure(parseFloat(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl glass-input text-slate-900 dark:text-white font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Pending Order Grace (Seconds)
                </label>
                <input
                  type="number"
                  min="5"
                  max="60"
                  value={graceSeconds}
                  onChange={e => setGraceSeconds(parseInt(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl glass-input text-slate-900 dark:text-white font-mono"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Max Leverage
                </label>
                <input
                  type="number"
                  min="1"
                  max="5"
                  value={maxLeverage}
                  onChange={e => setMaxLeverage(parseFloat(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl glass-input text-slate-900 dark:text-white font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Max Concurrent Positions
                </label>
                <input
                  type="number"
                  min="1"
                  max="4"
                  value={maxPositions}
                  onChange={e => setMaxPositions(parseInt(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl glass-input text-slate-900 dark:text-white font-mono"
                  required
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={saving}
                className="w-full py-2.5 rounded-xl gradient-badge-blue text-white font-semibold hover:brightness-110 transition-all shadow-md"
              >
                {saving ? 'Updating...' : 'Save Risk Preferences'}
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Delta Exchange Integration & Theme */}
        <div className="space-y-6">
          {/* Delta Exchange API Settings */}
          <div className="rounded-2xl glass-panel p-6 relative overflow-hidden space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Key className="w-5 h-5 text-blue-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Delta Exchange Integration
                </h3>
              </div>
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testingDelta}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100/80 dark:bg-slate-800/80 text-xs font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors border border-slate-200/50 dark:border-slate-700/50 backdrop-blur-sm"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${testingDelta ? 'animate-spin' : ''}`} />
                <span>Test Endpoint</span>
              </button>
            </div>

            {deltaStatus && (
              <div className="p-3.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 text-xs font-mono space-y-1 backdrop-blur-sm">
                <div className="text-emerald-500 font-bold">✓ {deltaStatus.target}</div>
                <div className="text-slate-400">Mark Price: ${deltaStatus.mark_price?.toLocaleString()}</div>
                <div className="text-slate-400">Data Feed: {deltaStatus.source}</div>
              </div>
            )}

            <form onSubmit={handleSaveDeltaApi} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Delta Testnet API Key
                </label>
                <input
                  type="password"
                  placeholder="Paste Delta Testnet API Key"
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl glass-input text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Delta Testnet API Secret
                </label>
                <input
                  type="password"
                  placeholder="Paste API Secret (HMAC SHA256)"
                  value={apiSecret}
                  onChange={e => setApiSecret(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl glass-input text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="testnet"
                  checked={useTestnet}
                  onChange={e => setUseTestnet(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 accent-blue-600"
                />
                <label htmlFor="testnet" className="text-slate-700 dark:text-slate-300 font-medium">
                  Use Delta Exchange Testnet (cdn.testnet.delta.exchange)
                </label>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full py-2.5 rounded-xl gradient-badge-blue text-white font-semibold hover:brightness-110 transition-all shadow-md"
              >
                Save Credentials Server-Side
              </button>
            </form>
          </div>

          {/* Theme & Profile Toggles */}
          <div className="rounded-2xl glass-panel p-6 relative overflow-hidden space-y-4 text-xs">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3">
              Appearance & Automation Profile
            </h3>

            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold text-slate-900 dark:text-white">Active Theme</div>
                <div className="text-[11px] text-slate-400">Toggle between Light & Dark interface</div>
              </div>
              <button
                onClick={toggleTheme}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200/50 dark:border-slate-700/50 font-semibold text-slate-700 dark:text-slate-200 backdrop-blur-sm transition-all hover:bg-slate-200 dark:hover:bg-slate-700"
              >
                {theme === 'dark' ? <Moon className="w-4 h-4 text-amber-400" /> : <Sun className="w-4 h-4 text-amber-500" />}
                <span className="capitalize">{theme} Theme</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
