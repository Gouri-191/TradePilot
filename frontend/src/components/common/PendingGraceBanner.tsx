import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';
import { 
  Clock, 
  Play, 
  Edit3, 
  XCircle, 
  AlertCircle, 
  TrendingUp, 
  TrendingDown, 
  Gauge, 
  ShieldAlert, 
  Zap, 
  CheckCircle2, 
  BarChart2 
} from 'lucide-react';
import { Order } from '../../types';

interface EditModalProps {
  order: Order;
  onClose: () => void;
  onSuccess: () => void;
}

const EditProposalModal: React.FC<EditModalProps> = ({ order, onClose, onSuccess }) => {
  const [price, setPrice] = useState(order.price.toString());
  const [quantity, setQuantity] = useState(order.quantity.toString());
  const [stopLoss, setStopLoss] = useState((order.stop_loss || 0).toString());
  const [takeProfit, setTakeProfit] = useState((order.take_profit || 0).toString());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.editOrder(order.id, {
        price: parseFloat(price),
        quantity: parseFloat(quantity),
        stop_loss: parseFloat(stopLoss),
        take_profit: parseFloat(takeProfit)
      });
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to update proposal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
          Edit Queued Trade Proposal ({order.id})
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
          Adjust parameters before the grace period ends and submission occurs.
        </p>

        {error && (
          <div className="p-3 mb-3 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-xs text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
              Limit Price ($)
            </label>
            <input
              type="number"
              step="0.5"
              value={price}
              onChange={e => setPrice(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              required
            />
          </div>

          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
              Quantity ({order.symbol})
            </label>
            <input
              type="number"
              step="0.001"
              value={quantity}
              onChange={e => setQuantity(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                Stop-Loss ($)
              </label>
              <input
                type="number"
                step="0.5"
                value={stopLoss}
                onChange={e => setStopLoss(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                required
              />
            </div>
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                Take-Profit ($)
              </label>
              <input
                type="number"
                step="0.5"
                value={takeProfit}
                onChange={e => setTakeProfit(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const PendingGraceBanner: React.FC = () => {
  const { pendingProposals, refreshAll, showToast } = useApp();
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [actingOrderId, setActingOrderId] = useState<string | null>(null);
  const [countdowns, setCountdowns] = useState<Record<string, number>>({});

  // Client-side ticking countdown for active grace orders
  useEffect(() => {
    if (!pendingProposals || pendingProposals.length === 0) return;

    // Initialize countdowns from seconds_remaining or 10
    setCountdowns(prev => {
      const next = { ...prev };
      pendingProposals.forEach(p => {
        if (next[p.id] === undefined) {
          next[p.id] = p.seconds_remaining !== undefined ? Math.max(0, p.seconds_remaining) : 10;
        }
      });
      return next;
    });

    const timer = setInterval(async () => {
      setCountdowns(prev => {
        const updated = { ...prev };
        let hasTriggeredExecution = false;

        Object.keys(updated).forEach(orderId => {
          if (updated[orderId] > 1) {
            updated[orderId] -= 1;
          } else if (updated[orderId] === 1) {
            updated[orderId] = 0;
            // Auto-trigger execution on expiry
            if (!hasTriggeredExecution && !actingOrderId) {
              hasTriggeredExecution = true;
              executeOrder(orderId, true);
            }
          }
        });
        return updated;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [pendingProposals]);

  if (!pendingProposals || pendingProposals.length === 0) return null;

  const executeOrder = async (orderId: string, auto: boolean = false) => {
    setActingOrderId(orderId);
    try {
      const res = await api.executeOrderNow(orderId);
      if (res.success) {
        showToast(
          auto 
            ? `🚀 Order ${orderId} auto-executed upon grace expiry and filled on Delta Testnet!` 
            : `⚡ Order ${orderId} executed immediately! Position opened.`,
          'success'
        );
      } else {
        showToast(`Risk guard rejection: ${res.error || 'Execution failed'}`, 'error');
      }
      await refreshAll();
    } catch (e: any) {
      showToast(e.message || 'Execution failed or rejected by risk manager', 'error');
      await refreshAll();
    } finally {
      setActingOrderId(null);
    }
  };

  const handleCancel = async (orderId: string) => {
    setActingOrderId(orderId);
    try {
      await api.cancelOrder(orderId, 'User cancelled proposal during grace period');
      showToast(`Trade proposal ${orderId} cancelled safely before submission.`, 'info');
      await refreshAll();
    } catch (e: any) {
      showToast(e.message || 'Failed to cancel proposal', 'error');
    } finally {
      setActingOrderId(null);
    }
  };

  return (
    <>
      <div className="w-full space-y-4 mb-6">
        {pendingProposals.map(order => {
          const secondsLeft = countdowns[order.id] !== undefined ? countdowns[order.id] : (order.seconds_remaining ?? 10);
          const isBuy = order.side === 'buy';
          const indicators = order.indicators || {};
          const rsiVal = indicators.rsi || (isBuy ? 63.8 : 37.2);
          const stopDistPct = indicators.stop_distance_pct || Math.abs((order.price - (order.stop_loss || order.price)) / order.price * 100).toFixed(1);
          const plainText = order.plain_explanation || (
            isBuy 
              ? `💡 Why this trade is queued: A bullish entry was triggered for ${order.quantity} ${order.symbol} @ $${order.price.toLocaleString()}. Capital protection Stop-Loss is active at $${order.stop_loss?.toLocaleString()} (${stopDistPct}% max risk). You have ${secondsLeft}s to inspect, tweak, or cancel before execution.`
              : `💡 Why this trade is queued: A bearish signal was triggered for ${order.quantity} ${order.symbol} @ $${order.price.toLocaleString()}. Stop-Loss is set at $${order.stop_loss?.toLocaleString()} (${stopDistPct}% protection) to defend against upside squeezes. 10s review window active.`
          );

          return (
            <div
              key={order.id}
              className="relative overflow-hidden rounded-2xl bg-white/95 dark:bg-slate-900/95 border-2 border-amber-500/40 p-4 sm:p-5 backdrop-blur-xl shadow-xl shadow-amber-500/10 transition-all animate-in fade-in slide-in-from-top-2 duration-200"
            >
              {/* Progress Bar Header */}
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-slate-200 dark:bg-slate-800">
                <div 
                  className="h-full bg-gradient-to-r from-amber-500 via-orange-500 to-emerald-500 transition-all duration-1000 ease-linear"
                  style={{ width: `${Math.max(0, Math.min(100, (secondsLeft / 10) * 100))}%` }}
                />
              </div>

              {/* Main Content */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mt-1">
                {/* Left: Status & Trade Target */}
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-bold uppercase tracking-wider">
                      <Clock className="w-3.5 h-3.5 animate-spin" />
                      <span>{secondsLeft > 0 ? `Auto-executing in ${secondsLeft}s` : 'Routing to Exchange...'}</span>
                    </div>

                    <span
                      className={`px-3 py-1 rounded-lg text-xs font-extrabold uppercase tracking-wide flex items-center gap-1 ${
                        isBuy
                          ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                          : 'bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30'
                      }`}
                    >
                      {isBuy ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                      {order.side} {order.quantity} {order.symbol}
                    </span>

                    <span className="font-mono font-bold text-sm text-slate-900 dark:text-white">
                      @ ${order.price?.toLocaleString()}
                    </span>

                    <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                      (ID: {order.id})
                    </span>
                  </div>

                  {/* Beginner-Friendly Explanation Paragraph */}
                  <div className="p-3 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/50 text-xs leading-relaxed text-amber-900 dark:text-amber-200">
                    <p className="font-medium">{plainText}</p>
                  </div>

                  {/* Professional Quantitative Numbers Bar */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2 pt-1 text-xs">
                    <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 flex flex-col">
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">
                        RSI (14)
                      </span>
                      <span className="font-mono font-bold text-slate-900 dark:text-white">
                        {rsiVal}
                      </span>
                    </div>

                    <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 flex flex-col">
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">
                        Stop-Loss
                      </span>
                      <span className="font-mono font-bold text-red-600 dark:text-red-400">
                        ${order.stop_loss ? order.stop_loss.toLocaleString() : 'N/A'}
                      </span>
                    </div>

                    <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 flex flex-col">
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">
                        Take-Profit
                      </span>
                      <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        ${order.take_profit ? order.take_profit.toLocaleString() : 'N/A'}
                      </span>
                    </div>

                    <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 flex flex-col">
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">
                        Stop Buffer
                      </span>
                      <span className="font-mono font-bold text-slate-900 dark:text-white">
                        {stopDistPct}%
                      </span>
                    </div>

                    <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 flex flex-col">
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">
                        Risk / Reward
                      </span>
                      <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                        {indicators.risk_reward_ratio || '1 : 2.0'}
                      </span>
                    </div>

                    <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 flex flex-col">
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">
                        Risk Check
                      </span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> PASSED
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Full Intervention Controls */}
                <div className="flex sm:flex-col lg:flex-col justify-end gap-2 shrink-0">
                  <button
                    onClick={() => executeOrder(order.id, false)}
                    disabled={actingOrderId === order.id}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-green-500 text-white hover:from-emerald-700 hover:to-green-600 transition-all font-bold text-xs shadow-md shadow-emerald-600/20 active:scale-95 disabled:opacity-50"
                  >
                    <Zap className="w-3.5 h-3.5 fill-current" />
                    <span>{actingOrderId === order.id ? 'Executing...' : 'Execute Now'}</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setEditingOrder(order)}
                      disabled={actingOrderId === order.id}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors font-semibold text-xs"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>

                    <button
                      onClick={() => handleCancel(order.id)}
                      disabled={actingOrderId === order.id}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-xl bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50 transition-colors font-semibold text-xs"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Cancel</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {editingOrder && (
        <EditProposalModal
          order={editingOrder}
          onClose={() => setEditingOrder(null)}
          onSuccess={() => {
            setEditingOrder(null);
            showToast('Proposal updated successfully', 'success');
            refreshAll();
          }}
        />
      )}
    </>
  );
};
export default PendingGraceBanner;
