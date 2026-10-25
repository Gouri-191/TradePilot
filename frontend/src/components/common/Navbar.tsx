import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import {
  ShieldAlert,
  Sun,
  Moon,
  HelpCircle,
  Activity,
  Layers,
  ChevronDown,
  User,
  LogOut,
  Clock
} from 'lucide-react';
import { ExperienceLevel } from '../../types';

export const Navbar: React.FC = () => {
  const {
    theme,
    toggleTheme,
    user,
    experienceLevel,
    setExperienceLevel,
    tradingProfile,
    wallet,
    ticker,
    setIsEmergencyModalOpen,
    setIsGlossaryOpen,
    setIsOnboardingOpen,
    setIsAuthModalOpen,
    setIsTierUpgradeModalOpen,
    logoutUser,
    emergencyStopActive
  } = useApp();

  const [istTime, setIstTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setIstTime(
        now.toLocaleTimeString('en-IN', {
          timeZone: 'Asia/Kolkata',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-white/60 dark:border-white/10 shadow-sm transition-all duration-200">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6">
        {/* Left: Brand & Status */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 text-white font-extrabold shadow-md shadow-blue-500/25 tracking-wider">
              TP
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 dark:from-blue-400 dark:via-indigo-300 dark:to-cyan-400 bg-clip-text text-transparent font-extrabold">
                  TradePilot
                </span>
                <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-300 border border-blue-500/20 backdrop-blur-md">
                  Testnet
                </span>
              </span>
            </div>
          </div>

          {/* Live Market Ticker Mini Pill */}
          {ticker && (
            <div className="hidden lg:flex items-center gap-2 pl-4 border-l border-slate-200/60 dark:border-slate-800/80 text-xs">
              <span className="font-semibold text-slate-500 dark:text-slate-400">BTC/USD:</span>
              <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                ${ticker.mark_price?.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Delta Feed
              </span>
            </div>
          )}

          {/* Real-time Indian Standard Time (IST) Clock */}
          {istTime && (
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200/70 dark:border-slate-700/60 text-xs font-mono shadow-sm">
              <Clock className="w-3.5 h-3.5 text-blue-500 animate-pulse" />
              <span className="text-[10px] uppercase font-bold text-slate-400">IST:</span>
              <span className="font-bold text-slate-900 dark:text-slate-100 tracking-wide">{istTime}</span>
            </div>
          )}
        </div>

        {/* Right: Controls & Actions */}
        <div className="flex items-center gap-3">
          {/* User Account / Auth Button */}
          {user ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/60 dark:bg-slate-800/60 border border-slate-200/80 dark:border-white/10 text-xs">
              <div className="w-6 h-6 rounded-lg gradient-badge-blue flex items-center justify-center text-[11px] font-bold text-white uppercase">
                {user.username.charAt(0)}
              </div>
              <div className="hidden sm:block text-left">
                <div className="font-bold text-slate-900 dark:text-white leading-tight">
                  {user.username}
                </div>
                <div className="text-[10px] text-blue-500 uppercase font-semibold">
                  {user.experience_level} Tier
                </div>
              </div>
              <button
                onClick={logoutUser}
                title="Log Out"
                className="p-1 text-slate-400 hover:text-rose-500 rounded transition-colors ml-1"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl gradient-badge-blue text-white text-xs font-semibold shadow-md hover:brightness-110 transition-all"
            >
              <User className="w-3.5 h-3.5" />
              <span>Sign In / Register</span>
            </button>
          )}

          {/* User Experience Tier Switcher */}
          <div className="flex items-center bg-white/50 dark:bg-slate-800/60 backdrop-blur-md p-1 rounded-xl border border-slate-200/80 dark:border-white/10 shadow-inner">
            {(['beginner', 'medium', 'pro'] as ExperienceLevel[]).map(lvl => (
              <button
                key={lvl}
                onClick={() => setExperienceLevel(lvl)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg capitalize transition-all duration-150 ${
                  experienceLevel === lvl
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>

          {/* Wallet Balance Widget */}
          {wallet && (
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/60 dark:bg-slate-800/60 backdrop-blur-md border border-slate-200/80 dark:border-white/10 text-xs shadow-sm">
              <div className="text-right">
                <div className="font-mono font-bold text-slate-900 dark:text-slate-100">
                  {wallet.total_tokens.toFixed(2)} Tokens
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                  ~₹{wallet.nominal_inr_value.toLocaleString('en-IN')} nominal
                </div>
              </div>
            </div>
          )}

          {/* Guide / Glossary Trigger */}
          <button
            onClick={() => setIsGlossaryOpen(true)}
            className="p-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 rounded-xl hover:bg-white/60 dark:hover:bg-slate-800/60 backdrop-blur-md transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
            title="Trading Glossary & Strategy Concepts"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          {/* Theme Switcher */}
          <button
            onClick={toggleTheme}
            className="p-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 rounded-xl hover:bg-white/60 dark:hover:bg-slate-800/60 backdrop-blur-md transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Theme`}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
          </button>

          {/* Emergency Stop Action Button */}
          <button
            onClick={() => setIsEmergencyModalOpen(true)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold shadow-md transition-all ${
              emergencyStopActive
                ? 'bg-gradient-to-r from-red-600 to-rose-700 text-white animate-pulse shadow-red-500/30'
                : 'bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30 backdrop-blur-md'
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            <span>{emergencyStopActive ? 'HALTED' : 'EMERGENCY STOP'}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
