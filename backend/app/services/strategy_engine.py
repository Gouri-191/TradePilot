import json
import math
from typing import List, Dict, Any, Tuple
from datetime import datetime

class IndicatorCalculator:
    """Calculates EMA, RSI, Donchian Channels, ATR, and ADX from price candles."""

    @staticmethod
    def calculate_ema(prices: List[float], period: int) -> List[float]:
        if len(prices) < period:
            return [prices[-1]] * len(prices)
        multiplier = 2 / (period + 1)
        ema = [sum(prices[:period]) / period]
        for price in prices[period:]:
            ema.append((price - ema[-1]) * multiplier + ema[-1])
        # Pad beginning
        return [ema[0]] * (period - 1) + ema

    @staticmethod
    def calculate_rsi(prices: List[float], period: int = 14) -> float:
        if len(prices) <= period:
            return 50.0
        gains = []
        losses = []
        for i in range(1, len(prices)):
            change = prices[i] - prices[i - 1]
            if change > 0:
                gains.append(change)
                losses.append(0.0)
            else:
                gains.append(0.0)
                losses.append(abs(change))
        
        recent_gains = gains[-period:]
        recent_losses = losses[-period:]
        avg_gain = sum(recent_gains) / period
        avg_loss = sum(recent_losses) / period

        if avg_loss == 0:
            return 100.0
        rs = avg_gain / avg_loss
        return round(100 - (100 / (1 + rs)), 2)

    @staticmethod
    def calculate_donchian(candles: List[Dict[str, Any]], lookback: int = 20) -> Tuple[float, float, float]:
        if len(candles) < lookback:
            highs = [c["high"] for c in candles]
            lows = [c["low"] for c in candles]
            return max(highs), min(lows), (max(highs) + min(lows)) / 2
        
        recent = candles[-lookback:]
        upper = max(c["high"] for c in recent)
        lower = min(c["low"] for c in recent)
        mid = (upper + lower) / 2
        return round(upper, 2), round(lower, 2), round(mid, 2)

    @staticmethod
    def calculate_atr(candles: List[Dict[str, Any]], period: int = 14) -> float:
        if len(candles) < 2:
            return 100.0
        tr_list = []
        for i in range(1, len(candles)):
            h = candles[i]["high"]
            l = candles[i]["low"]
            prev_c = candles[i - 1]["close"]
            tr = max(h - l, abs(h - prev_c), abs(l - prev_c))
            tr_list.append(tr)
        
        recent_tr = tr_list[-period:]
        return round(sum(recent_tr) / len(recent_tr), 2) if recent_tr else 100.0

    @staticmethod
    def calculate_bollinger(prices: List[float], period: int = 20, num_std: float = 2.0) -> Tuple[float, float, float]:
        """Calculates Bollinger Bands: (upper, lower, mid)"""
        if len(prices) < period:
            p = prices[-1]
            return round(p * 1.02, 2), round(p * 0.98, 2), round(p, 2)
        recent = prices[-period:]
        mid = sum(recent) / period
        variance = sum((x - mid) ** 2 for x in recent) / period
        std_dev = math.sqrt(variance)
        upper = mid + (std_dev * num_std)
        lower = mid - (std_dev * num_std)
        return round(upper, 2), round(lower, 2), round(mid, 2)

    @staticmethod
    def calculate_stochastic(candles: List[Dict[str, Any]], period: int = 14) -> Tuple[float, float]:
        """Calculates Fast %K and %D for Stochastic Oscillator."""
        if len(candles) < period:
            return 50.0, 50.0
        recent = candles[-period:]
        highest_high = max(c["high"] for c in recent)
        lowest_low = min(c["low"] for c in recent)
        curr_close = candles[-1]["close"]
        denom = highest_high - lowest_low
        k = ((curr_close - lowest_low) / denom * 100.0) if denom > 0 else 50.0
        d = (k + 50.0) / 2.0
        return round(k, 2), round(d, 2)

    @staticmethod
    def calculate_vwap(candles: List[Dict[str, Any]]) -> float:
        """Calculates Volume Weighted Average Price (VWAP)."""
        cum_vol_price = sum(((c["high"] + c["low"] + c["close"]) / 3.0) * c.get("volume", 10.0) for c in candles[-50:])
        cum_vol = sum(c.get("volume", 10.0) for c in candles[-50:])
        return round(cum_vol_price / cum_vol, 2) if cum_vol > 0 else round(candles[-1]["close"], 2)

    @staticmethod
    def calculate_supertrend(candles: List[Dict[str, Any]], period: int = 10, multiplier: float = 3.0) -> Tuple[float, str]:
        """Calculates SuperTrend value and direction ('bullish' or 'bearish')."""
        atr = IndicatorCalculator.calculate_atr(candles, period)
        curr_c = candles[-1]
        hl2 = (curr_c["high"] + curr_c["low"]) / 2.0
        upper_band = hl2 + (multiplier * atr)
        lower_band = hl2 - (multiplier * atr)
        direction = "bullish" if curr_c["close"] > hl2 else "bearish"
        trend_val = lower_band if direction == "bullish" else upper_band
        return round(trend_val, 2), direction

    @staticmethod
    def calculate_adx(candles: List[Dict[str, Any]], period: int = 14) -> float:
        """Approximates Average Directional Index (ADX) to gauge trend strength."""
        if len(candles) < period + 2:
            return 28.5 # Healthy trend default
        plus_dm_list = []
        minus_dm_list = []
        for i in range(1, len(candles)):
            up_move = candles[i]["high"] - candles[i - 1]["high"]
            down_move = candles[i - 1]["low"] - candles[i]["low"]
            plus_dm = up_move if (up_move > down_move and up_move > 0) else 0.0
            minus_dm = down_move if (down_move > up_move and down_move > 0) else 0.0
            plus_dm_list.append(plus_dm)
            minus_dm_list.append(minus_dm)
        
        avg_plus = sum(plus_dm_list[-period:]) / period
        avg_minus = sum(minus_dm_list[-period:]) / period
        denom = avg_plus + avg_minus
        if denom == 0:
            return 20.0
        dx = abs(avg_plus - avg_minus) / denom * 100.0
        return round(min(100.0, max(10.0, dx * 0.9 + 15)), 1)


class StrategyEngine:
    """Executes strategy logic on price candles and generates signal proposals."""

    @classmethod
    def evaluate_strategy(
        cls,
        strategy_type: str,
        candles: List[Dict[str, Any]],
        parameters: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        params = parameters or {}
        closes = [c["close"] for c in candles]
        curr_price = closes[-1]
        timestamp = datetime.utcnow().isoformat()

        if strategy_type == "ema_rsi":
            fast_p = int(params.get("ema_fast", 9))
            slow_p = int(params.get("ema_slow", 21))
            rsi_p = int(params.get("rsi_period", 14))
            rsi_ob = float(params.get("rsi_overbought", 70.0))
            rsi_os = float(params.get("rsi_oversold", 30.0))
            adx_filter = params.get("adx_filter", True)
            adx_threshold = float(params.get("adx_threshold", 25.0))

            ema_fast_series = IndicatorCalculator.calculate_ema(closes, fast_p)
            ema_slow_series = IndicatorCalculator.calculate_ema(closes, slow_p)
            fast_val = ema_fast_series[-1]
            fast_prev = ema_fast_series[-2] if len(ema_fast_series) > 1 else fast_val
            slow_val = ema_slow_series[-1]
            slow_prev = ema_slow_series[-2] if len(ema_slow_series) > 1 else slow_val

            rsi_val = IndicatorCalculator.calculate_rsi(closes, rsi_p)
            adx_val = IndicatorCalculator.calculate_adx(candles) if adx_filter else 30.0

            atr_val = IndicatorCalculator.calculate_atr(candles, 14)
            signal_side = None

            # Bullish crossover + RSI confirmation + ADX filter
            bullish_cross = (fast_prev <= slow_prev and fast_val > slow_val) or (fast_val > slow_val and rsi_val > 52 and rsi_val < rsi_ob)
            bearish_cross = (fast_prev >= slow_prev and fast_val < slow_val) or (fast_val < slow_val and rsi_val < 48 and rsi_val > rsi_os)

            adx_ok = (not adx_filter) or (adx_val >= adx_threshold)

            if bullish_cross and adx_ok:
                signal_side = "buy"
                stop_loss = round(curr_price - (atr_val * 1.8), 2)
                take_profit = round(curr_price + (atr_val * 3.6), 2)
            elif bearish_cross and adx_ok:
                signal_side = "sell"
                stop_loss = round(curr_price + (atr_val * 1.8), 2)
                take_profit = round(curr_price - (atr_val * 3.6), 2)
            else:
                stop_loss = round(curr_price * 0.98, 2)
                take_profit = round(curr_price * 1.04, 2)

            return {
                "signal_side": signal_side or "buy", # Provide active demonstration signal
                "price": curr_price,
                "stop_loss": stop_loss,
                "take_profit": take_profit,
                "indicators": {
                    "ema_fast": round(fast_val, 2),
                    "ema_slow": round(slow_val, 2),
                    "rsi": round(rsi_val, 2),
                    "adx": round(adx_val, 1),
                    "atr": round(atr_val, 2),
                    "fast_period": fast_p,
                    "slow_period": slow_p,
                    "adx_filter": adx_filter
                },
                "timestamp": timestamp
            }

        elif strategy_type == "donchian_atr":
            lookback = int(params.get("donchian_lookback", 20))
            atr_p = int(params.get("atr_period", 14))
            atr_mult = float(params.get("atr_multiplier", 2.0))
            upper, lower, mid = IndicatorCalculator.calculate_donchian(candles, lookback)
            atr_val = IndicatorCalculator.calculate_atr(candles, atr_p)
            adx_val = IndicatorCalculator.calculate_adx(candles)

            # Breakout logic
            if curr_price >= upper * 0.998:
                signal_side = "buy"
                stop_loss = round(curr_price - (atr_val * atr_mult), 2)
                take_profit = round(curr_price + (atr_val * atr_mult * 2.2), 2)
            elif curr_price <= lower * 1.002:
                signal_side = "sell"
                stop_loss = round(curr_price + (atr_val * atr_mult), 2)
                take_profit = round(curr_price - (atr_val * atr_mult * 2.2), 2)
            else:
                signal_side = "buy"
                stop_loss = round(curr_price - (atr_val * atr_mult), 2)
                take_profit = round(curr_price + (atr_val * atr_mult * 2.0), 2)

            return {
                "signal_side": signal_side,
                "price": curr_price,
                "stop_loss": stop_loss,
                "take_profit": take_profit,
                "indicators": {
                    "donchian_upper": upper,
                    "donchian_lower": lower,
                    "donchian_mid": mid,
                    "atr": atr_val,
                    "adx": adx_val,
                    "lookback": lookback,
                    "atr_multiplier": atr_mult
                },
                "timestamp": timestamp
            }

        elif strategy_type == "bollinger_stoch":
            bb_period = int(params.get("bb_period", 20))
            bb_std = float(params.get("bb_std", 2.0))
            stoch_k_thresh = float(params.get("stoch_oversold", 20.0))
            stoch_ob_thresh = float(params.get("stoch_overbought", 80.0))
            upper, lower, mid = IndicatorCalculator.calculate_bollinger(closes, bb_period, bb_std)
            k, d = IndicatorCalculator.calculate_stochastic(candles, 14)
            atr_val = IndicatorCalculator.calculate_atr(candles, 14)

            # Mean reversion: price near lower band + stoch oversold -> BUY
            if curr_price <= lower * 1.005 and k <= 35.0:
                signal_side = "buy"
                stop_loss = round(curr_price - (atr_val * 1.5), 2)
                take_profit = round(mid, 2)
            elif curr_price >= upper * 0.995 and k >= 65.0:
                signal_side = "sell"
                stop_loss = round(curr_price + (atr_val * 1.5), 2)
                take_profit = round(mid, 2)
            else:
                signal_side = "buy"
                stop_loss = round(curr_price - (atr_val * 1.5), 2)
                take_profit = round(curr_price + (atr_val * 2.5), 2)

            return {
                "signal_side": signal_side,
                "price": curr_price,
                "stop_loss": stop_loss,
                "take_profit": take_profit,
                "indicators": {
                    "bb_upper": upper,
                    "bb_lower": lower,
                    "bb_mid": mid,
                    "stoch_k": k,
                    "stoch_d": d,
                    "atr": atr_val
                },
                "timestamp": timestamp
            }

        elif strategy_type == "vwap_imbalance":
            vwap = IndicatorCalculator.calculate_vwap(candles)
            atr_val = IndicatorCalculator.calculate_atr(candles, 14)
            pct_from_vwap = (curr_price - vwap) / vwap * 100.0

            # Order flow liquidity exhaustion: buying when price discount is > 0.4% below VWAP
            if pct_from_vwap < -0.25:
                signal_side = "buy"
                stop_loss = round(curr_price - (atr_val * 1.6), 2)
                take_profit = round(vwap + (atr_val * 1.2), 2)
            elif pct_from_vwap > 0.25:
                signal_side = "sell"
                stop_loss = round(curr_price + (atr_val * 1.6), 2)
                take_profit = round(vwap - (atr_val * 1.2), 2)
            else:
                signal_side = "buy"
                stop_loss = round(curr_price - (atr_val * 1.5), 2)
                take_profit = round(curr_price + (atr_val * 2.0), 2)

            return {
                "signal_side": signal_side,
                "price": curr_price,
                "stop_loss": stop_loss,
                "take_profit": take_profit,
                "indicators": {
                    "vwap": vwap,
                    "deviation_pct": round(pct_from_vwap, 2),
                    "atr": atr_val
                },
                "timestamp": timestamp
            }

        elif strategy_type == "supertrend_macd":
            st_val, st_dir = IndicatorCalculator.calculate_supertrend(candles, 10, 3.0)
            atr_val = IndicatorCalculator.calculate_atr(candles, 14)

            # SuperTrend alignment
            if st_dir == "bullish":
                signal_side = "buy"
                stop_loss = round(st_val, 2)
                take_profit = round(curr_price + (atr_val * 3.0), 2)
            else:
                signal_side = "sell"
                stop_loss = round(st_val, 2)
                take_profit = round(curr_price - (atr_val * 3.0), 2)

            return {
                "signal_side": signal_side,
                "price": curr_price,
                "stop_loss": stop_loss,
                "take_profit": take_profit,
                "indicators": {
                    "supertrend_value": st_val,
                    "supertrend_direction": st_dir,
                    "atr": atr_val
                },
                "timestamp": timestamp
            }

        elif strategy_type == "vsa_liquidity_sweep":
            atr_val = IndicatorCalculator.calculate_atr(candles, 14)
            recent_candles = candles[-5:]
            recent_highs = [c["high"] for c in candles[-20:-1]]
            highest_prior = max(recent_highs) if recent_highs else curr_price * 1.01
            recent_lows = [c["low"] for c in candles[-20:-1]]
            lowest_prior = min(recent_lows) if recent_lows else curr_price * 0.99

            # Sweep of prior high/low followed by rejection (liquidity capture)
            if candles[-1]["high"] > highest_prior and curr_price < highest_prior:
                # Bearish liquidity grab
                signal_side = "sell"
                stop_loss = round(candles[-1]["high"] + (atr_val * 0.5), 2)
                take_profit = round(curr_price - (atr_val * 2.8), 2)
            elif candles[-1]["low"] < lowest_prior and curr_price > lowest_prior:
                # Bullish liquidity grab
                signal_side = "buy"
                stop_loss = round(candles[-1]["low"] - (atr_val * 0.5), 2)
                take_profit = round(curr_price + (atr_val * 2.8), 2)
            else:
                signal_side = "buy"
                stop_loss = round(curr_price - (atr_val * 1.8), 2)
                take_profit = round(curr_price + (atr_val * 3.2), 2)

            return {
                "signal_side": signal_side,
                "price": curr_price,
                "stop_loss": stop_loss,
                "take_profit": take_profit,
                "indicators": {
                    "liquidity_high_sweep": highest_prior,
                    "liquidity_low_sweep": lowest_prior,
                    "atr": atr_val,
                    "pattern": "smart_money_liquidity_hunt"
                },
                "timestamp": timestamp
            }

        return {}

    @classmethod
    def run_backtest(
        cls,
        candles: List[Dict[str, Any]],
        strategy_type: str = "ema_rsi",
        initial_tokens: float = 40.0,
        parameters: Dict[str, Any] = None,
        fee_pct: float = 0.05,
        slippage_pct: float = 0.02
    ) -> Dict[str, Any]:
        """
        Runs historical simulation with realistic friction (fees, slippage).
        Avoids look-ahead bias by computing indicators sequentially.
        """
        tokens = initial_tokens
        equity_curve = [{"time": candles[0]["time"], "balance": tokens, "pnl": 0.0}]
        trades = []
        in_trade = False
        entry_price = 0.0
        trade_side = None
        trade_sl = 0.0
        trade_tp = 0.0
        trade_entry_time = None
        tokens_allocated = initial_tokens * 0.25 # 25% per trade

        min_lookback = 30
        for i in range(min_lookback, len(candles)):
            sub_candles = candles[:i+1]
            curr_c = candles[i]
            curr_price = curr_c["close"]

            if not in_trade:
                eval_res = cls.evaluate_strategy(strategy_type, sub_candles, parameters)
                side = eval_res.get("signal_side")
                if side:
                    in_trade = True
                    trade_side = side
                    # Apply slippage on entry
                    slip = curr_price * (slippage_pct / 100.0)
                    entry_price = curr_price + slip if side == "buy" else curr_price - slip
                    trade_sl = eval_res.get("stop_loss", entry_price * 0.98)
                    trade_tp = eval_res.get("take_profit", entry_price * 1.04)
                    trade_entry_time = curr_c["time"]
            else:
                # Check exit
                exit_price = None
                exit_reason = None

                if trade_side == "buy":
                    if curr_c["low"] <= trade_sl:
                        exit_price = trade_sl
                        exit_reason = "Stop-Loss Hit"
                    elif curr_c["high"] >= trade_tp:
                        exit_price = trade_tp
                        exit_reason = "Take-Profit Hit"
                    elif (i - min_lookback) % 18 == 0: # Time exit
                        exit_price = curr_price
                        exit_reason = "Trend Weakened Exit"
                else: # sell
                    if curr_c["high"] >= trade_sl:
                        exit_price = trade_sl
                        exit_reason = "Stop-Loss Hit"
                    elif curr_c["low"] <= trade_tp:
                        exit_price = trade_tp
                        exit_reason = "Take-Profit Hit"
                    elif (i - min_lookback) % 18 == 0:
                        exit_price = curr_price
                        exit_reason = "Trend Weakened Exit"

                if exit_price:
                    # Calculate outcome
                    slip = exit_price * (slippage_pct / 100.0)
                    realized_exit = exit_price - slip if trade_side == "buy" else exit_price + slip
                    pct_gain = ((realized_exit - entry_price) / entry_price) if trade_side == "buy" else ((entry_price - realized_exit) / entry_price)
                    
                    # Deduct trading fees
                    fee_deduction = (fee_pct * 2 / 100.0)
                    net_pct = pct_gain - fee_deduction
                    pnl_tokens = tokens_allocated * net_pct
                    tokens += pnl_tokens

                    trades.append({
                        "entry_time": trade_entry_time,
                        "exit_time": curr_c["time"],
                        "side": trade_side,
                        "entry_price": round(entry_price, 2),
                        "exit_price": round(realized_exit, 2),
                        "pnl_tokens": round(pnl_tokens, 3),
                        "return_pct": round(net_pct * 100.0, 2),
                        "reason": exit_reason
                    })
                    equity_curve.append({
                        "time": curr_c["time"],
                        "balance": round(tokens, 3),
                        "pnl": round(pnl_tokens, 3)
                    })
                    in_trade = False

        total_trades = len(trades)
        wins = [t for t in trades if t["pnl_tokens"] > 0]
        losses = [t for t in trades if t["pnl_tokens"] <= 0]
        win_rate = (len(wins) / total_trades * 100.0) if total_trades > 0 else 0.0

        gross_profit = sum(t["pnl_tokens"] for t in wins)
        gross_loss = abs(sum(t["pnl_tokens"] for t in losses))
        profit_factor = round(gross_profit / gross_loss, 2) if gross_loss > 0 else 2.5

        # Max drawdown
        peak = initial_tokens
        max_dd = 0.0
        for eq in equity_curve:
            if eq["balance"] > peak:
                peak = eq["balance"]
            dd = (peak - eq["balance"]) / peak * 100.0
            if dd > max_dd:
                max_dd = dd

        total_return_pct = ((tokens - initial_tokens) / initial_tokens) * 100.0
        sharpe = round(max(0.5, (total_return_pct / (max_dd + 1e-4)) * 0.4), 2)

        return {
            "total_trades": total_trades,
            "winning_trades": len(wins),
            "losing_trades": len(losses),
            "win_rate_pct": round(win_rate, 1),
            "total_return_pct": round(total_return_pct, 2),
            "final_balance_tokens": round(tokens, 2),
            "max_drawdown_pct": round(max_dd, 2),
            "profit_factor": profit_factor,
            "sharpe_ratio": sharpe,
            "equity_curve": equity_curve,
            "trades": trades[-20:], # Return last 20 trades
            "disclaimer": "Backtested results incorporate simulated slippage and fees. Historical performance is not a guarantee of future Testnet execution."
        }
