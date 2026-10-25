import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { PendingGraceBanner } from '../components/common/PendingGraceBanner';
import {
  Cpu,
  Sliders,
  Play,
  CheckCircle2,
  BarChart2,
  ShieldCheck,
  TrendingUp,
  AlertCircle,
  HelpCircle
} from 'lucide-react';
import { Strategy } from '../types';

export const StrategiesPage: React.FC = () => {
  const { experienceLevel, refreshAll, showToast } = useApp();
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [selectedStrat, setSelectedStrat] = useState<Strategy | null>(null);
  const [backtestResult, setBacktestResult] = useState<any>(null);
  const [backtestLoading, setBacktestLoading] = useState(false);
  const [evaluatingSignal, setEvaluatingSignal] = useState(false);

  // Strategy form states
  const [emaFast, setEmaFast] = useState(9);
  const [emaSlow, setEmaSlow] = useState(21);
  const [rsiPeriod, setRsiPeriod] = useState(14);
  const [rsiOB, setRsiOB] = useState(70);
  const [rsiOS, setRsiOS] = useState(30);
  const [adxFilter, setAdxFilter] = useState(true);
  const [donchianLookback, setDonchianLookback] = useState(20);
  const [atrMultiplier, setAtrMultiplier] = useState(2.0);

  const loadStrategies = async () => {
    try {
      const data = await api.getStrategies();
      setStrategies(data);
      if (data.length > 0 && !selectedStrat) {
        setSelectedStrat(data[0]);
        syncParams(data[0]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const syncParams = (s: Strategy) => {
    if (s.strategy_type === 'ema_rsi') {
      setEmaFast(s.parameters.ema_fast || 9);
      setEmaSlow(s.parameters.ema_slow || 21);
      setRsiPeriod(s.parameters.rsi_period || 14);
      setRsiOB(s.parameters.rsi_overbought || 70);
      setRsiOS(s.parameters.rsi_oversold || 30);
      setAdxFilter(s.parameters.adx_filter ?? true);
    } else {
      setDonchianLookback(s.parameters.donchian_lookback || 20);
      setAtrMultiplier(s.parameters.atr_multiplier || 2.0);
    }
  };

  useEffect(() => {
    loadStrategies();
  }, []);

  const handleSelectStrat = (s: Strategy) => {
    setSelectedStrat(s);
    syncParams(s);
    setBacktestResult(null);
  };

  const handleToggleActive = async (s: Strategy) => {
    try {
      await api.updateStrategy(s.id, { is_active: !s.is_active });
      showToast(`Strategy '${s.name}' ${!s.is_active ? 'activated' : 'paused'}`, 'info');
      await loadStrategies();
      await refreshAll();
    } catch (e: any) {
      showToast(e.message || 'Error updating strategy', 'error');
    }
  };

  const handleSaveParameters = async () => {
    if (!selectedStrat) return;
    const params = selectedStrat.strategy_type === 'ema_rsi'
      ? {
          ema_fast: emaFast,
          ema_slow: emaSlow,
          rsi_period: rsiPeriod,
          rsi_overbought: rsiOB,
          rsi_oversold: rsiOS,
          adx_filter: adxFilter,
          adx_threshold: 25.0
        }
      : {
          donchian_lookback: donchianLookback,
          atr_period: 14,
          atr_multiplier: atrMultiplier
        };

    try {
      await api.updateStrategy(selectedStrat.id, {
        parameters: params
      });
      showToast('Strategy parameters saved to backend.', 'success');
      await api.unlockAchievement('strategy_student');
      await loadStrategies();
    } catch (e: any) {
      showToast(e.message || 'Failed to save', 'error');
    }
  };

  const handleRunBacktest = async () => {
    if (!selectedStrat) return;
    setBacktestLoading(true);
    try {
      const params = selectedStrat.strategy_type === 'ema_rsi'
        ? { ema_fast: emaFast, ema_slow: emaSlow, rsi_period: rsiPeriod, adx_filter: adxFilter }
        : { donchian_lookback: donchianLookback, atr_multiplier: atrMultiplier };

      const res = await api.runBacktest({
        strategy_type: selectedStrat.strategy_type,
        symbol: selectedStrat.symbol,
        timeframe: selectedStrat.timeframe,
        initial_tokens: 40.0,
        parameters: params,
        fee_pct: 0.05,
        slippage_pct: 0.02
      });
      setBacktestResult(res);
      await api.unlockAchievement('backtest_analyst');
      showToast('Backtest simulation completed. Slippage & fees applied.', 'success');
    } catch (e: any) {
      showToast(e.message || 'Backtest failed', 'error');
    } finally {
      setBacktestLoading(false);
    }
  };

  const handleTestSignal = async () => {
    if (!selectedStrat) return;
    setEvaluatingSignal(true);
    try {
      const res = await api.generateSignal(selectedStrat.id);
      showToast(res.risk_passed ? 'Signal passed all 10 risk checks & queued into grace period!' : `Signal rejected: ${res.risk_reason}`, res.risk_passed ? 'success' : 'warning');
      await refreshAll();
    } catch (e: any) {
      showToast(e.message || 'Failed to evaluate signal', 'error');
    } finally {
      setEvaluatingSignal(false);
    }
  };

  return (
    <div className="space-y-6">
      <PendingGraceBanner />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl glass-panel relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            Strategy Management & Backtesting
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Configurable algorithmic strategies with mandatory risk validation
          </p>
        </div>

        <button
          onClick={handleTestSignal}
          disabled={evaluatingSignal || !selectedStrat}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl gradient-badge-blue text-xs font-semibold hover:brightness-110 transition-all"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>{evaluatingSignal ? 'Evaluating Live Candlesticks...' : 'Test Signal Now'}</span>
        </button>
      </div>

      {/* Strategies Selection Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {strategies.map(s => {
          const isSelected = selectedStrat?.id === s.id;
          return (
            <div
              key={s.id}
              onClick={() => handleSelectStrat(s)}
              className={`p-5 rounded-2xl cursor-pointer transition-all relative overflow-hidden ${
                isSelected
                  ? 'glass-panel border-blue-500/60 dark:border-blue-400/60 shadow-[0_8px_30px_rgba(37,99,235,0.15)] ring-1 ring-blue-500/30'
                  : 'glass-panel-hover'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 rounded-xl bg-gradient-to-tr from-blue-600/20 to-indigo-600/20 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                    <Cpu className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                      {s.name}
                    </h3>
                    <span className="text-[11px] font-mono text-slate-500">
                      {s.symbol} • {s.timeframe}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation();
                    handleToggleActive(s);
                  }}
                  className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase transition-all ${
                    s.is_active
                      ? 'gradient-badge-emerald'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                  }`}
                >
                  {s.is_active ? 'Active' : 'Paused'}
                </button>
              </div>

              <p className="text-slate-600 dark:text-slate-300 leading-relaxed mt-2 text-xs">
                {s.description_plain}
              </p>
            </div>
          );
        })}
      </div>

      {/* Strategy Configuration & Backtesting Tabs */}
      {selectedStrat && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Parameter Configuration Form */}
          <div className="rounded-2xl glass-panel p-5 relative overflow-hidden space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-blue-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Parameters Configuration
                </h3>
              </div>
              <span className="text-[11px] capitalize text-slate-400">
                {experienceLevel} Level
              </span>
            </div>

            {selectedStrat.strategy_type === 'ema_rsi' ? (
              <div className="space-y-3.5 text-xs">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Fast EMA Period: <span className="font-mono text-blue-500">{emaFast}</span>
                  </label>
                  <input
                    type="range"
                    min="5"
                    max="20"
                    value={emaFast}
                    onChange={e => setEmaFast(parseInt(e.target.value))}
                    className="w-full accent-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Slow EMA Period: <span className="font-mono text-amber-500">{emaSlow}</span>
                  </label>
                  <input
                    type="range"
                    min="15"
                    max="50"
                    value={emaSlow}
                    onChange={e => setEmaSlow(parseInt(e.target.value))}
                    className="w-full accent-amber-600"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    RSI Period: <span className="font-mono text-slate-900 dark:text-white">{rsiPeriod}</span>
                  </label>
                  <input
                    type="range"
                    min="7"
                    max="21"
                    value={rsiPeriod}
                    onChange={e => setRsiPeriod(parseInt(e.target.value))}
                    className="w-full accent-blue-600"
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    ADX Trend Filter (&gt;25)
                  </span>
                  <input
                    type="checkbox"
                    checked={adxFilter}
                    onChange={e => setAdxFilter(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 accent-blue-600"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3.5 text-xs">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Donchian Lookback: <span className="font-mono text-blue-500">{donchianLookback} candles</span>
                  </label>
                  <input
                    type="range"
                    min="10"
                    max="50"
                    value={donchianLookback}
                    onChange={e => setDonchianLookback(parseInt(e.target.value))}
                    className="w-full accent-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    ATR Stop Multiplier: <span className="font-mono text-amber-500">{atrMultiplier}x</span>
                  </label>
                  <input
                    type="range"
                    min="1.0"
                    max="4.0"
                    step="0.5"
                    value={atrMultiplier}
                    onChange={e => setAtrMultiplier(parseFloat(e.target.value))}
                    className="w-full accent-amber-600"
                  />
                </div>
              </div>
            )}

            <div className="pt-2">
              <button
                onClick={handleSaveParameters}
                className="w-full py-2.5 rounded-xl gradient-badge-blue text-white font-semibold hover:brightness-110 transition-all"
              >
                Save Configuration
              </button>
            </div>
          </div>

          {/* Interactive Backtester */}
          <div className="lg:col-span-2 rounded-2xl glass-panel p-5 relative overflow-hidden space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-blue-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Historical Backtest Simulator
                </h3>
              </div>
              <button
                onClick={handleRunBacktest}
                disabled={backtestLoading}
                className="px-3.5 py-1.5 rounded-xl gradient-badge-blue text-white text-xs font-semibold hover:brightness-110 transition-all"
              >
                {backtestLoading ? 'Computing Simulation...' : 'Run Backtest'}
              </button>
            </div>

            {backtestResult ? (
              <div className="space-y-4">
                {/* 4 Stat Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800/60 backdrop-blur-sm">
                    <span className="text-slate-400">Win Rate</span>
                    <div className="font-mono text-lg font-bold text-emerald-500">
                      {backtestResult.win_rate_pct}%
                    </div>
                    <span className="text-[10px] text-slate-400">
                      {backtestResult.winning_trades}W / {backtestResult.losing_trades}L
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800/60 backdrop-blur-sm">
                    <span className="text-slate-400">Total Return</span>
                    <div
                      className={`font-mono text-lg font-bold ${
                        backtestResult.total_return_pct >= 0 ? 'text-emerald-500' : 'text-rose-500'
                      }`}
                    >
                      {backtestResult.total_return_pct >= 0 ? '+' : ''}
                      {backtestResult.total_return_pct}%
                    </div>
                    <span className="text-[10px] text-slate-400">
                      Final: {backtestResult.final_balance_tokens} Tokens
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800/60 backdrop-blur-sm">
                    <span className="text-slate-400">Profit Factor</span>
                    <div className="font-mono text-lg font-bold text-blue-500">
                      {backtestResult.profit_factor}
                    </div>
                    <span className="text-[10px] text-slate-400">Sharpe: {backtestResult.sharpe_ratio}</span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800/60 backdrop-blur-sm">
                    <span className="text-slate-400">Max Drawdown</span>
                    <div className="font-mono text-lg font-bold text-amber-500">
                      {backtestResult.max_drawdown_pct}%
                    </div>
                    <span className="text-[10px] text-slate-400">Low Volatility</span>
                  </div>
                </div>

                {/* Backtest Disclaimer */}
                <p className="text-[11px] text-slate-400 italic">
                  {backtestResult.disclaimer}
                </p>

                {/* Trade Log */}
                <div>
                  <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Simulated Historical Fills ({backtestResult.trades.length} trades)
                  </h4>
                  <div className="max-h-40 overflow-y-auto space-y-1.5 text-xs font-mono pr-1">
                    {backtestResult.trades.map((t: any, i: number) => (
                      <div
                        key={i}
                        className="p-2.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`uppercase text-[10px] font-bold px-2 py-0.5 rounded ${
                              t.side === 'buy' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                            }`}
                          >
                            {t.side}
                          </span>
                          <span>${t.entry_price} &rarr; ${t.exit_price}</span>
                          <span className="text-[11px] font-sans text-slate-400">({t.reason})</span>
                        </div>
                        <span
                          className={`font-bold ${
                            t.pnl_tokens >= 0 ? 'text-emerald-500' : 'text-rose-500'
                          }`}
                        >
                          {t.pnl_tokens >= 0 ? '+' : ''}{t.pnl_tokens} Tokens ({t.return_pct}%)
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-slate-400">
                Click "Run Backtest" to simulate historical performance against candlesticks with realistic fee deductions and simulated slippage.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
