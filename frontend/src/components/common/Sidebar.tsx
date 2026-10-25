import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  CandlestickChart,
  Cpu,
  PieChart,
  ListOrdered,
  Wallet,
  CalendarClock,
  BarChart3,
  Award,
  Settings,
  BookOpen,
  Sparkles
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

const NAV_ITEMS = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/trading', label: 'Trading', icon: CandlestickChart },
  { path: '/strategies', label: 'Strategies', icon: Cpu },
  { path: '/portfolio', label: 'Portfolio', icon: PieChart },
  { path: '/orders', label: 'Orders', icon: ListOrdered },
  { path: '/wallet', label: 'Token Wallet', icon: Wallet },
  { path: '/sessions', label: 'Scheduler', icon: CalendarClock },
  { path: '/analytics', label: 'Analytics', icon: BarChart3 },
  { path: '/achievements', label: 'Achievements', icon: Award },
  { path: '/settings', label: 'Settings', icon: Settings },
];

export const Sidebar: React.FC = () => {
  const { experienceLevel, setIsGlossaryOpen, setIsOnboardingOpen } = useApp();

  return (
    <aside className="w-64 shrink-0 glass-panel border-r border-white/60 dark:border-white/10 flex flex-col justify-between py-5 transition-all duration-200">
      <div className="px-3.5 space-y-1.5">
        <div className="px-3 pb-2 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
          Platform Menu
        </div>
        {NAV_ITEMS.map(item => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white shadow-md shadow-blue-500/25'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white backdrop-blur-sm'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </div>

      {/* Bottom Education Card */}
      <div className="px-3.5 pt-4 border-t border-slate-200/60 dark:border-white/10 space-y-2">
        <div className="p-3.5 rounded-2xl bg-white/50 dark:bg-slate-800/40 backdrop-blur-md border border-slate-200/80 dark:border-white/10 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-bold text-blue-600 dark:text-blue-400 mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span className="capitalize">{experienceLevel} Mode</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed mb-3">
            {experienceLevel === 'beginner'
              ? 'Plain-English signals & defensive safety rails active.'
              : experienceLevel === 'medium'
              ? 'Configurable indicator parameters & backtesting active.'
              : 'Full long/short conditions & exchange logs active.'}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setIsGlossaryOpen(true)}
              className="flex-1 py-1.5 px-2 text-[11px] font-semibold rounded-lg bg-white dark:bg-slate-700/80 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 hover:bg-slate-50 text-center transition-colors shadow-xs"
            >
              Glossary
            </button>
            <button
              onClick={() => setIsOnboardingOpen(true)}
              className="flex-1 py-1.5 px-2 text-[11px] font-semibold rounded-lg bg-white dark:bg-slate-700/80 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 hover:bg-slate-50 text-center transition-colors shadow-xs"
            >
              Tour
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};
