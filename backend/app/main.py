import asyncio
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base, SessionLocal
from app.services.wallet_service import WalletService
from app.services.achievement_service import AchievementService
from app.services.scheduler_service import SchedulerService
from app.services.autonomous_engine import AutonomousTradingEngine
from app.services.delta_client import delta_client
from app.routers.settings import get_or_create_user_config
from app.routers.strategies import seed_strategies_if_needed

from app.routers import (
    auth,
    dashboard,
    market_data,
    strategies,
    orders,
    positions,
    automation,
    sessions,
    wallet,
    achievements,
    analytics,
    settings as settings_router
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("tradepilot")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # 1. Create DB tables
    logger.info("Initializing database tables...")
    Base.metadata.create_all(bind=engine)

    # 2. Seed initial data
    db = SessionLocal()
    try:
        get_or_create_user_config(db)
        WalletService.initialize_wallet_if_empty(db)
        seed_strategies_if_needed(db)
        AchievementService.seed_achievements(db)
        logger.info("Database seeded successfully.")
    finally:
        db.close()

    # 3. Start background scheduler and autonomous trading engine
    scheduler_task = asyncio.create_task(SchedulerService.run_scheduler_loop())
    engine_task = asyncio.create_task(AutonomousTradingEngine.run_engine_loop())

    yield

    # Teardown
    scheduler_task.cancel()
    engine_task.cancel()
    logger.info("Shutting down TradePilot backend...")

app = FastAPI(
    title="TradePilot API",
    description="Intelligent Cryptocurrency Algorithmic Trading Platform API",
    version="1.0.0",
    lifespan=lifespan
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth.router)
app.include_router(dashboard.router)
app.include_router(market_data.router)
app.include_router(strategies.router)
app.include_router(orders.router)
app.include_router(positions.router)
app.include_router(automation.router)
app.include_router(sessions.router)
app.include_router(wallet.router)
app.include_router(achievements.router)
app.include_router(analytics.router)
app.include_router(settings_router.router)

# Mount compiled React frontend if present
import os
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

frontend_dist_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist"))
if os.path.exists(frontend_dist_path):
    app.mount("/assets", StaticFiles(directory=os.path.join(frontend_dist_path, "assets")), name="assets")
    
    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        file_path = os.path.join(frontend_dist_path, full_path)
        if full_path and os.path.exists(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(frontend_dist_path, "index.html"))
else:
    @app.get("/")
    def root():
        return {
            "app": "TradePilot",
            "status": "online",
            "target": "Delta Exchange Testnet",
            "documentation": "/docs"
        }

# WebSocket for real-time tickers and countdowns
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            # Stream price updates every 2 seconds
            ticker = await delta_client.get_ticker("BTCUSD")
            await websocket.send_json({
                "type": "ticker_update",
                "data": ticker
            })
            await asyncio.sleep(2.0)
    except WebSocketDisconnect:
        logger.info("WebSocket client disconnected")
    except Exception as e:
        logger.debug(f"WebSocket closed: {e}")
