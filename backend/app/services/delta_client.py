import time
import hmac
import hashlib
import json
import math
import logging
import httpx
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

class DeltaExchangeClient:
    """
    Client for Delta Exchange Testnet.
    Provides public market data (tickers, orderbook, candles) and authenticated trading endpoints.
    Falls back gracefully to high-fidelity market simulation if Testnet endpoints are unreachable.
    """
    def __init__(self, api_key: Optional[str] = None, api_secret: Optional[str] = None, use_testnet: bool = True):
        self.api_key = api_key
        self.api_secret = api_secret
        self.use_testnet = use_testnet
        self.cdn_url = "https://cdn.testnet.delta.exchange" if use_testnet else "https://cdn.delta.exchange"
        self.api_url = "https://api.testnet.delta.exchange" if use_testnet else "https://api.delta.exchange"
        
        # In-memory realistic simulated state for crypto pairs
        self._simulated_prices = {
            "BTCUSD": 68420.50,
            "ETHUSD": 3540.25,
            "SOLUSD": 184.80
        }
        self._last_tick_time = time.time()
        # Default to simulated testnet engine unless explicit API keys or live connection probe is enabled
        self._network_reachable = False if not (api_key and api_secret) else None

    def _generate_signature(self, method: str, path: str, payload_str: str = "", timestamp: str = "") -> str:
        if not self.api_secret:
            return ""
        message = method.upper() + timestamp + path + payload_str
        signature = hmac.new(
            self.api_secret.encode('utf-8'),
            message.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()
        return signature

    async def get_ticker(self, symbol: str = "BTCUSD") -> Dict[str, Any]:
        """Fetch current ticker for symbol."""
        if self._network_reachable is not False:
            try:
                async with httpx.AsyncClient(timeout=0.6) as client:
                    res = await client.get(f"{self.cdn_url}/v2/tickers/{symbol}")
                    if res.status_code == 200:
                        self._network_reachable = True
                        data = res.json().get("result", {})
                        return {
                            "symbol": symbol,
                            "mark_price": float(data.get("mark_price", self._simulated_prices.get(symbol, 68000.0))),
                            "spot_price": float(data.get("spot_price", self._simulated_prices.get(symbol, 68000.0))),
                            "bid": float(data.get("best_bid", self._simulated_prices.get(symbol, 68000.0) - 1.0)),
                            "ask": float(data.get("best_ask", self._simulated_prices.get(symbol, 68000.0) + 1.0)),
                            "high_24h": float(data.get("high_24h", self._simulated_prices.get(symbol, 68000.0) * 1.02)),
                            "low_24h": float(data.get("low_24h", self._simulated_prices.get(symbol, 68000.0) * 0.98)),
                            "volume_24h": float(data.get("volume_24h", 45120.0)),
                            "open_interest": float(data.get("open_interest", 12500000.0)),
                            "funding_rate": float(data.get("funding_rate", 0.0001)),
                            "source": "delta_testnet_live",
                            "timestamp": datetime.now(timezone.utc).isoformat()
                        }
            except Exception as e:
                self._network_reachable = False
                logger.debug(f"Delta Testnet unreachable, using simulated ticker: {e}")

        # Simulated fallback with realistic tight basis points spread (0.03%)
        base = self._simulated_prices.get(symbol, 68420.0)
        # Small random walk drift based on seconds
        delta = (int(time.time() * 2) % 11 - 5) * (0.5 if "BTC" in symbol else 0.05)
        current = round(base + delta, 2)
        half_spread = max(0.01, round(current * 0.00015, 2))
        return {
            "symbol": symbol,
            "mark_price": current,
            "spot_price": current,
            "bid": round(current - half_spread, 2),
            "ask": round(current + half_spread, 2),
            "high_24h": round(current * 1.035, 2),
            "low_24h": round(current * 0.965, 2),
            "volume_24h": 41250.8,
            "open_interest": 14200000.0,
            "funding_rate": 0.00012,
            "source": "simulated_testnet_feed",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }

    async def get_candlesticks(self, symbol: str = "BTCUSD", resolution: str = "15m", count: int = 100) -> List[Dict[str, Any]]:
        """Fetch historical candlestick data."""
        if self._network_reachable is not False:
            try:
                res_code = "15m" if resolution == "15m" else ("1h" if resolution == "1h" else "1d")
                async with httpx.AsyncClient(timeout=0.6) as client:
                    res = await client.get(f"{self.cdn_url}/v2/history/candles?resolution={res_code}&symbol={symbol}")
                    if res.status_code == 200:
                        self._network_reachable = True
                        candles = res.json().get("result", [])
                        if candles:
                            formatted = []
                            for c in candles[-count:]:
                                formatted.append({
                                    "time": int(c.get("time", time.time())),
                                    "open": float(c.get("open")),
                                    "high": float(c.get("high")),
                                    "low": float(c.get("low")),
                                    "close": float(c.get("close")),
                                    "volume": float(c.get("volume", 10.0))
                                })
                            return formatted
            except Exception as e:
                self._network_reachable = False
                logger.debug(f"Could not fetch Delta candles, generating synthetic: {e}")

        # Deterministic synthetic candle generator for testnet demonstration
        base_price = 68400.0 if "BTC" in symbol else (3540.0 if "ETH" in symbol else 184.0)
        candles = []
        now = int(time.time())
        step_seconds = 900 if resolution == "15m" else (3600 if resolution == "1h" else 60)
        curr_price = base_price * 0.98

        for i in range(count):
            t = now - (count - i) * step_seconds
            # Proportional volatility wave (0.1% to 0.8% price fluctuation)
            cycle_pct = (math.sin(i * 0.4) * 0.004) + (((i % 5) - 2) * 0.0015)
            change = curr_price * cycle_pct
            open_p = max(curr_price, 1.0)
            close_p = max(open_p + change, 1.0)
            spread = abs(change * 0.5) + (open_p * 0.001)
            high_p = max(open_p, close_p) + spread
            low_p = max(min(open_p, close_p) - spread, 0.5)
            vol = 25.0 + abs(cycle_pct * 1000)
            candles.append({
                "time": t,
                "open": round(open_p, 2),
                "high": round(high_p, 2),
                "low": round(low_p, 2),
                "close": round(close_p, 2),
                "volume": round(vol, 2)
            })
            curr_price = close_p

        return candles

    get_candles = get_candlesticks

    async def place_order(self, order_data: Dict[str, Any]) -> Dict[str, Any]:
        """Submit order to Delta Exchange Testnet or simulated matching engine."""
        if self.api_key and self.api_secret:
            timestamp = str(int(time.time()))
            path = "/v2/orders"
            payload_str = json.dumps(order_data)
            signature = self._generate_signature("POST", path, payload_str, timestamp)
            headers = {
                "api-key": self.api_key,
                "signature": signature,
                "timestamp": timestamp,
                "Content-Type": "application/json"
            }
            try:
                async with httpx.AsyncClient(timeout=5.0) as client:
                    res = await client.post(f"{self.api_url}{path}", headers=headers, json=order_data)
                    if res.status_code in (200, 201):
                        return {
                            "success": True,
                            "exchange_order_id": res.json().get("result", {}).get("id", f"DELTA-{int(time.time())}"),
                            "source": "delta_exchange_testnet",
                            "raw": res.json()
                        }
                    else:
                        return {
                            "success": False,
                            "error": f"Delta Testnet rejected: {res.text}",
                            "source": "delta_exchange_testnet"
                        }
            except Exception as e:
                logger.error(f"Failed to place order on Delta Testnet: {e}")
                return {
                    "success": False,
                    "error": str(e),
                    "source": "delta_exchange_testnet_error"
                }

        # Simulated testnet order match
        return {
            "success": True,
            "exchange_order_id": f"TESTNET-SIM-{int(time.time()*1000)}",
            "source": "simulated_testnet_engine"
        }

    async def cancel_order(self, exchange_order_id: str, symbol: str) -> Dict[str, Any]:
        """Cancel order on Delta Exchange Testnet or simulated engine."""
        if self.api_key and self.api_secret and not exchange_order_id.startswith("TESTNET-SIM"):
            timestamp = str(int(time.time()))
            path = f"/v2/orders/{exchange_order_id}"
            signature = self._generate_signature("DELETE", path, "", timestamp)
            headers = {
                "api-key": self.api_key,
                "signature": signature,
                "timestamp": timestamp
            }
            try:
                async with httpx.AsyncClient(timeout=4.0) as client:
                    res = await client.delete(f"{self.api_url}{path}", headers=headers)
                    return {
                        "success": res.status_code in (200, 204),
                        "source": "delta_exchange_testnet"
                    }
            except Exception as e:
                return {"success": False, "error": str(e)}

        return {
            "success": True,
            "cancelled_id": exchange_order_id,
            "source": "simulated_testnet_engine"
        }

delta_client = DeltaExchangeClient()
