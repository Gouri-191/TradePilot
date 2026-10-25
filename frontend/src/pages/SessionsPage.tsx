import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { PendingGraceBanner } from '../components/common/PendingGraceBanner';
import {
  CalendarClock,
  Plus,
  Play,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Calendar,
  XCircle,
  Repeat,
  Zap
} from 'lucide-react';
import { TradingSession, Strategy } from '../types';

export const SessionsPage: React.FC = () => {
  const { refreshAll, showToast } = useApp();
  const [sessions, setSessions] = useState<TradingSession[]>([]);
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState('Asian Session Breakout');
  const [strategyId, setStrategyId] = useState('strat-ema-rsi');
  const [profile, setProfile] = useState<'defensive' | 'balanced' | 'active'>('balanced');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [maxRiskPct, setMaxRiskPct] = useState(0.5);
  const [maxLossTokens, setMaxLossTokens] = useState(2.0);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrencePattern, setRecurrencePattern] = useState('weekdays');
  const [startImmediately, setStartImmediately] = useState(false);

  const fetchSessions = async () => {
    try {
      const [sessData, stratData] = await Promise.all([
        api.getSessions(),
        api.getStrategies()
      ]);
      setSessions(sessData);
      setStrategies(stratData);
      if (stratData.length > 0 && !strategyId) {
        setStrategyId(stratData[0].id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const now = new Date();
      // If immediate, start from right now; else 1 minute from now
      const startTime = startImmediately ? now : new Date(now.getTime() + 60 * 1000);
      const endTime = new Date(startTime.getTime() + durationMinutes * 60 * 1000);

      await api.createSession({
        name,
        strategy_id: strategyId,
        profile,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        duration_minutes: durationMinutes,
        timezone: 'UTC',
        max_risk_pct: maxRiskPct,
        max_loss_tokens: maxLossTokens,
        is_recurring: isRecurring,
        recurrence_pattern: isRecurring ? recurrencePattern : null,
        start_immediately: startImmediately
      });

      if (startImmediately) {
        showToast(`⚡ Session '${name}' started immediately! Strategy is now actively scanning.`, 'success');
      } else {
        showToast(`Trading session '${name}' scheduled on backend.`, 'success');
      }
      await api.unlockAchievement('consistency_builder');
      await refreshAll();
      await fetchSessions();
      setIsModalOpen(false);
      setStartImmediately(false);
    } catch (err: any) {
      showToast(err.message || 'Failed to create session', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleStartNow = async (id: string, sessionName: string) => {
    setActionLoadingId(id);
    try {
      await api.startSessionNow(id);
      showToast(`⚡ Session '${sessionName}' started immediately! Engine is live.`, 'success');
      await refreshAll();
      await fetchSessions();
    } catch (e: any) {
      showToast(e.message || 'Failed to start session now', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCancel = async (id: string) => {
    setActionLoadingId(id);
    try {
      await api.cancelSession(id);
      showToast('Scheduled session cancelled', 'info');
      await refreshAll();
      await fetchSessions();
    } catch (e: any) {
      showToast(e.message || 'Failed to cancel', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <PendingGraceBanner />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl glass-panel relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            Automated Session Scheduler
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Schedule algorithmic sessions on backend timeframes without needing browser tabs open
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl gradient-badge-blue text-xs font-semibold hover:brightness-110 transition-all shadow-md"
        >
          <Plus className="w-4 h-4" />
          <span>Schedule New Session</span>
        </button>
      </div>

      {/* Prominent Disclaimer Notice */}
      <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/60 backdrop-blur-md text-xs text-amber-900 dark:text-amber-200 flex items-start gap-3 shadow-sm">
        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <p className="font-semibold text-sm">Automated Scheduling Notice</p>
          <p className="text-[11px] text-amber-700 dark:text-amber-300 leading-relaxed">
            Scheduled sessions do not guarantee profitable trading outcomes. When a session ends, the backend halts new trade entries while adhering to stop-loss protections on remaining positions.
          </p>
        </div>
      </div>

      {/* Sessions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sessions.map(s => {
          const isActive = s.status === 'active';
          const isUpcoming = s.status === 'upcoming';
          const isCompleted = s.status === 'completed';

          return (
            <div
              key={s.id}
              className={`p-5 rounded-2xl text-xs transition-all flex flex-col justify-between relative overflow-hidden ${
                isActive
                  ? 'glass-panel border-emerald-500/50 shadow-[0_8px_30px_rgba(16,185,129,0.15)] ring-1 ring-emerald-500/30'
                  : isUpcoming
                  ? 'glass-panel border-blue-500/40'
                  : 'glass-panel-hover'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      isActive
                        ? 'gradient-badge-emerald animate-pulse'
                        : isUpcoming
                        ? 'gradient-badge-blue'
                        : isCompleted
                        ? 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                        : 'gradient-badge-rose'
                    }`}
                  >
                    {s.status}
                  </span>
                  {s.is_recurring && (
                    <span className="flex items-center gap-1 text-[10px] text-slate-400">
                      <Repeat className="w-3 h-3" /> {s.recurrence_pattern}
                    </span>
                  )}
                </div>

                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                  {s.name}
                </h3>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono space-y-0.5 mb-3">
                  <div>Duration: {s.duration_minutes} minutes ({s.timezone})</div>
                  <div>Risk Limit: {s.max_risk_pct}% / trade</div>
                  <div>Max Loss Budget: {s.max_loss_tokens} Tokens</div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
                <span className="text-[11px] font-mono text-slate-400">
                  {new Date(s.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} &rarr; {new Date(s.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                
                <div className="flex items-center gap-1.5">
                  {isUpcoming && (
                    <button
                      onClick={() => handleStartNow(s.id, s.name)}
                      disabled={actionLoadingId === s.id}
                      className="px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-[11px] font-semibold transition-all shadow-sm flex items-center gap-1"
                      title="Launch this session right now without waiting"
                    >
                      <Zap className="w-3 h-3" />
                      <span>Start Now</span>
                    </button>
                  )}

                  {(isUpcoming || isActive) && (
                    <button
                      onClick={() => handleCancel(s.id)}
                      disabled={actionLoadingId === s.id}
                      className="px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 text-[11px] font-semibold hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors border border-rose-200/40"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* New Session Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Schedule Automated Trading Session
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              The backend will autonomously activate and halt the selected strategy within safe boundaries.
            </p>

            <form onSubmit={handleCreateSession} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Session Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Strategy
                  </label>
                  <select
                    value={strategyId}
                    onChange={e => setStrategyId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  >
                    {strategies.map(st => (
                      <option key={st.id} value={st.id}>
                        {st.name} ({st.symbol})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Duration (Minutes)
                  </label>
                  <input
                    type="number"
                    min="15"
                    max="720"
                    step="15"
                    value={durationMinutes}
                    onChange={e => setDurationMinutes(parseInt(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Max Risk / Trade (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="2.0"
                    value={maxRiskPct}
                    onChange={e => setMaxRiskPct(parseFloat(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Max Session Loss (Tokens)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={maxLossTokens}
                    onChange={e => setMaxLossTokens(parseFloat(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2 p-2 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/40">
                  <input
                    type="checkbox"
                    id="startNowCheck"
                    checked={startImmediately}
                    onChange={e => setStartImmediately(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 accent-emerald-600 cursor-pointer"
                  />
                  <label htmlFor="startNowCheck" className="text-emerald-900 dark:text-emerald-300 font-semibold cursor-pointer flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Start Session Right Now (Immediately)</span>
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="rec"
                    checked={isRecurring}
                    onChange={e => setIsRecurring(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 accent-blue-600"
                  />
                  <label htmlFor="rec" className="text-slate-700 dark:text-slate-300 font-medium cursor-pointer">
                    Repeat this session weekly (Recurring)
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className={`px-4 py-2 rounded-lg font-semibold text-white transition-all shadow-md flex items-center gap-1.5 ${
                    startImmediately
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {startImmediately ? <Zap className="w-3.5 h-3.5" /> : null}
                  <span>
                    {loading
                      ? (startImmediately ? 'Starting...' : 'Scheduling...')
                      : (startImmediately ? 'Start Session Now' : 'Save & Arm Schedule')}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
