import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { PendingGraceBanner } from '../components/common/PendingGraceBanner';
import {
  Wallet,
  ArrowDownCircle,
  ArrowUpCircle,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  FileText,
  Clock
} from 'lucide-react';
import { WalletLedgerItem } from '../types';

export const WalletPage: React.FC = () => {
  const { wallet, refreshAll, showToast } = useApp();
  const [ledger, setLedger] = useState<WalletLedgerItem[]>([]);
  const [depositAmount, setDepositAmount] = useState('10');
  const [withdrawAmount, setWithdrawAmount] = useState('5');
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchLedger = async () => {
    try {
      const data = await api.getWalletLedger(50);
      setLedger(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchLedger();
  }, []);

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.depositSimulated(parseFloat(depositAmount));
      showToast(`Simulated credit grant (+${depositAmount} Tokens) credited to ledger.`, 'success');
      await refreshAll();
      await fetchLedger();
      setIsDepositOpen(false);
    } catch (err: any) {
      showToast(err.message || 'Deposit failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.withdrawSimulated(parseFloat(withdrawAmount));
      showToast(`Simulated token debit (-${withdrawAmount} Tokens) processed. Note: Demo sandbox only.`, 'info');
      await refreshAll();
      await fetchLedger();
      setIsWithdrawOpen(false);
    } catch (err: any) {
      showToast(err.message || 'Withdrawal failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PendingGraceBanner />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl glass-panel relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            Virtual Token Wallet & Auditable Ledger
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Strict double-entry ledger • 1 Token = ₹1,000 INR nominal demo valuation
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsDepositOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl gradient-badge-emerald text-xs font-semibold hover:brightness-110 transition-all shadow-md"
          >
            <ArrowDownCircle className="w-4 h-4" />
            <span>Top-Up Test Tokens</span>
          </button>

          <button
            onClick={() => setIsWithdrawOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-100/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors border border-slate-200/50 dark:border-slate-700/50 backdrop-blur-sm"
          >
            <ArrowUpCircle className="w-4 h-4" />
            <span>Simulate Debit</span>
          </button>
        </div>
      </div>

      {/* Prominent Legal Disclaimer Banner */}
      <div className="p-5 rounded-2xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900/60 backdrop-blur-md text-xs text-blue-900 dark:text-blue-200 flex items-start gap-3 shadow-sm">
        <ShieldCheck className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-sm">Simulated Accounting Safeguard Notice</p>
          <p className="text-[11px] text-blue-700 dark:text-blue-300 leading-relaxed">
            TradePilot tokens are strictly virtual accounting credits used to validate algorithmic trading and risk allocation without real-money exposure. Tokens have no legal tender status, represent no claim on monetary funds, and cannot be redeemed for fiat currency. Unrealized profits are never credited into spendable balance.
          </p>
        </div>
      </div>

      {/* Token Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl glass-panel relative overflow-hidden space-y-1 group">
          <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-blue-500/10 rounded-full blur-xl group-hover:bg-blue-500/20 transition-all" />
          <span className="text-xs text-slate-500 dark:text-slate-400">Total Solvency Balance</span>
          <div className="font-mono text-2xl font-bold text-slate-900 dark:text-white">
            {wallet?.total_tokens.toFixed(2)} <span className="text-sm font-normal text-slate-400">Tokens</span>
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">
            Nominal INR: ₹{wallet?.nominal_inr_value.toLocaleString('en-IN')}
          </div>
        </div>

        <div className="p-5 rounded-2xl glass-panel relative overflow-hidden space-y-1 group">
          <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-emerald-500/10 rounded-full blur-xl group-hover:bg-emerald-500/20 transition-all" />
          <span className="text-xs text-slate-500 dark:text-slate-400">Available to Allocate</span>
          <div className="font-mono text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {wallet?.available_tokens.toFixed(2)} <span className="text-sm font-normal text-slate-400">Tokens</span>
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Free for new strategy proposals
          </div>
        </div>

        <div className="p-5 rounded-2xl glass-panel relative overflow-hidden space-y-1 group">
          <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-amber-500/10 rounded-full blur-xl group-hover:bg-amber-500/20 transition-all" />
          <span className="text-xs text-slate-500 dark:text-slate-400">Allocated in Active Positions</span>
          <div className="font-mono text-2xl font-bold text-amber-500">
            {wallet?.allocated_tokens.toFixed(2)} <span className="text-sm font-normal text-slate-400">Tokens</span>
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Reserved margin protecting open exposure
          </div>
        </div>
      </div>

      {/* Immutable Ledger Table */}
      <div className="rounded-2xl glass-panel p-5 relative overflow-hidden space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-500" />
            Audit Ledger Transactions
          </h3>
          <span className="text-xs text-slate-400">
            Ledger-derived atomic balances
          </span>
        </div>

        <div className="overflow-x-auto text-xs font-mono">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-sans">
                <th className="pb-2.5">TX ID</th>
                <th className="pb-2.5">Type</th>
                <th className="pb-2.5">Description</th>
                <th className="pb-2.5">Amount (Tokens)</th>
                <th className="pb-2.5">Nominal INR</th>
                <th className="pb-2.5">Running Balance</th>
                <th className="pb-2.5 font-sans">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {ledger.map(tx => {
                const isPositive = tx.amount_tokens > 0;
                return (
                  <tr key={tx.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="py-3 font-semibold text-slate-700 dark:text-slate-300">
                      {tx.transaction_id}
                    </td>
                    <td className="py-3 font-sans">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {tx.tx_type}
                      </span>
                    </td>
                    <td className="py-3 font-sans text-slate-600 dark:text-slate-300 max-w-sm truncate">
                      {tx.description}
                    </td>
                    <td
                      className={`py-3 font-bold ${
                        isPositive ? 'text-emerald-500' : tx.amount_tokens < 0 ? 'text-red-500' : 'text-slate-400'
                      }`}
                    >
                      {isPositive ? '+' : ''}{tx.amount_tokens.toFixed(3)}
                    </td>
                    <td className="py-3">
                      ₹{tx.nominal_inr.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 font-bold text-slate-900 dark:text-white">
                      {tx.running_balance.toFixed(3)} Tokens
                    </td>
                    <td className="py-3 font-sans text-slate-400">
                      {new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Deposit Modal */}
      {isDepositOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Top-Up Virtual Test Tokens
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Grant additional test tokens to expand algorithmic strategy testing capacity.
            </p>
            <form onSubmit={handleDeposit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Tokens to Credit (Max 500)
                </label>
                <input
                  type="number"
                  min="1"
                  max="500"
                  value={depositAmount}
                  onChange={e => setDepositAmount(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
                  required
                />
                <div className="text-[11px] text-slate-400 mt-1">
                  Equivalent Nominal: ₹{(parseFloat(depositAmount || '0') * 1000).toLocaleString('en-IN')}
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsDepositOpen(false)}
                  className="px-4 py-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700"
                >
                  {loading ? 'Crediting...' : 'Confirm Grant'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Simulated Withdrawal Demo Modal */}
      {isWithdrawOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Simulate Token Withdrawal
            </h3>
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-[11px] text-amber-700 dark:text-amber-300">
              Notice: This is an architectural simulation demonstrating ledger integrity and balance locking. No real INR or crypto payout occurs.
            </div>
            <form onSubmit={handleWithdraw} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Tokens to Debit
                </label>
                <input
                  type="number"
                  min="0.1"
                  step="0.1"
                  max={wallet?.available_tokens || 40}
                  value={withdrawAmount}
                  onChange={e => setWithdrawAmount(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsWithdrawOpen(false)}
                  className="px-4 py-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 rounded-lg bg-slate-900 dark:bg-slate-700 text-white font-semibold hover:bg-slate-800"
                >
                  {loading ? 'Processing...' : 'Simulate Debit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
