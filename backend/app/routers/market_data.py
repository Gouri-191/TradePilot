from fastapi import APIRouter, Query
from app.services.delta_client import delta_client

router = APIRouter(prefix="/api/market-data", tags=["Market Data"])

@router.get("/ticker")
async def get_ticker(symbol: str = Query("BTCUSD", pattern="^[A-Z0-9]+$")):
    return await delta_client.get_ticker(symbol)

@router.get("/candles")
async def get_candles(
    symbol: str = Query("BTCUSD"),
    resolution: str = Query("15m"),
    count: int = Query(100, ge=10, le=500)
):
    return await delta_client.get_candlesticks(symbol=symbol, resolution=resolution, count=count)

@router.get("/symbols")
async def get_symbols():
    return [
        {"symbol": "BTCUSD", "name": "Bitcoin Perpetual", "base": "BTC", "tick_size": 0.5, "min_qty": 0.001},
        {"symbol": "ETHUSD", "name": "Ethereum Perpetual", "base": "ETH", "tick_size": 0.1, "min_qty": 0.01},
        {"symbol": "SOLUSD", "name": "Solana Perpetual", "base": "SOL", "tick_size": 0.05, "min_qty": 0.1}
    ]
