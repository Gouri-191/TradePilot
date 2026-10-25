import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { PendingGraceBanner } from '../components/common/PendingGraceBanner';
import {
  PieChart,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  AlertTriangle,
  Wallet,
  Activity
} from 'lucide-react';
import { Position } from '../types';

export const PortfolioPage: React.FC = () => {
  const { wallet, userConfig, refreshAll, showToast } = useApp();
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchPositions = async () => {
    try {
      const data = await api.getPositions('open');
      setPositions(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchPositions();
  }, []);

  const handleClose = async (id: string) => {
    try {
      await api.closePosition(id, 'Closed from Portfolio');
      showToast('Position closed. Ledger updated.', 'success');
      await refreshAll();
      await fetchPositions();
    } catch (e: any) {
      showToast(e.message || 'Failed to close position', 'error');
    }
  };

  const totalTokens = wallet?.total_tokens || 40.0;
  const allocatedTokens = wallet?.allocated_tokens || 0.0;
  const availableTokens = wallet?.available_tokens || 40.0;
  const exposurePct = totalTokens > 0 ? (allocatedTokens / totalTokens) * 100 : 0;
  const maxExposureLimit = userConfig?.max_gross_exposure_pct || 20.0;

  return (
    <div className="space-y-6">
      <PendingGraceBanner />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl glass-panel relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            Portfolio & Margin Exposure
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Transparent asset allocation and real-time capital solvency
          </p>
        </div>

        <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200/50 dark:border-slate-700/50 backdrop-blur-sm text-xs font-mono font-medium">
          <Wallet className="w-3.5 h-3.5 text-blue-500" />
          <span>Nominal Rate: ₹1,000 / Token</span>
        </div>
      </div>

      {/* Exposure Gauges */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        {/* Gauge 1: Capital Allocation */}
        <div className="p-5 rounded-2xl glass-panel relative overflow-hidden space-y-3">
          <div className="flex justify-between items-center text-slate-500 dark:text-slate-400">
            <span>Capital Allocation</span>
            <span className="font-mono font-bold text-slate-900 dark:text-white">
              {exposurePct.toFixed(1)}% / {maxExposureLimit}%
            </span>
          </div>
          {/* Progress bar */}
          <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                exposurePct > maxExposureLimit ? 'bg-rose-500' : 'bg-gradient-to-r from-blue-600 to-indigo-600'
              }`}
              style={{ width: `${Math.min(100, (exposurePct / maxExposureLimit) * 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] text-slate-400">
            <span>Allocated: {allocatedTokens.toFixed(2)} Tokens</span>
            <span>Available: {availableTokens.toFixed(2)} Tokens</span>
          </div>
        </div>

        {/* Gauge 2: Daily Loss vs Circuit Breaker */}
        <div className="p-5 rounded-2xl glass-panel relative overflow-hidden space-y-3">
          <div className="flex justify-between items-center text-slate-500 dark:text-slate-400">
            <span>Daily Circuit Breaker</span>
            <span className="font-mono font-bold text-slate-900 dark:text-white">
              Limit: {userConfig?.daily_loss_limit_pct || 2.0}%
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-300"
              style={{ width: '12%' }}
            />
          </div>
          <div className="flex justify-between text-[11px] text-slate-400">
            <span>Risk Status: Safe</span>
            <span className="text-emerald-500 font-semibold">Circuit Intact</span>
          </div>
        </div>

        {/* Gauge 3: Total Equity Nominal */}
        <div className="p-5 rounded-2xl glass-panel relative overflow-hidden space-y-1">
          <span className="text-slate-500 dark:text-slate-400">Total Nominal Valuation</span>
          <div className="font-mono text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-300 bg-clip-text text-transparent">
            ₹{wallet?.nominal_inr_value.toLocaleString('en-IN') || '40,000'}
          </div>
          <p className="text-[11px] text-slate-400">
            Simulated evaluation units for algorithmic execution testing.
          </p>
        </div>
      </div>

      {/* Open Positions Detailed Table */}
      <div className="rounded-2xl glass-panel p-5 relative overflow-hidden space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
          Active Positions Breakdown
        </h3>

        {positions.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-400">
            No active positions currently open.
          </div>
        ) : (
          <div className="overflow-x-auto text-xs font-mono">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-200/80 dark:border-slate-800 text-slate-400 font-sans">
                  <th className="pb-2.5">Position</th>
                  <th className="pb-2.5">Entry</th>
                  <th className="pb-2.5">Current Mark</th>
                  <th className="pb-2.5">Margin Allocated</th>
                  <th className="pb-2.5">Stop-Loss</th>
                  <th className="pb-2.5">Take-Profit</th>
                  <th className="pb-2.5">Unrealized P&L</th>
                  <th className="pb-2.5 text-right font-sans">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {positions.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 font-sans font-semibold">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold mr-2 ${
                          p.side === 'buy'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        {p.side}
                      </span>
                      {p.quantity} {p.symbol}
                    </td>
                    <td className="py-3">${p.entry_price?.toLocaleString()}</td>
                    <td className="py-3">${p.current_price?.toLocaleString()}</td>
                    <td className="py-3">{p.margin_allocated} Tokens</td>
                    <td className="py-3 text-amber-500">${p.stop_loss?.toLocaleString() || '-'}</td>
                    <td className="py-3 text-blue-500">${p.take_profit?.toLocaleString() || '-'}</td>
                    <td
                      className={`py-3 font-bold ${
                        p.unrealized_pnl >= 0 ? 'text-emerald-500' : 'text-rose-500'
                      }`}
                    >
                      {p.unrealized_pnl >= 0 ? '+' : ''}{p.unrealized_pnl.toFixed(3)} Tokens
                    </td>
                    <td className="py-3 text-right font-sans">
                      <button
                        onClick={() => handleClose(p.id)}
                        className="px-3 py-1 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-xs font-semibold transition-all border border-rose-200/50 dark:border-rose-800/40"
                      >
                        Close Market
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
