import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';
import { Compass, ShieldCheck, Wallet, ArrowRight, Check, X } from 'lucide-react';
import { ExperienceLevel, TradingProfile } from '../../types';

export const OnboardingModal: React.FC = () => {
  const {
    isOnboardingOpen,
    setIsOnboardingOpen,
    setExperienceLevel,
    setTradingProfile,
    experienceLevel,
    tradingProfile,
    refreshAll,
    showToast
  } = useApp();

  const [step, setStep] = useState(1);
  const [selectedLevel, setSelectedLevel] = useState<ExperienceLevel>(experienceLevel || 'beginner');
  const [selectedProfile, setSelectedProfile] = useState<TradingProfile>(tradingProfile || 'balanced');

  if (!isOnboardingOpen) return null;

  const handleFinish = async () => {
    try {
      await api.updateSettings({
        experience_level: selectedLevel,
        trading_profile: selectedProfile,
        onboarding_completed: true
      });
      await api.unlockAchievement('first_steps');
      showToast('Welcome to TradePilot! First Steps badge unlocked.', 'success');
      await refreshAll();
      setIsOnboardingOpen(false);
    } catch (e: any) {
      showToast(e.message || 'Error completing onboarding', 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl">
        <button
          onClick={() => setIsOnboardingOpen(false)}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Step Indicator */}
        <div className="flex items-center justify-between mb-6 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Compass className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-bold text-slate-900 dark:text-white">
              Welcome to TradePilot
            </span>
          </div>
          <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
            Step {step} of 3
          </span>
        </div>

        {/* Step 1: Interface Tier */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">
                Select Your Trading Experience Tier
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                You can switch tiers at any time. Higher tiers give deeper technical control.
              </p>
            </div>

            <div className="space-y-2.5">
              {[
                {
                  id: 'beginner',
                  title: 'Beginner',
                  desc: 'Plain-English signals, defensive safety rails, simplified portfolio overview and automated 10-second grace reviews.'
                },
                {
                  id: 'medium',
                  title: 'Medium',
                  desc: 'Configurable EMA, RSI, ATR thresholds, interactive backtesting, and detailed signal diagnostics.'
                },
                {
                  id: 'pro',
                  title: 'Pro',
                  desc: 'Advanced technical indicators, long/short condition builders, execution slippage tracking, and raw exchange logs.'
                }
              ].map(item => (
                <div
                  key={item.id}
                  onClick={() => setSelectedLevel(item.id as ExperienceLevel)}
                  className={`p-3.5 rounded-xl border text-xs cursor-pointer transition-all ${
                    selectedLevel === item.id
                      ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-950/40 text-blue-900 dark:text-blue-100'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-sm capitalize">{item.title}</span>
                    {selectedLevel === item.id && <Check className="w-4 h-4 text-blue-600" />}
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-3">
              <button
                onClick={() => setStep(2)}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
              >
                <span>Continue</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Risk Profile */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">
                Choose Your Automation Risk Profile
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Controls risk per trade and daily loss circuit breakers.
              </p>
            </div>

            <div className="space-y-2.5">
              {[
                {
                  id: 'defensive',
                  title: 'Defensive Profile',
                  risk: '0.25% per trade',
                  loss: '1.0% daily cap',
                  desc: 'High capital preservation. Tight stop-loss and strict ADX trend filters.'
                },
                {
                  id: 'balanced',
                  title: 'Balanced Profile (Recommended)',
                  risk: '0.50% per trade',
                  loss: '2.0% daily cap',
                  desc: 'Optimal balance between trend capture and downside protection.'
                },
                {
                  id: 'active',
                  title: 'Active Profile',
                  risk: '1.00% per trade',
                  loss: '3.0% daily cap',
                  desc: 'Wider volatility tolerance for breakout capturing on Testnet.'
                }
              ].map(item => (
                <div
                  key={item.id}
                  onClick={() => setSelectedProfile(item.id as TradingProfile)}
                  className={`p-3.5 rounded-xl border text-xs cursor-pointer transition-all ${
                    selectedProfile === item.id
                      ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-950/40 text-blue-900 dark:text-blue-100'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-sm capitalize">{item.title}</span>
                    <span className="font-mono text-[11px] text-blue-600 dark:text-blue-400">
                      {item.risk}
                    </span>
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>

            <div className="flex justify-between pt-3">
              <button
                onClick={() => setStep(1)}
                className="px-4 py-2 text-xs font-medium rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Back
              </button>
              <button
                onClick={() => setStep(3)}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
              >
                <span>Continue</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Virtual Tokens & Control Assurance */}
        {step === 3 && (
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-start gap-3">
                <Wallet className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-slate-900 dark:text-slate-100">
                    40 Virtual Tokens Granted (~₹40,000 nominal)
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
                    Your account is credited with simulated testnet tokens to learn strategy dynamics safely.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-slate-900 dark:text-slate-100">
                    100% Mandatory Risk Checks & 10s Grace Period
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
                    Every order proposal gives you 10 seconds to edit or cancel. No trade ever enters without a mandatory Stop-Loss.
                  </p>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 dark:text-slate-500 italic text-center">
              Delta Exchange Testnet integration active. Real-money operations remain disabled for safety.
            </p>

            <div className="flex justify-between pt-3">
              <button
                onClick={() => setStep(2)}
                className="px-4 py-2 text-xs font-medium rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Back
              </button>
              <button
                onClick={handleFinish}
                className="flex items-center gap-1.5 px-5 py-2 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-md shadow-emerald-600/20"
              >
                <span>Launch TradePilot</span>
                <Check className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
