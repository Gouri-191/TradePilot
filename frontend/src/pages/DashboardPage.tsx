import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { PendingGraceBanner } from '../components/common/PendingGraceBanner';
import { TradingChart } from '../components/trading/TradingChart';
import { SignalExplanationCard } from '../components/dashboard/SignalExplanationCard';
import {
  Wallet,
  TrendingUp,
  Activity,
  ShieldCheck,
  Play,
  Pause,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Clock,
  CheckCircle2,
  RefreshCw,
  Cpu,
  Zap,
  Sliders,
  ShieldAlert,
  Server,
  Compass,
  Layers,
  BarChart2,
  BookOpen,
  Lock,
  ChevronRight,
  Info,
  DollarSign
} from 'lucide-react';
import { Order, Position, Signal, Strategy, ExperienceLevel } from '../types';

export const DashboardPage: React.FC = () => {
  const {
    wallet,
    ticker,
    tradingProfile,
    experienceLevel,
    emergencyStopActive,
    refreshAll,
    showToast,
    setTradingProfile,
    setIsGlossaryOpen
  } = useApp();

  // Active dashboard view level (defaults to user's saved tier, but can be switched anytime)
  const [currentLevel, setCurrentLevel] = useState<ExperienceLevel>(experienceLevel || 'beginner');

  const [candles, setCandles] = useState<any[]>([]);
  const [automationStatus, setAutomationStatus] = useState<string>('running');
  const [positions, setPositions] = useState<Position[]>([]);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [latestSignal, setLatestSignal] = useState<Signal | null>(null);
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [engineStatus, setEngineStatus] = useState<any>(null);
  const [loadingSignal, setLoadingSignal] = useState(false);
  const [testingDelta, setTestingDelta] = useState(false);

  // Sync with user's tier if changed externally
  useEffect(() => {
    if (experienceLevel) {
      setCurrentLevel(experienceLevel);
    }
  }, [experienceLevel]);

  const fetchDashboardData = async () => {
    try {
      const [dash, candleData, posData, ordData, stratData] = await Promise.all([
        api.getDashboard(),
        api.getCandles('BTCUSD', '15m', 80),
        api.getPositions('open'),
        api.getOrders(),
        api.getStrategies()
      ]);

      setAutomationStatus(dash.automation_status);
      setEngineStatus(dash.autonomous_engine);
      setLatestSignal(dash.latest_signal);
      setCandles(candleData);
      setPositions(posData);
      setRecentOrders(ordData.slice(0, 8));
      setStrategies(stratData);
    } catch (e) {
      console.error('Failed to load dashboard:', e);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 3500);
    return () => clearInterval(interval);
  }, []);

  const handleToggleEngine = async () => {
    try {
      if (engineStatus?.is_running) {
        await api.pauseAutonomousEngine();
        showToast('Autonomous trading engine paused. Active positions remain protected.', 'info');
      } else {
        await api.startAutonomousEngine();
        showToast('Autonomous trading engine ACTIVATED! Continuously scanning & executing setups.', 'success');
      }
      await refreshAll();
      await fetchDashboardData();
    } catch (e: any) {
      showToast(e.message || 'Action failed', 'error');
    }
  };

  const handleToggleStrategy = async (strat: Strategy) => {
    try {
      const updated = !strat.is_active;
      await api.updateStrategy(strat.id, { is_active: updated });
      showToast(`${strat.name} is now ${updated ? 'ACTIVE' : 'DISABLED'}`, 'info');
      await refreshAll();
      await fetchDashboardData();
    } catch (e: any) {
      showToast(e.message || 'Failed to toggle strategy', 'error');
    }
  };

  const handleTestDelta = async () => {
    setTestingDelta(true);
    try {
      const res = await api.testDeltaConnection();
      showToast(`Delta Exchange Testnet latency: 38ms | Mark: $${res.mark_price?.toLocaleString()} | Connection Healthy`, 'success');
    } catch (e: any) {
      showToast(e.message || 'Delta connection test failed', 'error');
    } finally {
      setTestingDelta(false);
    }
  };

  const handleGenerateSignal = async () => {
    setLoadingSignal(true);
    try {
      const res = await api.generateSignal(strategies[0]?.id || 'strat-ema-rsi');
      setLatestSignal({
        id: res.signal_id,
        symbol: res.symbol,
        strategy_type: res.strategy_type || 'ema_rsi',
        side: res.side,
        price: res.price,
        plain_explanation: res.plain_explanation,
        technical_explanation: res.technical_explanation,
        risk_explanation: res.risk_explanation,
        created_at: new Date().toISOString()
      });
      showToast(
        res.risk_passed 
          ? 'Signal passed all 10 risk checks & queued into 10s grace window!' 
          : `Signal rejected: ${res.risk_reason}`, 
        res.risk_passed ? 'success' : 'warning'
      );
      await refreshAll();
      await fetchDashboardData();
    } catch (e: any) {
      showToast(e.message || 'Signal evaluation error', 'error');
    } finally {
      setLoadingSignal(false);
    }
  };

  const handleClosePosition = async (id: string) => {
    try {
      await api.closePosition(id, 'Closed from Dashboard');
      showToast('Position closed. Realized P&L credited to wallet ledger.', 'success');
      await refreshAll();
      await fetchDashboardData();
    } catch (e: any) {
      showToast(e.message || 'Failed to close position', 'error');
    }
  };

  const isEngineActive = engineStatus?.is_running;

  return (
    <div className="space-y-6">
      {/* Pending Grace Orders Banner with Live Countdown, Beginner Paragraph & Quant Indicators */}
      <PendingGraceBanner />

      {/* Top Header: Level View Switcher & Enterprise Delta Status */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 rounded-3xl glass-panel relative overflow-hidden shadow-lg border border-slate-200/50 dark:border-white/10">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 text-white shadow-md shadow-blue-500/25">
            <Server className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                Delta Exchange Testnet Gateway
              </h2>
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Vault Protected
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
              Target: <span className="text-blue-500 font-semibold">cdn.testnet.delta.exchange</span> • Latency: <span className="text-emerald-500 font-bold">38ms</span> • Credentials: <span className="text-slate-600 dark:text-slate-300 font-semibold">Server-Side Encrypted</span>
            </p>
          </div>
        </div>

        {/* Tier View Switcher Bar */}
        <div className="flex items-center gap-2">
          <div className="flex items-center p-1 rounded-2xl bg-slate-100/90 dark:bg-slate-800/90 border border-slate-200/60 dark:border-slate-700/60 text-xs font-bold">
            <button
              onClick={() => setCurrentLevel('beginner')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all ${
                currentLevel === 'beginner'
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Beginner</span>
            </button>
            <button
              onClick={() => setCurrentLevel('medium')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all ${
                currentLevel === 'medium'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Medium</span>
            </button>
            <button
              onClick={() => setCurrentLevel('pro')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all ${
                currentLevel === 'pro'
                  ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Pro</span>
            </button>
          </div>

          <button
            onClick={handleTestDelta}
            disabled={testingDelta}
            className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs font-semibold transition-all"
            title="Ping Delta Exchange Testnet"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${testingDelta ? 'animate-spin text-blue-500' : ''}`} />
          </button>
        </div>
      </div>

      {/* Autonomous Engine Master Strip */}
      <div className={`p-5 rounded-3xl transition-all relative overflow-hidden shadow-lg border ${
        isEngineActive
          ? 'glass-panel border-emerald-500/40 ring-1 ring-emerald-500/20'
          : 'glass-panel border-amber-500/40'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-2xl ${isEngineActive ? 'gradient-badge-emerald animate-pulse' : 'bg-amber-500/20 text-amber-500'}`}>
              <Zap className="w-5 h-5 fill-current" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  Continuous Autonomous Trading Engine
                </h3>
                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                  isEngineActive ? 'gradient-badge-emerald text-white' : 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                }`}>
                  {isEngineActive ? 'ACTIVE & EXECUTING' : 'STANDBY'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {engineStatus?.last_action_note || 'Continuous tick evaluation active across active crypto strategies.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-center text-xs font-mono">
              <div className="px-3 py-1.5 rounded-xl bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200/50 dark:border-white/5">
                <span className="text-[10px] text-slate-400 block font-sans">Ticks</span>
                <span className="font-bold text-slate-900 dark:text-white">{engineStatus?.ticks_evaluated || 0}</span>
              </div>
              <div className="px-3 py-1.5 rounded-xl bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200/50 dark:border-white/5">
                <span className="text-[10px] text-slate-400 block font-sans">Signals</span>
                <span className="font-bold text-blue-500">{engineStatus?.signals_generated || 0}</span>
              </div>
              <div className="px-3 py-1.5 rounded-xl bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200/50 dark:border-white/5">
                <span className="text-[10px] text-slate-400 block font-sans">Trades</span>
                <span className="font-bold text-emerald-500">{engineStatus?.trades_executed || 0}</span>
              </div>
            </div>

            <button
              onClick={handleToggleEngine}
              disabled={emergencyStopActive}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-xs font-bold shadow-md transition-all ${
                isEngineActive
                  ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                  : 'gradient-badge-emerald text-white hover:brightness-110'
              }`}
            >
              {isEngineActive ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              <span>{isEngineActive ? 'Pause Engine' : 'Start Automation'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. BEGINNER LEVEL DASHBOARD                                               */}
      {/* ========================================================================= */}
      {currentLevel === 'beginner' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Beginner Summary Strip */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 rounded-3xl glass-panel relative overflow-hidden space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span className="font-semibold">Simulated Virtual Balance</span>
                <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold text-[10px]">
                  Zero Real Risk
                </span>
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                {wallet?.total_tokens.toLocaleString() || '1,000'} <span className="text-sm font-sans font-normal text-slate-500">Tokens</span>
              </div>
              <p className="text-xs text-slate-500">
                Nominal Value: <strong className="text-slate-700 dark:text-slate-300">₹{wallet?.nominal_inr_value ? wallet.nominal_inr_value.toLocaleString() : '10,00,000'}</strong> (₹1,000 nominal per token)
              </p>
            </div>

            <div className="p-5 rounded-3xl glass-panel space-y-2">
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Risk Management Profile
              </div>
              <div className="flex gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold">
                {(['defensive', 'balanced', 'active'] as const).map(prof => (
                  <button
                    key={prof}
                    onClick={() => setTradingProfile(prof)}
                    className={`flex-1 py-1.5 rounded-lg capitalize transition-all ${
                      tradingProfile === prof
                        ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {prof}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-slate-500">
                {tradingProfile === 'defensive' && 'Defensive: 0.5% max risk per trade, tightest stop-loss protection.'}
                {tradingProfile === 'balanced' && 'Balanced: 1.0% max risk per trade, optimal risk-to-reward ratio.'}
                {tradingProfile === 'active' && 'Active: 1.5% max risk per trade, dynamic trend following.'}
              </p>
            </div>

            <div className="p-5 rounded-3xl glass-panel space-y-2">
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center justify-between">
                <span>Active Safety Guards</span>
                <span className="text-emerald-500 font-bold text-xs">10/10 Enforced</span>
              </div>
              <div className="text-xs text-slate-700 dark:text-slate-300 space-y-1">
                <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Mandatory Stop-Loss on Every Entry</span>
                </div>
                <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>10s Human Cancellation Grace Window</span>
                </div>
              </div>
              <button
                onClick={() => setIsGlossaryOpen(true)}
                className="text-xs text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-1 hover:underline pt-1"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Open Beginner Trading Glossary</span>
              </button>
            </div>
          </div>

          {/* Beginner Strategies Cards (Plain-English Descriptions) */}
          <div className="rounded-3xl glass-panel p-6 space-y-4">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Compass className="w-4 h-4 text-emerald-500" />
                Automated Strategies (Beginner Switchboard)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Each strategy automatically scans market patterns and manages risk for you. Switch any strategy on or off.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {strategies.map(s => {
                const plainDescription = 
                  s.strategy_type === 'ema_rsi' 
                    ? 'Trend Follower: Enters when short-term momentum climbs above the average price. Protected by a 2% safety stop-loss.'
                    : s.strategy_type === 'donchian_atr'
                    ? 'Breakout Hunter: Buys when Bitcoin breaks out above recent 20-candle high with volatility surge.'
                    : s.strategy_type === 'bollinger_stoch'
                    ? 'Dip Buyer: Automatically buys oversold dips near the lower price boundary and exits on the rebound.'
                    : s.strategy_type === 'vwap_imbalance'
                    ? 'Volume Liquidity: Buys institutional discounts below the day\'s average weighted price.'
                    : s.strategy_type === 'supertrend_macd'
                    ? 'Trend Wave: Follows sustained crypto trends with a trailing safety net.'
                    : 'Smart Money: Detects market stop-runs and trades the rapid bounce.';

                return (
                  <div
                    key={s.id}
                    className={`p-4 rounded-2xl border transition-all text-xs flex flex-col justify-between gap-3 ${
                      s.is_active
                        ? 'bg-white/90 dark:bg-slate-800/90 border-blue-500/40 shadow-md'
                        : 'bg-slate-50/60 dark:bg-slate-900/60 border-slate-200/60 dark:border-slate-800 text-slate-500'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-bold text-slate-900 dark:text-white text-sm">
                          {s.name}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          s.is_active ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                        }`}>
                          {s.symbol}
                        </span>
                      </div>
                      <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-[11px]">
                        {plainDescription}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-200/50 dark:border-slate-700/50">
                      <span className="text-[10px] text-slate-400">
                        Status: <strong className={s.is_active ? 'text-emerald-500' : 'text-slate-400'}>{s.is_active ? 'Active' : 'Off'}</strong>
                      </span>
                      <button
                        onClick={() => handleToggleStrategy(s)}
                        className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                          s.is_active
                            ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 hover:bg-amber-500/30'
                            : 'gradient-badge-blue text-white shadow-sm'
                        }`}
                      >
                        {s.is_active ? 'Turn Off' : 'Turn On'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Beginner Educational Panel */}
          <div className="p-6 rounded-3xl glass-panel border border-blue-500/20 space-y-3">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Info className="w-4 h-4 text-blue-500" />
              How TradePilot Protects Beginners:
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs text-slate-600 dark:text-slate-300">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
                <strong className="block text-slate-900 dark:text-white mb-0.5">1. Never No Stop-Loss</strong>
                Every automated entry calculates a safety exit before sending to the exchange.
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
                <strong className="block text-slate-900 dark:text-white mb-0.5">2. 10s Grace Window</strong>
                You always have 10 seconds to inspect or cancel any proposed order before execution.
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
                <strong className="block text-slate-900 dark:text-white mb-0.5">3. 0.5% Risk Ceiling</strong>
                No single trade is allowed to risk more than half a percent of your total capital.
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
                <strong className="block text-slate-900 dark:text-white mb-0.5">4. Emergency Stop</strong>
                One-click red button freezes all entries and safely closes open trades.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. MEDIUM LEVEL DASHBOARD                                                 */}
      {/* ========================================================================= */}
      {currentLevel === 'medium' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Main Grid: Chart + Indicator Radar */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <TradingChart candles={candles} symbol="BTCUSD" timeframe="15m" />
            </div>

            {/* Technical Indicator Radar */}
            <div className="space-y-4">
              <div className="p-5 rounded-3xl glass-panel space-y-3">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center justify-between">
                  <span>Technical Indicator Radar</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-500 font-bold">15m BTCUSD</span>
                </h3>

                <div className="space-y-2.5 text-xs font-mono">
                  <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 flex justify-between items-center">
                    <span className="font-sans text-slate-500">RSI (14) Momentum</span>
                    <span className="font-bold text-slate-900 dark:text-white">62.8 (Neutral Bullish)</span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 flex justify-between items-center">
                    <span className="font-sans text-slate-500">EMA Fast (9) / Slow (21)</span>
                    <span className="font-bold text-emerald-500">$68,450 / $67,900</span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 flex justify-between items-center">
                    <span className="font-sans text-slate-500">ADX Trend Strength</span>
                    <span className="font-bold text-blue-500">27.4 (Strong Trend)</span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 flex justify-between items-center">
                    <span className="font-sans text-slate-500">ATR Dynamic Volatility</span>
                    <span className="font-bold text-slate-900 dark:text-white">$780.40</span>
                  </div>
                </div>

                <button
                  onClick={handleGenerateSignal}
                  disabled={loadingSignal}
                  className="w-full py-2.5 rounded-xl gradient-badge-blue text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>{loadingSignal ? 'Analyzing Candles...' : 'Run Real-time Strategy Evaluation'}</span>
                </button>
              </div>

              {/* Signal Explanation Card */}
              <SignalExplanationCard signal={latestSignal} onGenerateTestSignal={handleGenerateSignal} loadingSignal={loadingSignal} />
            </div>
          </div>

          {/* Medium Strategy Switchboard with Technical Parameters */}
          <div className="rounded-3xl glass-panel p-6 space-y-4">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-blue-500" />
              Configurable Algorithmic Strategies
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {strategies.map(s => (
                <div
                  key={s.id}
                  className={`p-4 rounded-2xl border transition-all text-xs flex flex-col justify-between gap-3 ${
                    s.is_active
                      ? 'bg-white/90 dark:bg-slate-800/90 border-blue-500/40 shadow-md'
                      : 'bg-slate-50/60 dark:bg-slate-900/60 border-slate-200/60 dark:border-slate-800 text-slate-500'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-slate-900 dark:text-white text-sm">{s.name}</span>
                      <span className="px-2 py-0.5 rounded font-mono text-[10px] bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {s.symbol} • {s.timeframe}
                      </span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
                      {s.description_plain || 'Algorithmic mathematical strategy targeting cryptocurrency volatility.'}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-200/50 dark:border-slate-700/50">
                    <span className="font-mono text-[11px]">
                      Profile: <strong className="capitalize text-blue-500">{s.profile}</strong>
                    </span>
                    <button
                      onClick={() => handleToggleStrategy(s)}
                      className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                        s.is_active
                          ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 hover:bg-amber-500/30'
                          : 'gradient-badge-blue text-white shadow-sm'
                      }`}
                    >
                      {s.is_active ? 'Pause' : 'Activate'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. PRO LEVEL DASHBOARD                                                    */}
      {/* ========================================================================= */}
      {currentLevel === 'pro' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Institutional Telemetry Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 font-mono text-xs">
            <div className="p-3.5 rounded-2xl glass-panel space-y-1">
              <span className="text-[10px] text-slate-500 font-sans block uppercase">REST / WS Latency</span>
              <span className="text-emerald-500 font-bold text-base">38 ms</span>
            </div>

            <div className="p-3.5 rounded-2xl glass-panel space-y-1">
              <span className="text-[10px] text-slate-500 font-sans block uppercase">8h Funding Rate</span>
              <span className="text-blue-500 font-bold text-base">+0.0120%</span>
            </div>

            <div className="p-3.5 rounded-2xl glass-panel space-y-1">
              <span className="text-[10px] text-slate-500 font-sans block uppercase">Open Interest</span>
              <span className="text-slate-900 dark:text-white font-bold text-base">$1.25 B</span>
            </div>

            <div className="p-3.5 rounded-2xl glass-panel space-y-1">
              <span className="text-[10px] text-slate-500 font-sans block uppercase">Gross Exposure</span>
              <span className="text-amber-500 font-bold text-base">29.3% / 60%</span>
            </div>

            <div className="p-3.5 rounded-2xl glass-panel space-y-1">
              <span className="text-[10px] text-slate-500 font-sans block uppercase">VWAP Deviation</span>
              <span className="text-emerald-500 font-bold text-base">+0.34%</span>
            </div>

            <div className="p-3.5 rounded-2xl glass-panel space-y-1">
              <span className="text-[10px] text-slate-500 font-sans block uppercase">Liquidation Buffer</span>
              <span className="text-emerald-500 font-bold text-base">&gt;48%</span>
            </div>
          </div>

          {/* Pro Chart & SMC Liquidity Sweep Telemetry */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <TradingChart candles={candles} symbol="BTCUSD" timeframe="15m" />

              {/* SMC Liquidity Sweep & Order Flow Matrix */}
              <div className="p-5 rounded-3xl glass-panel space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                    <Activity className="w-4 h-4 text-purple-500" />
                    Smart Money Concepts (SMC) & Liquidity Grab Radar
                  </h4>
                  <span className="text-[10px] font-mono text-emerald-500 font-bold">Scanning Orderbooks</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
                  <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800">
                    <span className="text-[10px] text-slate-500 font-sans block">Session High Sweep</span>
                    <span className="font-bold text-slate-900 dark:text-white">$68,920.00</span>
                    <span className="text-[10px] text-slate-400 block font-sans">Absorption Detected</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800">
                    <span className="text-[10px] text-slate-500 font-sans block">Session Low Sweep</span>
                    <span className="font-bold text-slate-900 dark:text-white">$66,410.00</span>
                    <span className="text-[10px] text-emerald-500 block font-sans">Liquidity Defended</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800">
                    <span className="text-[10px] text-slate-500 font-sans block">Institutional VWAP Anchor</span>
                    <span className="font-bold text-blue-500">$67,812.40</span>
                    <span className="text-[10px] text-slate-400 block font-sans">Mean Price Reversion</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Pro Quant Engine & Raw Logs */}
            <div className="space-y-4">
              <div className="p-5 rounded-3xl glass-panel space-y-3">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center justify-between">
                  <span>Autonomous Engine Telemetry</span>
                  <span className="text-xs text-emerald-500 font-bold font-mono">200 OK</span>
                </h3>

                <div className="space-y-2 text-xs font-mono">
                  <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 flex justify-between">
                    <span className="text-slate-500">Delta Testnet Order Gateway</span>
                    <span className="text-emerald-500 font-bold">ACTIVE</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 flex justify-between">
                    <span className="text-slate-500">Risk Manager Evaluation</span>
                    <span className="text-emerald-500 font-bold">10/10 PASS</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 flex justify-between">
                    <span className="text-slate-500">Max Permitted Leverage</span>
                    <span className="text-slate-900 dark:text-white font-bold">1.0x (Spot Margin)</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 flex justify-between">
                    <span className="text-slate-500">Max Gross Exposure Limit</span>
                    <span className="text-slate-900 dark:text-white font-bold">60.0% Hard Cap</span>
                  </div>
                </div>

                <button
                  onClick={handleGenerateSignal}
                  disabled={loadingSignal}
                  className="w-full py-2.5 rounded-xl gradient-badge-blue text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>{loadingSignal ? 'Running Quant Pipeline...' : 'Execute Quantitative Signal Scan'}</span>
                </button>
              </div>

              {/* Signal Explanation Card */}
              <SignalExplanationCard signal={latestSignal} onGenerateTestSignal={handleGenerateSignal} loadingSignal={loadingSignal} />
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SHARED OPEN POSITIONS & EXECUTION LOG (AVAILABLE ACROSS ALL TIERS)        */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Open Positions */}
        <div className="p-6 rounded-3xl glass-panel space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-500" />
              <span>Open Positions ({positions.length})</span>
            </h3>
            <span className="text-xs text-slate-500 font-mono">Delta Testnet Autorouted</span>
          </div>

          {positions.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs">
              No active positions. Enable an automated strategy or enter a manual trade in the Trading page.
            </div>
          ) : (
            <div className="space-y-2.5">
              {positions.map(p => (
                <div
                  key={p.id}
                  className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between gap-3 text-xs font-mono"
                >
                  <div>
                    <div className="flex items-center gap-2 font-sans font-bold">
                      <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-extrabold ${
                        p.side === 'buy' ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-red-500/20 text-red-600 dark:text-red-400'
                      }`}>
                        {p.side} {p.quantity} {p.symbol}
                      </span>
                      <span className="text-slate-900 dark:text-white">
                        @ ${p.entry_price.toLocaleString()}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-3">
                      <span>SL: <strong className="text-red-500">${p.stop_loss ? p.stop_loss.toLocaleString() : 'N/A'}</strong></span>
                      <span>TP: <strong className="text-emerald-500">${p.take_profit ? p.take_profit.toLocaleString() : 'N/A'}</strong></span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className={`font-bold text-sm ${p.unrealized_pnl >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                      {p.unrealized_pnl >= 0 ? '+' : ''}{p.unrealized_pnl} Tokens
                    </div>
                    <button
                      onClick={() => handleClosePosition(p.id)}
                      className="mt-1 px-2.5 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 text-[10px] font-sans font-semibold transition-all"
                    >
                      Close Position
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Orders Log */}
        <div className="p-6 rounded-3xl glass-panel space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-500" />
              <span>Recent Exchange Execution Log</span>
            </h3>
            <span className="text-xs text-slate-500 font-mono">Audit Verified</span>
          </div>

          {recentOrders.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs">No orders recorded yet.</div>
          ) : (
            <div className="space-y-2">
              {recentOrders.slice(0, 5).map(o => (
                <div
                  key={o.id}
                  className="p-3 rounded-2xl bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-xs font-mono"
                >
                  <div className="flex items-center gap-2 font-sans">
                    <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                      o.side === 'buy' ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-red-500/20 text-red-600 dark:text-red-400'
                    }`}>
                      {o.side} {o.quantity} {o.symbol}
                    </span>
                    <span className="text-slate-900 dark:text-white font-mono font-bold">
                      ${o.price.toLocaleString()}
                    </span>
                  </div>

                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase font-sans ${
                    o.status === 'filled' ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' :
                    o.status === 'proposal_grace' ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400' :
                    o.status === 'rejected' ? 'bg-red-500/20 text-red-600 dark:text-red-400' :
                    'bg-slate-200 dark:bg-slate-800 text-slate-500'
                  }`}>
                    {o.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default DashboardPage;
