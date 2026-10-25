import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { PendingGraceBanner } from '../components/common/PendingGraceBanner';
import { BarChart3, TrendingUp, ShieldAlert, Award, Clock, DollarSign, Activity } from 'lucide-react';

export const AnalyticsPage: React.FC = () => {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    api.getAnalytics().then(setData).catch(console.error);
  }, []);

  if (!data) {
    return <div className="text-center py-20 text-xs text-slate-400">Loading performance analytics...</div>;
  }

  const { summary, equity_curve, strategy_performance } = data;

  return (
    <div className="space-y-6">
      <PendingGraceBanner />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl glass-panel relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            Performance & Risk Analytics
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Transparent execution statistics, drawdown profile, and strategy attribution
          </p>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
        <div className="p-5 rounded-2xl glass-panel relative overflow-hidden space-y-1 group">
          <div className="absolute -right-4 -bottom-4 w-16 h-16 bg-emerald-500/10 rounded-full blur-xl group-hover:bg-emerald-500/20 transition-all" />
          <span className="text-slate-400">Win Rate</span>
          <div className="font-mono text-2xl font-bold text-emerald-500">
            {summary.win_rate_pct}%
          </div>
          <span className="text-[11px] text-slate-500">{summary.total_trades} Completed Fills</span>
        </div>

        <div className="p-5 rounded-2xl glass-panel relative overflow-hidden space-y-1 group">
          <div className="absolute -right-4 -bottom-4 w-16 h-16 bg-blue-500/10 rounded-full blur-xl group-hover:bg-blue-500/20 transition-all" />
          <span className="text-slate-400">Profit Factor</span>
          <div className="font-mono text-2xl font-bold text-blue-500">
            {summary.profit_factor}
          </div>
          <span className="text-[11px] text-slate-500">Sharpe Ratio: {summary.sharpe_ratio}</span>
        </div>

        <div className="p-5 rounded-2xl glass-panel relative overflow-hidden space-y-1 group">
          <div className="absolute -right-4 -bottom-4 w-16 h-16 bg-amber-500/10 rounded-full blur-xl group-hover:bg-amber-500/20 transition-all" />
          <span className="text-slate-400">Max Drawdown</span>
          <div className="font-mono text-2xl font-bold text-amber-500">
            {summary.max_drawdown_pct}%
          </div>
          <span className="text-[11px] text-slate-500">Protected by circuit breaker</span>
        </div>

        <div className="p-5 rounded-2xl glass-panel relative overflow-hidden space-y-1 group">
          <div className="absolute -right-4 -bottom-4 w-16 h-16 bg-indigo-500/10 rounded-full blur-xl group-hover:bg-indigo-500/20 transition-all" />
          <span className="text-slate-400">Execution Slippage</span>
          <div className="font-mono text-2xl font-bold text-slate-700 dark:text-slate-200">
            {summary.slippage_avg_pct}%
          </div>
          <span className="text-[11px] text-slate-500">Fees: {summary.fees_paid_tokens} Tokens</span>
        </div>
      </div>

      {/* Equity Curve Progression */}
      <div className="rounded-2xl glass-panel p-5 relative overflow-hidden space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
          Historical Equity Growth (Simulated Ledger)
        </h3>

        {/* Minimal Bar/Line Visualization */}
        <div className="h-48 flex items-end gap-2 pt-6 pb-2 px-2 border-b border-slate-100 dark:border-slate-800">
          {equity_curve.map((pt: any, i: number) => {
            const height = Math.min(100, Math.max(15, (pt.tokens - 38) * 18));
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1.5 group">
                <div className="text-[10px] font-mono text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                  {pt.tokens}
                </div>
                <div
                  className="w-full rounded-t bg-gradient-to-t from-blue-600 to-indigo-500 group-hover:from-blue-500 group-hover:to-indigo-400 transition-all shadow-sm"
                  style={{ height: `${height}%` }}
                />
                <span className="text-[10px] text-slate-400 truncate w-full text-center">
                  {pt.date}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Strategy Comparison Breakdown */}
      <div className="rounded-2xl glass-panel p-5 relative overflow-hidden space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
          Strategy Attribution Comparison
        </h3>

        <div className="overflow-x-auto text-xs font-mono">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-sans">
                <th className="pb-2.5">Strategy Name</th>
                <th className="pb-2.5">Total Trades</th>
                <th className="pb-2.5">Win Rate</th>
                <th className="pb-2.5">Profit Factor</th>
                <th className="pb-2.5 text-right">Net Realized P&L</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {strategy_performance.map((st: any, i: number) => (
                <tr key={i}>
                  <td className="py-3 font-sans font-semibold text-slate-800 dark:text-slate-200">
                    {st.name}
                  </td>
                  <td className="py-3">{st.trades}</td>
                  <td className="py-3 text-emerald-500">{st.win_rate}%</td>
                  <td className="py-3">{st.profit_factor}</td>
                  <td className="py-3 text-right font-bold text-emerald-500">
                    +{st.net_pnl_tokens} Tokens
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
