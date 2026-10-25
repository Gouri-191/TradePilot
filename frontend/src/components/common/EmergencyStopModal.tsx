import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';
import { ShieldAlert, AlertTriangle, CheckCircle, X } from 'lucide-react';

export const EmergencyStopModal: React.FC = () => {
  const {
    isEmergencyModalOpen,
    setIsEmergencyModalOpen,
    emergencyStopActive,
    refreshAll,
    showToast
  } = useApp();

  const [policy, setPolicy] = useState<'market_close' | 'keep_protective_stop'>('market_close');
  const [loading, setLoading] = useState(false);

  if (!isEmergencyModalOpen) return null;

  const handleTrigger = async () => {
    setLoading(true);
    try {
      await api.triggerEmergencyStop(policy, 'Manual Emergency Stop triggered via dashboard');
      showToast('EMERGENCY STOP ACTIVATED: All automation halted and orders cancelled.', 'error');
      await refreshAll();
      setIsEmergencyModalOpen(false);
    } catch (e: any) {
      showToast(e.message || 'Failed to trigger emergency stop', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    setLoading(true);
    try {
      await api.resetEmergencyStop();
      showToast('Emergency Stop cleared. Trading permissions restored.', 'success');
      await refreshAll();
      setIsEmergencyModalOpen(false);
    } catch (e: any) {
      showToast(e.message || 'Failed to reset emergency stop', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl">
        <button
          onClick={() => setIsEmergencyModalOpen(false)}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 rounded-xl bg-red-100 dark:bg-red-950/80 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {emergencyStopActive ? 'Emergency Stop Status' : 'Emergency Stop Safety System'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Instant circuit-breaker and order intervention
            </p>
          </div>
        </div>

        {emergencyStopActive ? (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-xs text-red-700 dark:text-red-300">
              <p className="font-semibold mb-1">System is currently in Emergency Halted State</p>
              <ul className="list-disc pl-4 space-y-1">
                <li>All automated strategy entries are blocked.</li>
                <li>Pending order proposals and open exchange orders were cancelled.</li>
                <li>Resume requires your explicit authorization below.</li>
              </ul>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setIsEmergencyModalOpen(false)}
                className="px-4 py-2 text-xs font-medium rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Keep Halted
              </button>
              <button
                onClick={handleReset}
                disabled={loading}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
              >
                {loading ? 'Restoring...' : 'Reset Emergency Stop & Resume'}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Triggering Emergency Stop immediately halts all active strategy loops, blocks new order proposals, and cancels all queued or open orders.
            </p>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Open Positions Policy:
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPolicy('market_close')}
                  className={`p-3 text-left rounded-xl border text-xs transition-all ${
                    policy === 'market_close'
                      ? 'border-red-500 bg-red-50/50 dark:bg-red-950/30 text-red-700 dark:text-red-300'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="font-semibold mb-1">Market Close All</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Immediately exit all open positions at market price.
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setPolicy('keep_protective_stop')}
                  className={`p-3 text-left rounded-xl border text-xs transition-all ${
                    policy === 'keep_protective_stop'
                      ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="font-semibold mb-1">Keep Protective Stops</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Halt entries, but let existing positions exit via Stop-Loss.
                  </div>
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsEmergencyModalOpen(false)}
                className="px-4 py-2 text-xs font-medium rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleTrigger}
                disabled={loading}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors"
              >
                {loading ? 'Activating...' : 'Confirm Emergency Stop'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
