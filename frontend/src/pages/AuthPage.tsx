import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  ShieldCheck, 
  ArrowRight, 
  Compass, 
  Sliders, 
  Activity, 
  Sun, 
  Moon,
  Lock,
  User,
  Mail,
  CheckCircle2
} from 'lucide-react';
import { ExperienceLevel } from '../types';

export const AuthPage: React.FC = () => {
  const { loginUser, registerUser, theme, toggleTheme } = useApp();
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>('beginner');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isRegister) {
        if (!username.trim() || !email.trim() || !password) {
          setError('Please fill in all registration fields.');
          setLoading(false);
          return;
        }
        await registerUser(username.trim(), email.trim(), password, experienceLevel);
      } else {
        if (!username.trim() || !password) {
          setError('Please enter your username and password.');
          setLoading(false);
          return;
        }
        await loginUser(username.trim(), password);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication error. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-between p-4 sm:p-8 bg-slate-50/90 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200 relative overflow-x-hidden bg-mesh-light dark:bg-mesh-dark">
      {/* Dynamic ambient lights */}
      <div className="fixed top-[-10%] left-[-5%] w-[45vw] h-[45vw] rounded-full bg-blue-500/15 dark:bg-blue-600/20 blur-[120px] pointer-events-none -z-10" />
      <div className="fixed bottom-[-10%] right-[-5%] w-[40vw] h-[40vw] rounded-full bg-purple-500/15 dark:bg-indigo-600/20 blur-[130px] pointer-events-none -z-10" />

      {/* Top Header Bar */}
      <div className="w-full max-w-5xl mx-auto flex items-center justify-between py-2">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 text-white shadow-lg shadow-blue-500/20">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-xl tracking-tight text-slate-900 dark:text-white">
                Trade<span className="text-blue-600 dark:text-blue-400">Pilot</span>
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                Delta Testnet
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
              Intelligent Crypto Algorithmic Automation • User-Controlled Risk
            </p>
          </div>
        </div>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 backdrop-blur-md shadow-sm transition-all"
          title="Toggle Light / Dark Theme"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>

      {/* Main Authentication Card */}
      <div className="w-full max-w-lg mx-auto my-auto py-8">
        <div className="relative rounded-3xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800/80 p-6 sm:p-8 backdrop-blur-xl shadow-2xl shadow-slate-950/10 dark:shadow-black/50">
          {/* Card Header & Tab Switch */}
          <div className="text-center mb-6">
            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {isRegister ? 'Create Your Account' : 'Sign In to TradePilot'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {isRegister
                ? 'Select your experience tier to customize indicators and explanations'
                : 'Enter your credentials to access your trading dashboard'}
            </p>

            <div className="mt-5 grid grid-cols-2 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80">
              <button
                type="button"
                onClick={() => { setIsRegister(false); setError(''); }}
                className={`py-2 text-xs font-bold rounded-lg transition-all ${
                  !isRegister
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { setIsRegister(true); setError(''); }}
                className={`py-2 text-xs font-bold rounded-lg transition-all ${
                  isRegister
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Create Account
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-400 font-medium">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Username or Email
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="Enter your username or email"
                  required
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all"
                />
              </div>
            </div>

            {isRegister && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="name@domain.com"
                    required
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all"
                />
              </div>
            </div>

            {/* Experience Level Selector (In Register mode) */}
            {isRegister && (
              <div className="pt-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Choose Starting Experience Level:
                </label>
                <div className="space-y-2">
                  {/* Beginner */}
                  <div
                    onClick={() => setExperienceLevel('beginner')}
                    className={`cursor-pointer p-3 rounded-xl border transition-all text-xs flex items-start gap-3 ${
                      experienceLevel === 'beginner'
                        ? 'bg-blue-500/10 border-blue-500 text-slate-900 dark:text-white shadow-sm'
                        : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                  >
                    <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-500 shrink-0 mt-0.5">
                      <Compass className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 dark:text-white">Beginner Tier</span>
                        {experienceLevel === 'beginner' && <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Plain-English trade explanations, guided automation, defensive risk rules (0.5% risk cap, strict SL).
                      </p>
                    </div>
                  </div>

                  {/* Medium */}
                  <div
                    onClick={() => setExperienceLevel('medium')}
                    className={`cursor-pointer p-3 rounded-xl border transition-all text-xs flex items-start gap-3 ${
                      experienceLevel === 'medium'
                        ? 'bg-blue-500/10 border-blue-500 text-slate-900 dark:text-white shadow-sm'
                        : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                  >
                    <div className="p-2 rounded-lg bg-blue-500/20 text-blue-500 shrink-0 mt-0.5">
                      <Sliders className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 dark:text-white">Medium Tier</span>
                        {experienceLevel === 'medium' && <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Technical indicator controls (EMA, RSI, ADX, ATR), configurable SL/TP targets, performance breakdowns.
                      </p>
                    </div>
                  </div>

                  {/* Pro */}
                  <div
                    onClick={() => setExperienceLevel('pro')}
                    className={`cursor-pointer p-3 rounded-xl border transition-all text-xs flex items-start gap-3 ${
                      experienceLevel === 'pro'
                        ? 'bg-blue-500/10 border-blue-500 text-slate-900 dark:text-white shadow-sm'
                        : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                  >
                    <div className="p-2 rounded-lg bg-purple-500/20 text-purple-500 shrink-0 mt-0.5">
                      <Activity className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 dark:text-white">Pro Tier</span>
                        {experienceLevel === 'pro' && <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Institutional quant metrics, Smart Money (SMC) liquidity sweeps, VWAP divergence, raw execution telemetry.
                      </p>
                    </div>
                  </div>
                </div>

                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-2 italic">
                  Note: Tier progression is non-automatic and requires verified qualification and explicit user consent.
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-4 py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50"
            >
              {loading ? 'Authenticating...' : isRegister ? 'Complete Registration & Enter' : 'Sign In to TradePilot'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick toggle at bottom */}
          <div className="mt-5 pt-4 border-t border-slate-200/60 dark:border-slate-800/60 text-center text-xs text-slate-500">
            {isRegister ? (
              <span>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => { setIsRegister(false); setError(''); }}
                  className="font-bold text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Sign In
                </button>
              </span>
            ) : (
              <span>
                Don't have an account yet?{' '}
                <button
                  type="button"
                  onClick={() => { setIsRegister(true); setError(''); }}
                  className="font-bold text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Create Account
                </button>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center py-2 text-xs text-slate-500 dark:text-slate-400">
        TradePilot Algorithmic Cryptocurrency Platform • Delta Exchange Testnet
      </div>
    </div>
  );
};
export default AuthPage;
