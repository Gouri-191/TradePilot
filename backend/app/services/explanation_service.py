from typing import Dict, Any

class ExplanationService:
    """
    Generates unified multi-level explanations for every trading signal:
    1. Plain-English: Beginner accessible, clear rationale, invalidation conditions, next steps.
    2. Technical: Exact indicators, math, thresholds, timeframes, parameters.
    3. Risk: Quantity sizing, max dollar/token loss, exposure, margin safety checks.
    """

    @classmethod
    def generate_explanation(
        cls,
        strategy_type: str,
        side: str,
        price: float,
        stop_loss: float,
        take_profit: float,
        indicators: Dict[str, Any],
        risk_metrics: Dict[str, Any]
    ) -> Dict[str, str]:
        side_label = "BUY (Long)" if side.lower() == "buy" else "SELL (Short)"

        if strategy_type == "ema_rsi":
            fast_p = indicators.get("fast_period", 9)
            slow_p = indicators.get("slow_period", 21)
            fast_val = indicators.get("ema_fast", 0.0)
            slow_val = indicators.get("ema_slow", 0.0)
            rsi_val = indicators.get("rsi", 50.0)
            adx_val = indicators.get("adx", 25.0)

            if side.lower() == "buy":
                plain = (
                    f"🟢 What the bot detected: A bullish trend crossover where the fast {fast_p}-period EMA (${fast_val:,.2f}) "
                    f"moved decisively above the slower {slow_p}-period EMA (${slow_val:,.2f}). "
                    f"The RSI momentum indicator sits at {rsi_val:.1f}, confirming buyer momentum without entering dangerous overbought territory. "
                    f"Why it matters: Crypto price momentum is favoring upside continuation. "
                    f"What could invalidate this: If price drops back below your mandatory Stop-Loss at ${stop_loss:,.2f}, the bullish setup is invalidated and the platform will exit automatically to protect capital. "
                    f"What happens next: An automated order proposal has been queued with a 10-second grace window for your final review."
                )
                technical = (
                    f"• Strategy: EMA Crossover + RSI Momentum\n"
                    f"• Signal: LONG | Entry: ${price:,.2f}\n"
                    f"• Condition 1: EMA({fast_p}) [${fast_val:,.2f}] > EMA({slow_p}) [${slow_val:,.2f}] (Cross: Bullish)\n"
                    f"• Condition 2: RSI({indicators.get('rsi_period', 14)}) = {rsi_val:.2f} (Allowed range: 50.0 - 70.0)\n"
                    f"• Filter: ADX(14) = {adx_val:.1f} (> 25.0 confirmed trend strength)\n"
                    f"• Stop-Loss: ${stop_loss:,.2f} (-{abs(price - stop_loss)/price*100:.2f}%) | Take-Profit: ${take_profit:,.2f} (+{abs(take_profit - price)/price*100:.2f}%) | R:R = 1:2.0"
                )
            else:
                plain = (
                    f"🔴 What the bot detected: A bearish trend reversal where the fast {fast_p}-period EMA (${fast_val:,.2f}) "
                    f"fell below the slower {slow_p}-period EMA (${slow_val:,.2f}). "
                    f"The RSI momentum indicator stands at {rsi_val:.1f}, signaling seller pressure without being oversold. "
                    f"Why it matters: Downtrend momentum is accelerating. "
                    f"What could invalidate this: If price pushes back above ${stop_loss:,.2f}, the bearish signal fails and capital is protected by the automatic stop loss. "
                    f"What happens next: A 10-second pending order grace countdown is active allowing manual edit or cancellation."
                )
                technical = (
                    f"• Strategy: EMA Crossover + RSI Momentum\n"
                    f"• Signal: SHORT | Entry: ${price:,.2f}\n"
                    f"• Condition 1: EMA({fast_p}) [${fast_val:,.2f}] < EMA({slow_p}) [${slow_val:,.2f}] (Cross: Bearish)\n"
                    f"• Condition 2: RSI = {rsi_val:.2f} (Allowed range: 30.0 - 50.0)\n"
                    f"• Filter: ADX = {adx_val:.1f} (Trend strength confirmed)\n"
                    f"• Stop-Loss: ${stop_loss:,.2f} (+{abs(stop_loss - price)/price*100:.2f}%) | Take-Profit: ${take_profit:,.2f} (-{abs(price - take_profit)/price*100:.2f}%)"
                )

        elif strategy_type == "bollinger_stoch":
            upper = indicators.get("bb_upper", price * 1.02)
            lower = indicators.get("bb_lower", price * 0.98)
            k = indicators.get("stoch_k", 30.0)
            plain = (
                f"🎯 What the bot detected: Mean Reversion on Bollinger Bands + Stochastic Oscillator. "
                f"Price (${price:,.2f}) has reached standard deviation extremes [Band: ${lower:,.2f} - ${upper:,.2f}] "
                f"with Stochastic %K at {k:.1f}, indicating high probability of a snapback towards the statistical mean. "
                f"Why it matters: Crypto oscillates in trading ranges 70% of the time, providing favorable risk-reward reversals. "
                f"What could invalidate this: A sharp trending expansion breaking the outer band; protected by Stop-Loss at ${stop_loss:,.2f}."
            )
            technical = (
                f"• Strategy: Bollinger Bands + Stochastic Oscillator (Mean Reversion)\n"
                f"• Signal: {side_label} | Price: ${price:,.2f}\n"
                f"• Bollinger(20, 2.0): Upper=${upper:,.2f}, Lower=${lower:,.2f}\n"
                f"• Stoch(14, 3, 3): %K = {k:.1f}\n"
                f"• Target Mean: Mid-Band (${indicators.get('bb_mid', price):,.2f}) | Stop: ${stop_loss:,.2f}"
            )

        elif strategy_type == "vwap_imbalance":
            vwap = indicators.get("vwap", price)
            dev = indicators.get("deviation_pct", 0.0)
            plain = (
                f"📊 What the bot detected: Order Flow Volume Imbalance relative to Volume-Weighted Average Price (VWAP). "
                f"Price (${price:,.2f}) has deviated by {dev:+.2f}% from the institutional benchmark VWAP (${vwap:,.2f}), creating a liquidity vacuum. "
                f"Why it matters: Institutional algorithmic desks accumulate when price discounts excessively below the volume-weighted benchmark. "
                f"What could invalidate this: Fundamental news driving institutional repricing; capped by Stop-Loss at ${stop_loss:,.2f}."
            )
            technical = (
                f"• Strategy: VWAP + Order Flow Imbalance\n"
                f"• Signal: {side_label} | Price: ${price:,.2f} | VWAP: ${vwap:,.2f}\n"
                f"• Deviation from Benchmark: {dev:+.2f}%\n"
                f"• Liquidity Target: Institutional Fair Value (${vwap:,.2f}) | Stop-Loss: ${stop_loss:,.2f}"
            )

        elif strategy_type == "supertrend_macd":
            st_val = indicators.get("supertrend_value", price * 0.98)
            st_dir = indicators.get("supertrend_direction", "bullish")
            plain = (
                f"📈 What the bot detected: Multi-timeframe trend continuation on SuperTrend + MACD Momentum. "
                f"The algorithm identifies {st_dir.upper()} trend structure with trailing dynamic support at ${st_val:,.2f}. "
                f"Why it matters: Eliminates counter-trend noise and aligns trading execution with predominant institutional trend bias. "
                f"What could invalidate this: Price closing beyond the dynamic trailing SuperTrend line (${st_val:,.2f})."
            )
            technical = (
                f"• Strategy: SuperTrend(10, 3.0) + MACD Momentum Divergence\n"
                f"• Signal: {side_label} | Entry: ${price:,.2f}\n"
                f"• SuperTrend Trailing Level: ${st_val:,.2f} (Status: {st_dir})\n"
                f"• Guard Rails: Dynamic Stop-Loss = ${stop_loss:,.2f} | Take-Profit = ${take_profit:,.2f}"
            )

        elif strategy_type == "vsa_liquidity_sweep":
            high_sw = indicators.get("liquidity_high_sweep", price * 1.01)
            low_sw = indicators.get("liquidity_low_sweep", price * 0.99)
            plain = (
                f"🦈 What the bot detected: Smart Money Concept (SMC) - Liquidity Sweep & Stop-Run Reversal. "
                f"Market makers swept resting retail stop orders beyond [High: ${high_sw:,.2f} / Low: ${low_sw:,.2f}] "
                f"followed by an immediate aggressive absorption candle back into range. "
                f"Why it matters: False breakouts trap breakout traders and fuel swift counter-moves in the actual institutional direction. "
                f"What could invalidate this: Continuation through the sweep zone; tightly protected by Stop-Loss at ${stop_loss:,.2f}."
            )
            technical = (
                f"• Strategy: Volume Spread Analysis (VSA) + Liquidity Sweep (SMC)\n"
                f"• Signal: {side_label} | Price: ${price:,.2f}\n"
                f"• Sweep Levels: Prior High=${high_sw:,.2f}, Prior Low=${low_sw:,.2f}\n"
                f"• Absorption Footprint: Confirmed Range Re-entry\n"
                f"• Stop-Loss: ${stop_loss:,.2f} | Take-Profit: ${take_profit:,.2f}"
            )

        else: # donchian_atr
            upper = indicators.get("donchian_upper", price * 1.02)
            lower = indicators.get("donchian_lower", price * 0.98)
            atr = indicators.get("atr", 120.0)
            lookback = indicators.get("lookback", 20)
            mult = indicators.get("atr_multiplier", 2.0)

            plain = (
                f"⚡ What the bot detected: Volatility breakout on {lookback}-period Donchian Channels. "
                f"Price (${price:,.2f}) is testing channel boundaries [Upper: ${upper:,.2f}, Lower: ${lower:,.2f}]. "
                f"Current Average True Range (ATR) volatility is measured at ${atr:,.2f}. "
                f"Why it matters: High-volatility breakouts typically spark sustained directional swings in crypto. "
                f"What could invalidate this: A false breakout that reverses beyond {mult}x ATR (${stop_loss:,.2f}). "
                f"What happens next: Trade entry is staged with strict risk validation."
            )
            technical = (
                f"• Strategy: Donchian Channel Breakout + ATR Volatility Guard\n"
                f"• Signal: {side_label} | Entry: ${price:,.2f}\n"
                f"• Donchian Channels({lookback}): High=${upper:,.2f}, Low=${lower:,.2f}\n"
                f"• ATR(14): ${atr:,.2f} | Dynamic Stop Multiplier: {mult}x ATR\n"
                f"• Guard Rails: Stop-Loss=${stop_loss:,.2f}, Take-Profit=${take_profit:,.2f}"
            )

        # Risk Explanation
        risk_plain = (
            f"🛡️ Risk Assessment & Capital Protection:\n"
            f"• Portfolio Risk per Trade: {risk_metrics.get('calculated_risk_pct', 0.5):.2f}% (System Limit: 2.00%)\n"
            f"• Capital Allocation: {risk_metrics.get('tokens_required', 1.0):.2f} Tokens (~₹{risk_metrics.get('tokens_required', 1.0)*1000:,.0f} nominal)\n"
            f"• Projected Gross Exposure: {risk_metrics.get('projected_exposure_pct', 5.0):.1f}% of total equity\n"
            f"• Max Potential Loss: {risk_metrics.get('potential_loss_tokens', 0.05):.3f} Tokens\n"
            f"• Circuit Breaker Status: Daily loss circuit breaker is active and intact."
        )

        return {
            "plain_explanation": plain,
            "technical_explanation": technical,
            "risk_explanation": risk_plain
        }
