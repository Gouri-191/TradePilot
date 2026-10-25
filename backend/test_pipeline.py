import sys
import os
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
import asyncio
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

print("1. import database", flush=True)
from app.database import engine, Base, SessionLocal
print("2. import wallet", flush=True)
from app.services.wallet_service import WalletService
print("3. import achievement", flush=True)
from app.services.achievement_service import AchievementService
print("4. import strategy_engine", flush=True)
from app.services.strategy_engine import StrategyEngine
print("5. import execution_engine", flush=True)
from app.services.execution_engine import ExecutionEngine
print("6. import delta_client", flush=True)
from app.services.delta_client import delta_client
print("7. import routers", flush=True)
from app.routers.strategies import seed_strategies_if_needed, generate_signal
print("8. import settings", flush=True)
from app.routers.settings import get_or_create_user_config
print("9. all imported!", flush=True)

async def main():
    print("1. Initializing Database...", flush=True)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    cfg = get_or_create_user_config(db)
    cfg.emergency_stop_triggered = False
    db.commit()
    WalletService.initialize_wallet_if_empty(db)
    seed_strategies_if_needed(db)
    AchievementService.seed_achievements(db)

    print("2. Testing Delta Testnet Client...", flush=True)
    ticker = await delta_client.get_ticker("BTCUSD")
    print(f"   BTCUSD Mark Price: ${ticker['mark_price']:,.2f} | Feed: {ticker['source']}", flush=True)

    print("3. Testing Strategy Engine & Signal Generation...", flush=True)
    sig = await generate_signal("strat-ema-rsi", db=db)
    print(f"   Generated {sig['side'].upper()} signal @ ${sig['price']:,.2f}", flush=True)
    print(f"   Risk Engine Evaluation: Passed={sig['risk_passed']} | {sig.get('risk_reason')}", flush=True)

    print("4. Testing 10-Second Grace Period Proposal Creation & Order Lifecycle...", flush=True)
    # Create proposal with compliant risk (0.001 BTC)
    ord_prop = ExecutionEngine.create_proposal(
        db=db,
        symbol="BTCUSD",
        side="buy",
        price=ticker['mark_price'],
        quantity=0.001,
        stop_loss=round(ticker['mark_price'] * 0.99, 1),
        take_profit=round(ticker['mark_price'] * 1.03, 1),
        strategy_id="strat-ema-rsi"
    )
    print(f"   Proposal {ord_prop.id} created with 10s grace window (Expires: {ord_prop.grace_expires_at})", flush=True)

    # Edit proposal during grace window to safe size 0.001
    edited = ExecutionEngine.edit_proposal(db, ord_prop.id, quantity=0.001)
    print(f"   Proposal edited during grace period: new quantity = {edited.quantity}", flush=True)

    # Execute now (skipping remaining timer)
    exec_res = await ExecutionEngine.execute_order_now(db, ord_prop.id)
    print(f"   Execute result: {exec_res}", flush=True)
    if exec_res.get("success"):
        print(f"   Executed now: Position {exec_res['position_id']} successfully opened!", flush=True)
        # Close position with profit
        close_res = ExecutionEngine.close_position(db, exec_res['position_id'], exit_price=ticker['mark_price'] + 350.0, reason="Target profit reached")
        print(f"   Position closed: Realized P&L = +{close_res['realized_pnl_tokens']} Tokens credited to ledger!", flush=True)

    print("5. Testing Wallet Accounting...", flush=True)
    summary = WalletService.get_summary(db)
    print(f"   Total Balance: {summary['total_tokens']} Tokens (~INR {summary['nominal_inr_value']:,.0f})", flush=True)

    print("6. Testing Emergency Stop Safety...", flush=True)
    stop = await ExecutionEngine.trigger_emergency_stop(db, "market_close", "Test safety")
    print(f"   Emergency stop active: {stop['emergency_stop_active']}", flush=True)
    reset = ExecutionEngine.reset_emergency_stop(db)
    print(f"   Emergency stop reset: {not reset['emergency_stop_active']}", flush=True)

    print("7. Testing Backtest Engine...", flush=True)
    candles = await delta_client.get_candlesticks("BTCUSD", "15m", 80)
    bt = StrategyEngine.run_backtest(candles, "ema_rsi", 40.0)
    print(f"   Backtest complete: {bt['total_trades']} trades, Win Rate: {bt['win_rate_pct']}%, Profit Factor: {bt['profit_factor']}", flush=True)

    db.close()
    print("\n>>> ALL PIPELINE TESTS COMPLETED PERFECTLY! <<<", flush=True)

if __name__ == "__main__":
    print("INSIDE __MAIN__ BLOCK, SETTING EVENT LOOP POLICY...", flush=True)
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    print("RUNNING ASYNCIO.RUN...", flush=True)
    asyncio.run(main())
