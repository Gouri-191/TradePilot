import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ExperienceLevel } from '../../types';
import { ShieldCheck, Award, AlertTriangle, CheckSquare, Square, X, ArrowUpRight } from 'lucide-react';

export const TierUpgradeModal: React.FC = () => {
  const { isTierUpgradeModalOpen, setIsTierUpgradeModalOpen, experienceLevel, requestTierUpgrade } = useApp();
  const [targetTier, setTargetTier] = useState<ExperienceLevel>(experienceLevel === 'beginner' ? 'medium' : 'pro');
  const [consentAcknowledged, setConsentAcknowledged] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!isTierUpgradeModalOpen) return null;

  const handleUpgrade = async () => {
    if (!consentAcknowledged) return;
    setLoading(true);
    try {
      await requestTierUpgrade(targetTier);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-3xl glass-panel p-7 shadow-2xl relative overflow-hidden border border-white/20 dark:border-white/10 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200/50 dark:border-slate-800/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Explicit Experience Progression Protocol
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Current Tier: <span className="font-semibold uppercase text-blue-500">{experienceLevel}</span>
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsTierUpgradeModalOpen(false)}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Core Product Principle Alert */}
        <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/60 text-xs text-amber-900 dark:text-amber-200 space-y-1.5">
          <div className="flex items-center gap-1.5 font-bold">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <span>Strict Non-Automatic Promotion Rule</span>
          </div>
          <p className="text-[11px] leading-relaxed text-amber-800 dark:text-amber-300">
            TradePilot strictly forbids automatic promotions based simply on elapsed time or volume. Advancing to Medium or Pro requires verified risk discipline and your explicit informed consent.
          </p>
        </div>

        {/* Select Target Tier */}
        <div className="space-y-2 text-xs">
          <label className="block font-semibold text-slate-700 dark:text-slate-300">
            Select Desired Experience Tier
          </label>
          <div className="grid grid-cols-2 gap-3">
            <div
              onClick={() => setTargetTier('medium')}
              className={`p-3.5 rounded-2xl cursor-pointer border transition-all ${
                targetTier === 'medium'
                  ? 'border-blue-500 bg-blue-50/40 dark:bg-blue-950/40 ring-1 ring-blue-500/50'
                  : 'border-slate-200 dark:border-slate-800'
              }`}
            >
              <div className="font-bold text-slate-900 dark:text-white mb-1">Medium Tier</div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Unlock technical parameters (EMA, RSI, ADX, Donchian, Bollinger), backtest reports, and detailed order types.
              </p>
            </div>

            <div
              onClick={() => setTargetTier('pro')}
              className={`p-3.5 rounded-2xl cursor-pointer border transition-all ${
                targetTier === 'pro'
                  ? 'border-blue-500 bg-blue-50/40 dark:bg-blue-950/40 ring-1 ring-blue-500/50'
                  : 'border-slate-200 dark:border-slate-800'
              }`}
            >
              <div className="font-bold text-slate-900 dark:text-white mb-1">Pro Tier</div>
              <p className="text-[11px] text-slate-400">
                Full algorithmic autonomy, deep candlestick charts, order book analytics, multi-strategy scheduling.
              </p>
            </div>
          </div>
        </div>

        {/* Mandatory Explicit Consent Checkbox */}
        <div
          onClick={() => setConsentAcknowledged(!consentAcknowledged)}
          className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 cursor-pointer select-none"
        >
          {consentAcknowledged ? (
            <CheckSquare className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
          ) : (
            <Square className="w-5 h-5 text-slate-400 mt-0.5 shrink-0" />
          )}
          <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-snug">
            I confirm that I understand the technical risk parameters of the <span className="font-bold uppercase text-blue-500">{targetTier}</span> tier and give my explicit consent to upgrade my interface permissions.
          </p>
        </div>

        <div className="flex justify-end gap-2.5 pt-2">
          <button
            type="button"
            onClick={() => setIsTierUpgradeModalOpen(false)}
            className="px-4 py-2.5 rounded-xl text-slate-600 dark:text-slate-400 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Keep Current Tier
          </button>
          <button
            type="button"
            onClick={handleUpgrade}
            disabled={!consentAcknowledged || loading}
            className="px-5 py-2.5 rounded-xl gradient-badge-blue text-white text-xs font-bold hover:brightness-110 transition-all shadow-md disabled:opacity-50"
          >
            {loading ? 'Verifying Milestones...' : `Consent & Switch to ${targetTier.toUpperCase()}`}
          </button>
        </div>
      </div>
    </div>
  );
};
