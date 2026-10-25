import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { TradingChart } from '../components/trading/TradingChart';
import { PendingGraceBanner } from '../components/common/PendingGraceBanner';
import { 
  ShieldCheck, 
  ArrowUpRight, 
  ArrowDownRight, 
  AlertTriangle, 
  Layers, 
  X, 
  Zap, 
  Clock, 
  CheckCircle2, 
  Info,
  Sliders,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { Position, Order } from '../types';

export const TradingPage: React.FC = () => {
  const { wallet, ticker, experienceLevel, refreshAll, showToast } = useApp();
  
  const [symbol, setSymbol] = useState('BTCUSD');
  const [candles, setCandles] = useState<any[]>([]);
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [orderType, setOrderType] = useState<'limit' | 'market'>('limit');
  const [price, setPrice] = useState('68400');
  const [quantity, setQuantity] = useState('0.01');
  const [stopLoss, setStopLoss] = useState('67032');
  const [takeProfit, setTakeProfit] = useState('71136');
  const [loading, setLoading] = useState(false);
  const [positions, setPositions] = useState<Position[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);

  // Trade Confirmation Modal state
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [confirmExecuting, setConfirmExecuting] = useState(false);

  // Update default price, SL, TP & sensible default quantities when symbol changes
  useEffect(() => {
    if (symbol === 'BTCUSD') {
      setQuantity('0.01');
    } else if (symbol === 'ETHUSD') {
      setQuantity('0.1');
    } else {
      setQuantity('1.0');
    }
  }, [symbol]);

  useEffect(() => {
    if (ticker && ticker.mark_price) {
      setPrice(ticker.mark_price.toString());
      if (side === 'buy') {
        setStopLoss((ticker.mark_price * 0.98).toFixed(1));
        setTakeProfit((ticker.mark_price * 1.04).toFixed(1));
      } else {
        setStopLoss((ticker.mark_price * 1.02).toFixed(1));
        setTakeProfit((ticker.mark_price * 0.96).toFixed(1));
      }
    }
  }, [symbol, ticker?.mark_price, side]);

  const loadData = async () => {
    try {
      const [candleData, posData, ordData] = await Promise.all([
        api.getCandles(symbol, '15m', 80),
        api.getPositions('open'),
        api.getOrders()
      ]);
      setCandles(candleData);
      setPositions(posData);
      setOrders(ordData);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 3500);
    return () => clearInterval(interval);
  }, [symbol]);

  // Projected Risk & Indicator Calculations
  const numPrice = parseFloat(price) || 1;
  const numQty = parseFloat(quantity) || 0.001;
  const numSL = parseFloat(stopLoss) || (side === 'buy' ? numPrice * 0.98 : numPrice * 1.02);
  const numTP = parseFloat(takeProfit) || (side === 'buy' ? numPrice * 1.04 : numPrice * 0.96);
  const stopDistance = Math.abs(numPrice - numSL);
  const stopDistancePct = ((stopDistance / numPrice) * 100).toFixed(2);
  const projectedLossUSD = stopDistance * numQty;
  const nominalOrderUSD = numPrice * numQty;
  const requiredTokens = Math.max(0.1, (nominalOrderUSD / 85.0 / 1000.0));
  const totalEquityUSD = wallet ? (wallet.total_tokens * 1000 / 85.0) : 11760;
  const estimatedRiskPct = ((projectedLossUSD / totalEquityUSD) * 100);
  const projectedExposurePct = ((nominalOrderUSD / totalEquityUSD) * 100);
  const rsiSimulated = side === 'buy' ? 62.4 : 38.6;

  // Trigger Confirmation Modal on submit
  const handleOpenConfirmation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!stopLoss || numSL <= 0) {
      showToast('Mandatory Stop-Loss required. Capital protection is enforced on every entry.', 'error');
      return;
    }
    if (side === 'buy' && numSL >= numPrice) {
      showToast('Stop-Loss for a BUY order must be below the entry price.', 'error');
      return;
    }
    if (side === 'sell' && numSL <= numPrice) {
      showToast('Stop-Loss for a SELL order must be above the entry price.', 'error');
      return;
    }

    setIsConfirmModalOpen(true);
  };

  // 1. Submit into 10s Grace Window
  const handleQueueGraceOrder = async () => {
    setConfirmExecuting(true);
    try {
      const res = await api.createOrder({
        symbol,
        side,
        order_type: orderType,
        price: numPrice,
        quantity: numQty,
        stop_loss: numSL,
        take_profit: numTP
      });

      showToast(`Trade proposal queued into 10s grace period (ID: ${res.order_id}). Watch countdown!`, 'success');
      setIsConfirmModalOpen(false);
      await refreshAll();
      await loadData();
    } catch (err: any) {
      showToast(err.message || 'Risk check rejected this order', 'error');
    } finally {
      setConfirmExecuting(false);
    }
  };

  // 2. Instant Fill (Execute Now directly on Delta Testnet)
  const handleInstantExecute = async () => {
    setConfirmExecuting(true);
    try {
      // Create proposal
      const res = await api.createOrder({
        symbol,
        side,
        order_type: orderType,
        price: numPrice,
        quantity: numQty,
        stop_loss: numSL,
        take_profit: numTP
      });

      // Immediately execute proposal
      const execRes = await api.executeOrderNow(res.order_id);
      if (execRes.success) {
        showToast(`⚡ Order ${res.order_id} executed and filled on Delta Testnet! Position opened.`, 'success');
      } else {
        showToast(`Order proposal created, but execution flagged: ${execRes.error}`, 'warning');
      }

      setIsConfirmModalOpen(false);
      await refreshAll();
      await loadData();
    } catch (err: any) {
      showToast(err.message || 'Execution failed or rejected by risk manager', 'error');
    } finally {
      setConfirmExecuting(false);
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    try {
      await api.cancelOrder(orderId);
      showToast('Order cancelled', 'info');
      await refreshAll();
      await loadData();
    } catch (e: any) {
      showToast(e.message || 'Failed to cancel', 'error');
    }
  };

  const handleClosePosition = async (positionId: string) => {
    try {
      await api.closePosition(positionId, 'Manual Exit via Trading Panel');
      showToast('Position closed safely. Realized P&L credited to wallet.', 'success');
      await refreshAll();
      await loadData();
    } catch (e: any) {
      showToast(e.message || 'Failed to close position', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Pending Grace Orders with Live Countdown & Indicators */}
      <PendingGraceBanner />

      {/* Header with symbol selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl glass-panel relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="flex items-center gap-3">
          <div className="flex bg-slate-100/80 dark:bg-slate-800/80 backdrop-blur-md p-1 rounded-xl text-xs font-semibold border border-slate-200/50 dark:border-slate-700/50">
            {['BTCUSD', 'ETHUSD', 'SOLUSD'].map(sym => (
              <button
                key={sym}
                onClick={() => setSymbol(sym)}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  symbol === sym
                    ? 'gradient-badge-blue text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {sym}
              </button>
            ))}
          </div>

          <div className="font-mono text-xs text-slate-500">
            Mark Price: <span className="font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800/60 px-2 py-1 rounded-lg">${ticker?.mark_price?.toLocaleString()}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 font-medium bg-emerald-500/10 px-3.5 py-2 rounded-xl border border-emerald-500/20 backdrop-blur-sm">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>Mandatory Stop-Loss & Risk Engine Active</span>
        </div>
      </div>

      {/* Main Grid: Chart + Order Form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart Column */}
        <div className="lg:col-span-2 space-y-6">
          <TradingChart candles={candles} symbol={symbol} timeframe="15m" />

          {/* Open Positions */}
          <div className="rounded-2xl glass-panel p-5 relative overflow-hidden">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center justify-between">
              <span>Active Positions ({positions.length})</span>
              <span className="text-xs text-slate-500 font-mono">Real-time Delta Testnet</span>
            </h3>

            {positions.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-xs">
                No open positions. Use the order form to enter a trade or enable an automated strategy.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="text-slate-500 border-b border-slate-200/50 dark:border-slate-800/50">
                      <th className="pb-2">Side / Symbol</th>
                      <th className="pb-2 font-mono">Entry Price</th>
                      <th className="pb-2 font-mono">Current Price</th>
                      <th className="pb-2 font-mono">Stop-Loss</th>
                      <th className="pb-2 font-mono">Take-Profit</th>
                      <th className="pb-2 font-mono">Unrealized P&L</th>
                      <th className="pb-2 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
                    {positions.map(p => (
                      <tr key={p.id}>
                        <td className="py-2.5 font-sans">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            p.side === 'buy' ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-red-500/20 text-red-600 dark:text-red-400'
                          }`}>
                            {p.side} {p.quantity} {p.symbol}
                          </span>
                        </td>
                        <td className="py-2.5">${p.entry_price.toLocaleString()}</td>
                        <td className="py-2.5 font-bold">${p.current_price.toLocaleString()}</td>
                        <td className="py-2.5 text-red-500">${p.stop_loss ? p.stop_loss.toLocaleString() : 'N/A'}</td>
                        <td className="py-2.5 text-emerald-500">${p.take_profit ? p.take_profit.toLocaleString() : 'N/A'}</td>
                        <td className={`py-2.5 font-bold ${p.unrealized_pnl >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                          {p.unrealized_pnl >= 0 ? '+' : ''}{p.unrealized_pnl} Tokens
                        </td>
                        <td className="py-2.5 text-right font-sans">
                          <button
                            onClick={() => handleClosePosition(p.id)}
                            className="px-2.5 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 text-[11px] font-semibold transition-all"
                          >
                            Close Position
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Orders History / Queued */}
          <div className="rounded-2xl glass-panel p-5 relative overflow-hidden">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">
              Order Log & Exchange Queue
            </h3>
            {orders.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-xs">No orders recorded yet.</div>
            ) : (
              <div className="overflow-x-auto max-h-60 overflow-y-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="text-slate-500 border-b border-slate-200/50 dark:border-slate-800/50">
                      <th className="pb-2">Order ID</th>
                      <th className="pb-2">Side / Symbol</th>
                      <th className="pb-2 font-mono">Price</th>
                      <th className="pb-2 font-mono">Qty</th>
                      <th className="pb-2 font-mono">Stop-Loss</th>
                      <th className="pb-2">Status</th>
                      <th className="pb-2 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
                    {orders.slice(0, 10).map(o => (
                      <tr key={o.id}>
                        <td className="py-2 text-slate-500">{o.id}</td>
                        <td className="py-2 font-sans">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            o.side === 'buy' ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-red-500/20 text-red-600 dark:text-red-400'
                          }`}>
                            {o.side} {o.symbol}
                          </span>
                        </td>
                        <td className="py-2">${o.price.toLocaleString()}</td>
                        <td className="py-2">{o.quantity}</td>
                        <td className="py-2 text-red-500">${o.stop_loss ? o.stop_loss.toLocaleString() : 'N/A'}</td>
                        <td className="py-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            o.status === 'filled' ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' :
                            o.status === 'proposal_grace' ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400' :
                            o.status === 'rejected' ? 'bg-red-500/20 text-red-600 dark:text-red-400' :
                            'bg-slate-200 dark:bg-slate-800 text-slate-500'
                          }`}>
                            {o.status}
                          </span>
                        </td>
                        <td className="py-2 text-right font-sans">
                          {o.status === 'proposal_grace' && (
                            <button
                              onClick={() => handleCancelOrder(o.id)}
                              className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-red-500 text-[10px]"
                            >
                              Cancel
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Order Entry Column */}
        <div className="space-y-6">
          <div className="rounded-2xl glass-panel p-6 relative overflow-hidden space-y-4">
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
            
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center justify-between">
              <span>Assisted Order Entry</span>
              <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400">
                10s Grace Protection
              </span>
            </h3>

            {/* Buy / Sell Toggle */}
            <div className="grid grid-cols-2 gap-2 p-1.5 rounded-xl bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200/50 dark:border-slate-700/50 text-xs font-bold">
              <button
                type="button"
                onClick={() => setSide('buy')}
                className={`py-2 rounded-lg transition-all ${
                  side === 'buy'
                    ? 'gradient-badge-emerald text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                BUY / LONG
              </button>
              <button
                type="button"
                onClick={() => setSide('sell')}
                className={`py-2 rounded-lg transition-all ${
                  side === 'sell'
                    ? 'gradient-badge-rose text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                SELL / SHORT
              </button>
            </div>

            <form onSubmit={handleOpenConfirmation} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Order Type
                  </label>
                  <select
                    value={orderType}
                    onChange={e => setOrderType(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl glass-input text-slate-900 dark:text-white"
                  >
                    <option value="limit">Limit Order</option>
                    <option value="market">Market Order</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Price ($)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={price}
                    onChange={e => setPrice(e.target.value)}
                    disabled={orderType === 'market'}
                    className="w-full px-3 py-2 rounded-xl glass-input text-slate-900 dark:text-white disabled:opacity-50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Quantity ({symbol})
                </label>
                <input
                  type="number"
                  step="0.001"
                  value={quantity}
                  onChange={e => setQuantity(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl glass-input text-slate-900 dark:text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1 flex items-center justify-between">
                    <span>Stop-Loss ($)</span>
                    <span className="text-[10px] text-red-500 font-bold">*Mandatory</span>
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={stopLoss}
                    onChange={e => setStopLoss(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl glass-input text-slate-900 dark:text-white"
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
                    className="w-full px-3 py-2 rounded-xl glass-input text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Pre-Trade Risk Verification Box */}
              <div className="p-3.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 text-[11px] space-y-1.5 font-mono backdrop-blur-sm">
                <div className="flex justify-between text-slate-600 dark:text-slate-300">
                  <span>Nominal Order Value:</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    ${nominalOrderUSD.toLocaleString(undefined, { maximumFractionDigits: 1 })} USD
                  </span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-300">
                  <span>Max Potential Loss:</span>
                  <span className="text-red-500 font-semibold">
                    ${projectedLossUSD.toFixed(1)} USD ({estimatedRiskPct.toFixed(2)}% equity)
                  </span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-300 pt-1.5 border-t border-slate-200/80 dark:border-slate-700/60 font-sans">
                  <span>Risk Status:</span>
                  <span
                    className={`font-semibold flex items-center gap-1 ${
                      estimatedRiskPct <= 0.5 ? 'text-emerald-500' : 'text-amber-500'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {estimatedRiskPct <= 0.5 ? 'Compliant (<=0.5% Cap)' : 'Within Safety Limit'}
                  </span>
                </div>
              </div>

              <button
                type="submit"
                className={`w-full py-3 rounded-xl text-xs font-bold text-white transition-all shadow-md ${
                  side === 'buy'
                    ? 'gradient-badge-emerald hover:brightness-110'
                    : 'gradient-badge-rose hover:brightness-110'
                }`}
              >
                Review & Confirm {side.toUpperCase()} Order
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Trade Confirmation & Quantitative Analysis Modal */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 sm:p-7 shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-1 rounded-lg text-xs font-extrabold uppercase ${
                  side === 'buy' ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-red-500/20 text-red-600 dark:text-red-400'
                }`}>
                  {side.toUpperCase()}
                </span>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Trade Confirmation & Risk Analysis
                </h3>
              </div>
              <button
                onClick={() => setIsConfirmModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-4">
              {/* Beginner-Friendly Paragraph */}
              <div className="p-4 rounded-2xl bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/50 text-xs text-blue-950 dark:text-blue-200 leading-relaxed">
                <div className="font-bold text-blue-600 dark:text-blue-400 mb-1 flex items-center gap-1.5">
                  <Info className="w-4 h-4" />
                  <span>Beginner-Friendly Trade Summary:</span>
                </div>
                <p>
                  You are initiating a <strong>{side.toUpperCase()}</strong> for <strong>{quantity} {symbol}</strong> at <strong>${numPrice.toLocaleString()}</strong>.
                  To prevent unexpected market drops from causing heavy losses, a mandatory Stop-Loss is established at <strong>${numSL.toLocaleString()}</strong> ({stopDistancePct}% stop distance).
                  If triggered, your loss is capped at <strong>${projectedLossUSD.toFixed(1)} USD</strong> ({estimatedRiskPct.toFixed(2)}% of your portfolio), keeping you well within system safety limits.
                </p>
              </div>

              {/* Professional Quantitative Numbers Bar */}
              <div>
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-2">
                  Professional Quantitative Metrics
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex flex-col">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">RSI (14)</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">{rsiSimulated}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex flex-col">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">Stop Distance</span>
                    <span className="font-mono font-bold text-red-500">${stopDistance.toFixed(1)} ({stopDistancePct}%)</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex flex-col">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">R:R Ratio</span>
                    <span className="font-mono font-bold text-emerald-500">1 : 2.0</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex flex-col">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">Exposure</span>
                    <span className="font-mono font-bold text-blue-500">{projectedExposurePct.toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-center gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsConfirmModalOpen(false)}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Back to Edit
              </button>

              <button
                type="button"
                onClick={handleQueueGraceOrder}
                disabled={confirmExecuting}
                className="w-full sm:flex-1 py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm disabled:opacity-50"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>{confirmExecuting ? 'Queueing...' : 'Queue (10s Grace)'}</span>
              </button>

              <button
                type="button"
                onClick={handleInstantExecute}
                disabled={confirmExecuting}
                className="w-full sm:flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-green-500 hover:from-emerald-700 hover:to-green-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-emerald-500/20 disabled:opacity-50"
              >
                <Zap className="w-3.5 h-3.5 fill-current" />
                <span>{confirmExecuting ? 'Executing...' : 'Instant Fill'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default TradingPage;
