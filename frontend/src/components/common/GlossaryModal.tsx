import React, { useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';
import { BookOpen, X, CheckCircle2 } from 'lucide-react';

const GLOSSARY_TERMS = [
  {
    term: "Virtual Tokens & Nominal Rate",
    definition: "TradePilot operates on a simulated ledger where 1 Token = ₹1,000 INR nominal value. It allows realistic position sizing and risk calculations without moving real money until regulatory clearance."
  },
  {
    term: "EMA Crossover (Exponential Moving Average)",
    definition: "A trend-following indicator that calculates the weighted average price. When a fast EMA (e.g. 9 periods) crosses above a slow EMA (e.g. 21 periods), it signals bullish momentum."
  },
  {
    term: "RSI (Relative Strength Index)",
    definition: "Measures the speed and change of price moves on a 0–100 scale. Readings above 70 indicate overbought conditions; readings below 30 indicate oversold conditions. TradePilot uses 50 as a momentum filter."
  },
  {
    term: "ADX (Average Directional Index)",
    definition: "Measures trend strength regardless of direction. Readings above 25 indicate a strong trending regime suitable for trend strategies; readings below 20 warn of chop and false breakouts."
  },
  {
    term: "Donchian Channels & ATR",
    definition: "Donchian bands outline highest highs and lowest lows over N periods. Average True Range (ATR) measures market volatility and determines safe trailing stop distances."
  },
  {
    term: "Mandatory Stop-Loss",
    definition: "An enforced automatic exit order that halts a trade if the price moves against you. TradePilot prohibits any trade from executing without a mathematically defined stop-loss."
  },
  {
    term: "10-Second Grace Period",
    definition: "A countdown window whenever an automated signal fires. Gives the human operator a transparent opportunity to inspect, modify quantity or price, or cancel the proposal before submission."
  },
  {
    term: "Daily Loss Circuit Breaker",
    definition: "A system-enforced risk ceiling (default 2% of total capital). If daily losses hit this limit, the platform temporarily locks new automated entries to prevent emotional over-trading."
  }
];

export const GlossaryModal: React.FC = () => {
  const { isGlossaryOpen, setIsGlossaryOpen, refreshAll } = useApp();

  useEffect(() => {
    if (isGlossaryOpen) {
      // Auto unlock 'market_explorer' badge
      api.unlockAchievement('market_explorer').catch(() => {});
    }
  }, [isGlossaryOpen]);

  if (!isGlossaryOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl max-h-[85vh] rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl flex flex-col">
        <button
          onClick={() => setIsGlossaryOpen(false)}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4 shrink-0">
          <div className="p-2.5 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Trading Glossary & Concept Guide
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Plain-English explanations of technical indicators, tokens, and risk controls
            </p>
          </div>
        </div>

        <div className="overflow-y-auto space-y-3 pr-1 text-xs">
          {GLOSSARY_TERMS.map((item, i) => (
            <div
              key={i}
              className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800"
            >
              <div className="font-semibold text-slate-900 dark:text-slate-100 mb-1 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />
                {item.term}
              </div>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                {item.definition}
              </p>
            </div>
          ))}
        </div>

        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 mt-4 flex justify-between items-center text-[11px] text-slate-500 shrink-0">
          <span>Badge Unlocked: Market Explorer 🎓</span>
          <button
            onClick={() => setIsGlossaryOpen(false)}
            className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
};
