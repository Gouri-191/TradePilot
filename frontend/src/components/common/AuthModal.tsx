import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ExperienceLevel } from '../../types';
import { Shield, Sparkles, User, Mail, Lock, CheckCircle2, X } from 'lucide-react';

export const AuthModal: React.FC = () => {
  const { isAuthModalOpen, setIsAuthModalOpen, loginUser, registerUser, showToast } = useApp();
  const [mode, setMode] = useState<'login' | 'register'>('register');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [tier, setTier] = useState<ExperienceLevel>('beginner');
  const [loading, setLoading] = useState(false);

  if (!isAuthModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === 'login') {
        await loginUser(username || email, password);
      } else {
        if (!email) {
          showToast('Email is required for registration', 'error');
          setLoading(false);
          return;
        }
        await registerUser(username, email, password, tier);
      }
    } catch (err: any) {
      showToast(err.message || 'Authentication failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-3xl glass-panel p-7 shadow-2xl relative overflow-hidden border border-white/20 dark:border-white/10">
        <div className="absolute -top-16 -right-16 w-48 h-48 bg-gradient-to-tr from-blue-600/30 to-indigo-600/30 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center justify-between pb-4 border-b border-slate-200/50 dark:border-slate-800/80 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl gradient-badge-blue flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/25">
              TP
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {mode === 'login' ? 'Sign In to TradePilot' : 'Create TradePilot Account'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {mode === 'login' ? 'Access your automated algorithmic trading terminal' : 'Choose your experience tier and initialize your virtual wallet'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsAuthModalOpen(false)}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 p-1 rounded-2xl bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 mb-5 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setMode('register')}
            className={`py-2.5 rounded-xl transition-all ${
              mode === 'register'
                ? 'gradient-badge-blue text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Create New Account
          </button>
          <button
            type="button"
            onClick={() => setMode('login')}
            className={`py-2.5 rounded-xl transition-all ${
              mode === 'login'
                ? 'gradient-badge-blue text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Sign In
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
              Username
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="e.g. SatoshiTrader"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 rounded-xl glass-input text-slate-900 dark:text-white"
                required
              />
            </div>
          </div>

          {mode === 'register' && (
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  placeholder="you@domain.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 rounded-xl glass-input text-slate-900 dark:text-white"
                  required
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 rounded-xl glass-input text-slate-900 dark:text-white"
                required
              />
            </div>
          </div>

          {/* Experience Level Selector for Registration */}
          {mode === 'register' && (
            <div className="space-y-2 pt-1">
              <label className="block text-slate-700 dark:text-slate-300 font-semibold">
                Select Your Initial Experience Level
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  {
                    id: 'beginner' as ExperienceLevel,
                    title: 'Beginner',
                    desc: 'Plain English signals, conservative 0.5% risk, safety bumpers'
                  },
                  {
                    id: 'medium' as ExperienceLevel,
                    title: 'Medium',
                    desc: 'Technical indicators, backtesting, manual tuning'
                  },
                  {
                    id: 'pro' as ExperienceLevel,
                    title: 'Pro',
                    desc: 'Raw math, order book depth, multi-strategy automation'
                  }
                ].map(t => (
                  <div
                    key={t.id}
                    onClick={() => setTier(t.id)}
                    className={`p-3 rounded-2xl cursor-pointer transition-all border text-left ${
                      tier === t.id
                        ? 'border-blue-500 bg-blue-50/40 dark:bg-blue-950/40 shadow-sm ring-1 ring-blue-500/50'
                        : 'border-slate-200/70 dark:border-slate-800 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-slate-900 dark:text-white text-xs">
                        {t.title}
                      </span>
                      {tier === t.id && <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />}
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                      {t.desc}
                    </p>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-slate-400 italic">
                *Note: You are never automatically promoted. Moving to Medium or Pro requires meeting learning milestones and your explicit consent.
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-2xl gradient-badge-blue text-white font-bold text-xs hover:brightness-110 transition-all shadow-lg shadow-blue-500/25 mt-2"
          >
            {loading ? 'Processing...' : mode === 'login' ? 'Sign In to TradePilot' : `Create Account with ${tier.toUpperCase()} Tier`}
          </button>
        </form>
      </div>
    </div>
  );
};
