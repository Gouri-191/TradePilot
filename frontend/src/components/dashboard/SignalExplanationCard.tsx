import React, { useState } from 'react';
import { Signal } from '../../types';
import { useApp } from '../../context/AppContext';
import { Activity, ShieldCheck, ChevronRight, Info, AlertTriangle } from 'lucide-react';

interface Props {
  signal: Signal | null;
  onGenerateTestSignal?: () => void;
  loadingSignal?: boolean;
}

export const SignalExplanationCard: React.FC<Props> = ({ signal, onGenerateTestSignal, loadingSignal }) => {
  const { experienceLevel } = useApp();
  const [activeTab, setActiveTab] = useState<'plain' | 'technical' | 'risk'>('plain');

  if (!signal) {
    return (
      <div className="rounded-3xl glass-panel p-6 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-500" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Signal Decision Engine
            </h3>
          </div>
          {onGenerateTestSignal && (
            <button
              onClick={onGenerateTestSignal}
              disabled={loadingSignal}
              className="text-xs px-3.5 py-1.5 rounded-xl gradient-badge-blue font-bold transition-all hover:opacity-90 shadow-sm"
            >
              {loadingSignal ? 'Analyzing...' : 'Simulate Strategy Evaluation'}
            </button>
          )}
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          No live signals recorded yet. Active strategies evaluate candlestick patterns every interval.
        </p>
      </div>
    );
  }

  const isBuy = signal.side.toLowerCase() === 'buy';

  return (
    <div className="rounded-3xl glass-panel p-6 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100/60 dark:border-white/10 pb-3">
        <div className="flex items-center gap-2.5">
          <span
            className={`px-3 py-1 rounded-xl text-xs font-extrabold uppercase tracking-wider ${
              isBuy
                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                : 'bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30'
            }`}
          >
            {signal.side} SIGNAL
          </span>
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              {signal.symbol} @ ${signal.price?.toLocaleString()}
              <span className="text-[11px] font-normal text-slate-400">
                ({signal.strategy_type === 'ema_rsi' ? 'EMA Crossover + RSI' : 'Donchian Breakout + ATR'})
              </span>
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onGenerateTestSignal && (
            <button
              onClick={onGenerateTestSignal}
              disabled={loadingSignal}
              className="text-xs px-3 py-1.5 rounded-xl bg-white/60 dark:bg-slate-800/60 hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors font-semibold border border-slate-200/60 dark:border-white/10 shadow-xs"
            >
              {loadingSignal ? 'Analyzing...' : 'Re-Evaluate Live'}
            </button>
          )}

          {/* Explanation Tier Tabs */}
          <div className="flex bg-white/50 dark:bg-slate-800/50 backdrop-blur-md p-1 rounded-xl text-xs font-semibold border border-slate-200/80 dark:border-white/10">
            <button
              onClick={() => setActiveTab('plain')}
              className={`px-3 py-1 rounded-lg transition-all ${
                activeTab === 'plain'
                  ? 'gradient-badge-blue'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              Plain English
            </button>
            <button
              onClick={() => setActiveTab('technical')}
              className={`px-3 py-1 rounded-lg transition-all ${
                activeTab === 'technical'
                  ? 'gradient-badge-blue'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              Technical
            </button>
            <button
              onClick={() => setActiveTab('risk')}
              className={`px-3 py-1 rounded-lg transition-all ${
                activeTab === 'risk'
                  ? 'gradient-badge-blue'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              Risk Guard
            </button>
          </div>
        </div>
      </div>

      {/* Content depending on active tab */}
      {activeTab === 'plain' && (
        <div className="p-4 rounded-2xl bg-blue-500/10 dark:bg-blue-950/30 border border-blue-500/20 backdrop-blur-md text-xs text-slate-700 dark:text-slate-200 leading-relaxed space-y-2">
          <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-bold mb-1">
            <Info className="w-4 h-4" />
            Plain-English Decision Rationale
          </div>
          <p>{signal.plain_explanation}</p>
        </div>
      )}

      {activeTab === 'technical' && (
        <div className="p-4 rounded-2xl bg-white/40 dark:bg-slate-800/40 border border-slate-200/60 dark:border-white/10 font-mono text-xs text-slate-800 dark:text-slate-200 space-y-1.5 whitespace-pre-line leading-relaxed backdrop-blur-md">
          <div className="flex items-center gap-1.5 font-sans font-bold text-slate-700 dark:text-slate-300 mb-2">
            <Activity className="w-4 h-4 text-blue-500" />
            Quantitative Indicator Values & Thresholds
          </div>
          {signal.technical_explanation}
        </div>
      )}

      {activeTab === 'risk' && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 dark:bg-emerald-950/30 border border-emerald-500/20 text-xs text-slate-800 dark:text-slate-200 space-y-1.5 whitespace-pre-line leading-relaxed font-mono backdrop-blur-md">
          <div className="flex items-center gap-1.5 font-sans font-bold text-emerald-700 dark:text-emerald-300 mb-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            Mandatory Risk Engine Sizing & Circuit Check
          </div>
          {signal.risk_explanation}
        </div>
      )}
    </div>
  );
};
