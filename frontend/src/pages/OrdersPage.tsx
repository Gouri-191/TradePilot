import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { PendingGraceBanner } from '../components/common/PendingGraceBanner';
import { ListOrdered, Clock, CheckCircle, XCircle, AlertCircle, Edit2, Play } from 'lucide-react';
import { Order } from '../types';

export const OrdersPage: React.FC = () => {
  const { refreshAll, showToast } = useApp();
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedTab, setSelectedTab] = useState<'all' | 'proposal_grace' | 'open' | 'filled' | 'cancelled' | 'rejected'>('all');
  const [loading, setLoading] = useState(false);

  const fetchOrders = async () => {
    try {
      const data = await api.getOrders();
      setOrders(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleCancel = async (id: string) => {
    try {
      await api.cancelOrder(id, 'User cancelled from Orders management');
      showToast('Order cancelled', 'info');
      await refreshAll();
      await fetchOrders();
    } catch (e: any) {
      showToast(e.message || 'Failed to cancel', 'error');
    }
  };

  const handleExecuteNow = async (id: string) => {
    try {
      await api.executeOrderNow(id);
      showToast('Order submitted to matching engine immediately', 'success');
      await refreshAll();
      await fetchOrders();
    } catch (e: any) {
      showToast(e.message || 'Execution failed', 'error');
    }
  };

  const filteredOrders = orders.filter(o => {
    if (selectedTab === 'all') return true;
    return o.status === selectedTab;
  });

  return (
    <div className="space-y-6">
      <PendingGraceBanner />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl glass-panel relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            Order Lifecycle & Transaction Intervention
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Full control over queued proposals, open orders, and execution audit history
          </p>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex flex-wrap gap-1 bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200/50 dark:border-slate-700/50 backdrop-blur-sm p-1 rounded-xl text-xs font-medium">
          {[
            { id: 'all', label: 'All Orders' },
            { id: 'proposal_grace', label: 'Pending Grace' },
            { id: 'open', label: 'Open' },
            { id: 'filled', label: 'Filled' },
            { id: 'cancelled', label: 'Cancelled' },
            { id: 'rejected', label: 'Rejected' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setSelectedTab(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                selectedTab === tab.id
                  ? 'gradient-badge-blue text-white font-semibold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Orders Table */}
      <div className="rounded-2xl glass-panel p-5 relative overflow-hidden">
        {filteredOrders.length === 0 ? (
          <div className="text-center py-10 text-xs text-slate-400">
            No orders found matching the filter "{selectedTab}".
          </div>
        ) : (
          <div className="overflow-x-auto text-xs font-mono">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-sans">
                  <th className="pb-2.5">ID / Client ID</th>
                  <th className="pb-2.5">Side / Symbol</th>
                  <th className="pb-2.5">Type</th>
                  <th className="pb-2.5">Price</th>
                  <th className="pb-2.5">Quantity</th>
                  <th className="pb-2.5">Stop-Loss</th>
                  <th className="pb-2.5">Status</th>
                  <th className="pb-2.5">Details / Reject Reason</th>
                  <th className="pb-2.5 text-right font-sans">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredOrders.map(o => {
                  const isBuy = o.side === 'buy';
                  const inGrace = o.status === 'proposal_grace';

                  return (
                    <tr key={o.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 font-semibold text-slate-700 dark:text-slate-300">
                        {o.id}
                      </td>
                      <td className="py-3 font-sans">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold mr-2 ${
                            isBuy
                              ? 'bg-emerald-500/10 text-emerald-600'
                              : 'bg-red-500/10 text-red-600'
                          }`}
                        >
                          {o.side}
                        </span>
                        {o.symbol}
                      </td>
                      <td className="py-3 uppercase">{o.order_type}</td>
                      <td className="py-3">${o.price?.toLocaleString()}</td>
                      <td className="py-3">{o.quantity}</td>
                      <td className="py-3 text-amber-500">${o.stop_loss?.toLocaleString() || '-'}</td>
                      <td className="py-3 font-sans">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            o.status === 'filled'
                              ? 'bg-emerald-500/15 text-emerald-600'
                              : o.status === 'proposal_grace'
                              ? 'bg-amber-500/15 text-amber-600 animate-pulse'
                              : o.status === 'rejected'
                              ? 'bg-red-500/15 text-red-600'
                              : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                          }`}
                        >
                          {inGrace ? `Grace (${o.seconds_remaining ?? 10}s)` : o.status}
                        </span>
                      </td>
                      <td className="py-3 font-sans text-slate-500 max-w-xs truncate">
                        {o.reject_reason || (o.exchange_order_id ? `Matched on ${o.exchange_order_id}` : 'Standard validation')}
                      </td>
                      <td className="py-3 text-right font-sans">
                        <div className="flex items-center justify-end gap-1.5">
                          {inGrace && (
                            <button
                              onClick={() => handleExecuteNow(o.id)}
                              className="px-2.5 py-1 rounded bg-emerald-600 text-white text-[11px] font-semibold hover:bg-emerald-700 transition-colors"
                            >
                              Submit
                            </button>
                          )}
                          {(inGrace || o.status === 'open') && (
                            <button
                              onClick={() => handleCancel(o.id)}
                              className="px-2.5 py-1 rounded bg-red-50 dark:bg-red-950/50 text-red-600 text-[11px] font-semibold hover:bg-red-100 transition-colors"
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
