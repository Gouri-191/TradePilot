#!/usr/bin/env python3
"""
TradePilot - Unified Single-File Execution Runner
==================================================
Runs the complete TradePilot platform in a single process:
  - Delta Exchange Testnet API Integration (Key: HIErDiqRn1ofpsHENrQTCfIsmxMTDb)
  - 10-Point Mandatory Risk Management & Circuit Breakers
  - 10-Second Pending Order Grace Period Matching Engine
  - Virtual Double-Entry Token Ledger (1 Token = ₹1,000 Nominal)
  - Autonomous Session Scheduler & Background Heartbeat
  - Pre-built React + Vite Glassmorphic Frontend served at http://localhost:8000

Usage:
    python run.py
"""

import sys
import os
import time
import threading
import webbrowser
import platform

# Ensure standard output supports UTF-8 on Windows
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Ensure working directory is the repository root
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
os.chdir(BASE_DIR)
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)
backend_dir = os.path.join(BASE_DIR, "backend")
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

# Set Windows Selector Event Loop Policy to prevent loopback socket blocks
if sys.platform == "win32":
    import asyncio
    try:
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    except Exception:
        pass

def print_banner():
    banner = r"""
  ╔═══════════════════════════════════════════════════════════════════════════╗
  ║                     TRADEPILOT UNIFIED RUNNER                             ║
  ║       Intelligent Automation • Transparent Decisions • User-Controlled    ║
  ╚═══════════════════════════════════════════════════════════════════════════╝
    """
    print(banner)

def verify_frontend():
    dist_dir = os.path.join(BASE_DIR, "frontend", "dist")
    index_html = os.path.join(dist_dir, "index.html")
    if not os.path.exists(index_html):
        print("[*] Frontend distribution not found. Building with Vite...")
        os.system("npm --prefix frontend run build")
    else:
        print("[✓] Glassmorphic Frontend bundle verified at frontend/dist")

def open_browser_delayed(url, delay=1.5):
    def _open():
        time.sleep(delay)
        print(f"[*] Opening TradePilot dashboard in your web browser: {url}")
        try:
            webbrowser.open(url)
        except Exception as e:
            print(f"[!] Note: Could not auto-open browser: {e}. Please visit {url} manually.")
    t = threading.Thread(target=_open, daemon=True)
    t.start()

def main():
    print_banner()

    # Load and print configuration summary
    from backend.app.config import settings
    print(f"  [+] Target Exchange:  Delta Exchange Testnet")
    print(f"  [+] API Key:          {settings.DELTA_API_KEY[:6]}...{settings.DELTA_API_KEY[-4:]}")
    print(f"  [+] Risk Cap:         {settings.DEFAULT_RISK_PER_TRADE_PCT}% per trade | {settings.MAX_DAILY_LOSS_PCT}% daily circuit breaker")
    print(f"  [+] Grace Window:     {settings.DEFAULT_GRACE_PERIOD_SECONDS} seconds cancel/edit protection")
    print(f"  [+] Virtual Wallet:   Double-entry ledger (1 Token = ₹1,000 nominal)")
    print(f"  [+] Experience Tiers: Beginner, Medium, Pro (progressive qualification)")
    print("  " + "─" * 75)

    verify_frontend()

    import uvicorn
    print("[*] Verifying database configuration...")
    from backend.app.database import engine, Base
    Base.metadata.create_all(bind=engine)
    print("[✓] Database ready (tradepilot.db)")

    host = "127.0.0.1"
    port = 8000
    app_url = f"http://{host}:{port}"

    print(f"\n[🚀] Launching TradePilot Unified Platform on {app_url}")
    print(f"     Press CTRL+C anytime to stop.\n")

    # Launch browser automatically
    open_browser_delayed(app_url)

    # Start FastAPI with Uvicorn
    uvicorn.run(
        "backend.app.main:app",
        host=host,
        port=port,
        log_level="info",
        reload=False
    )

if __name__ == "__main__":
    main()
