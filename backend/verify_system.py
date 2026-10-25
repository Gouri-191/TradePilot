import sys
import os
import asyncio
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

import httpx
from app.main import app
from app.database import engine, Base, SessionLocal
from app.services.wallet_service import WalletService
from app.services.achievement_service import AchievementService
from app.routers.strategies import seed_strategies_if_needed
from app.routers.settings import get_or_create_user_config

async def run_tests():
    print("="*60)
    print("TRADEPILOT SYSTEM VERIFICATION TEST")
    print("="*60)

    # 1. Initialize DB
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    get_or_create_user_config(db)
    WalletService.initialize_wallet_if_empty(db)
    seed_strategies_if_needed(db)
    AchievementService.seed_achievements(db)
    db.close()

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        # 2. Test Dashboard Endpoint
        r = await client.get("/api/dashboard")
        assert r.status_code == 200, f"Dashboard failed: {r.text}"
        dash = r.json()
        print("[OK] Dashboard Summary:")
        print("     Total Tokens:", dash["wallet"]["total_tokens"])
        print("     Automation Status:", dash["automation_status"])
        print("     Risk Status:", dash["risk_status"]["status"])

        # 3. Test Market Data
        r = await client.get("/api/market-data/ticker?symbol=BTCUSD")
        assert r.status_code == 200, f"Ticker failed: {r.text}"
        ticker = r.json()
        print("[OK] Market Data Ticker:")
        print(f"     Symbol: {ticker['symbol']} | Mark Price: ${ticker['mark_price']:,.2f} | Source: {ticker['source']}")

        # 4. Test Strategy Evaluation & Signal Generation
        r = await client.post("/api/strategies/strat-ema-rsi/generate-signal")
        assert r.status_code == 200, f"Signal generation failed: {r.text}"
        sig = r.json()
        print("[OK] Signal Generation & Multi-Tier Explanations:")
        print("     Signal:", sig["side"].upper(), "@", sig["price"])
        print("     Risk Passed:", sig["risk_passed"])
        print("     Order Proposed:", sig.get("order_proposed"))
        assert "What the bot detected" in sig["plain_explanation"]
        assert "EMA(" in sig["technical_explanation"]
        assert "Risk Assessment" in sig["risk_explanation"]

        # 5. Test Pending Order in Grace Period
        r = await client.get("/api/orders?status=proposal_grace")
        assert r.status_code == 200
        grace_orders = r.json()
        print(f"[OK] Pending Grace Orders Count: {len(grace_orders)}")
        if grace_orders:
            order_id = grace_orders[0]["id"]
            print(f"     Found proposal {order_id} in grace countdown ({grace_orders[0]['seconds_remaining']}s left)")
            
            # 6. Test Transaction Intervention: Edit proposal
            r_edit = await client.patch(f"/api/orders/{order_id}", json={"quantity": 0.015})
            assert r_edit.status_code == 200, f"Edit failed: {r_edit.text}"
            print(f"[OK] Edited proposal {order_id} quantity to 0.015")

            # 7. Test Execute Now (Skipping remaining grace period)
            r_exec = await client.post(f"/api/orders/{order_id}/execute-now")
            assert r_exec.status_code == 200, f"Execution failed: {r_exec.text}"
            exec_data = r_exec.json()
            pos_id = exec_data["position_id"]
            print(f"[OK] Order executed and matched! Position created: {pos_id}")

            # 8. Test Positions List
            r_pos = await client.get("/api/positions?status=open")
            assert r_pos.status_code == 200
            positions = r_pos.json()
            print(f"[OK] Open Positions: {len(positions)}")
            
            # 9. Test Close Position & Wallet Ledger Update
            r_close = await client.post(f"/api/positions/{pos_id}/close?reason=Verification%20Test")
            assert r_close.status_code == 200, f"Close failed: {r_close.text}"
            close_data = r_close.json()
            print(f"[OK] Position {pos_id} closed. Realized PnL: {close_data['realized_pnl_tokens']} Tokens")

        # 10. Test Wallet Summary & Ledger Auditing
        r_w = await client.get("/api/wallet")
        assert r_w.status_code == 200
        wallet = r_w.json()
        print(f"[OK] Wallet Balance: {wallet['total_tokens']} Tokens (~INR {wallet['nominal_inr_value']})")

        r_ledger = await client.get("/api/wallet/ledger?limit=5")
        assert r_ledger.status_code == 200
        ledger = r_ledger.json()
        print(f"[OK] Immutable Ledger Entries Recorded: {len(ledger)} entries")
        for tx in ledger[:3]:
            print(f"     TX: {tx['transaction_id']} | Type: {tx['tx_type']} | Running: {tx['running_balance']} Tokens | {tx['description'][:45]}...")

        # 11. Test Emergency Stop & Recovery
        r_stop = await client.post("/api/automation/emergency-stop", json={"close_positions_policy": "market_close", "reason": "Test Safety Trip"})
        assert r_stop.status_code == 200
        print("[OK] Emergency Stop Activated Successfully!")

        r_reset = await client.post("/api/automation/emergency-stop/reset")
        assert r_reset.status_code == 200
        print("[OK] Emergency Stop Reset Successfully!")

        # 12. Test Achievements
        r_ach = await client.get("/api/achievements")
        assert r_ach.status_code == 200
        ach = r_ach.json()
        print(f"[OK] Badges Loaded: {len(ach['badges'])} | Progression: {ach['progression']['current_tier'].upper()}")

    print("="*60)
    print("ALL SYSTEM VERIFICATION TESTS PASSED SUCCESSFULLY!")
    print("="*60)

if __name__ == "__main__":
    asyncio.run(run_tests())
