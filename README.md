# TradePilot: Intelligent Cryptocurrency Algorithmic Trading Platform

TradePilot is a premium, beginner-friendly yet technically sophisticated cryptocurrency algorithmic trading platform integrated with Delta Exchange APIs and Delta Exchange Testnet.

**Core Promise:** Intelligent automation, transparent decisions, and user-controlled trading.

---

## 🌟 Key Architecture & Capabilities

### 1. Three User Experience Tiers (Unified Interface)
- **Beginner Mode:**
  - Guided onboarding walkthrough & interactive tour.
  - Plain-English trading signal explanations on every alert.
  - Defensive, Balanced, and Active trading profiles.
  - Enforced 10-second pending-order grace period for human oversight.
  - Built-in educational glossary drawer explaining key crypto trading terms.
  - Simplified portfolio solvency and P&L overview.
- **Medium Mode:**
  - Configurable technical parameters (EMA fast/slow, RSI thresholds, ADX trend strength, Donchian channels, ATR volatility multiplier).
  - Detailed order lifecycle controls (Limit, Market, Stop-Loss, Take-Profit).
  - Interactive backtesting engine with realistic slippage and exchange fee deductions.
  - Explanations of signal generation and risk rejection reasons.
- **Pro Mode:**
  - Advanced candlestick chart with timeframes (1m, 15m, 1h, 1d) via Lightweight Charts.
  - Granular long/short entry & exit condition builders.
  - Complete backtest reports (Sharpe ratio, max drawdown, win rate, profit factor, equity curves).
  - Execution analytics, gross portfolio exposure meters, and raw audit event logs.
- **Experience Progression Rule:** Users are never automatically promoted merely because time has elapsed. Progression to Medium or Pro requires demonstrated milestones and explicit user consent.

---

### 2. Mandatory Risk Management Engine
Every automated and assisted trade proposal must pass through a strict backend-enforced 10-point risk check suite before submission:
1. **Risk per trade limit:** Projected loss is capped (default 0.5%, hard cap 2.0% of portfolio equity).
2. **Daily loss circuit breaker:** Halts trading automatically if daily losses reach 2.0%.
3. **Gross exposure ceiling:** Active positions cannot exceed 20% of total portfolio equity.
4. **Max leverage check:** Restricts leverage to safe bounds (default 1x - 3x).
5. **Max concurrent positions check:** Restricts concurrent active trades (default 2 positions).
6. **Maximum order quantity check:** Enforces contract sizing constraints.
7. **Available margin check:** Verifies token solvency prior to order staging.
8. **Mandatory Stop-Loss requirement:** Every order proposal MUST define a mathematically valid stop-loss. Orders without stop-losses are rejected immediately.
9. **Spread & stale data protection:** Blocks execution if bid-ask spread widens beyond 0.35%.
10. **Emergency stop lock:** Blocks all new entries when emergency stop is active.

---

### 3. Full Transaction Intervention & 10-Second Grace Period
- **10-Second Grace Countdown Banner:** When a strategy triggers, an order enters `proposal_grace` status with a live 10-second countdown.
- **Edit Queued Proposal:** Users can modify limit price, quantity, stop-loss, or take-profit before submission.
- **Cancel Proposal:** Users can cancel proposals before they reach the exchange.
- **Execute Now:** Users can skip the remaining countdown timer to submit immediately.
- **Backend Re-Validation:** When the grace period ends, the backend automatically re-checks all 10 risk rules before sending to the exchange.
- **Emergency Stop Safety:**
  - Instantly blocks new strategy entries.
  - Cancels all open proposals and orders.
  - Configurable policy: Market Close all positions immediately or Keep Protective Stop-Losses intact.
  - Requires explicit user authorization to reset.

---

### 4. Strategies & Unified Multi-Tier Explanations
- **Strategy 1: EMA Crossover + RSI:**
  - Fast EMA (default 9) & Slow EMA (default 21).
  - RSI momentum filter (period 14, overbought 70, oversold 30).
  - Optional ADX trend-strength filter (measures trend strength, not direction; threshold > 25).
- **Strategy 2: Donchian Breakout + ATR:**
  - 20-period Donchian channel breakout.
  - 14-period Average True Range (ATR) dynamic stop distance multiplier (e.g. 2.0x ATR).
- **Unified 3-Tier Explanation for Every Signal:**
  - **Plain-English:** What the bot detected, why it matters, what could invalidate it, and next steps.
  - **Technical:** Exact indicator readings, thresholds, timestamps, and parameters.
  - **Risk:** Proposed order sizing, dollar risk %, gross exposure %, and margin check status.

---

### 5. Automated Session Scheduler
- Run automated trading sessions on the backend without needing the browser to remain open.
- Set start time, end time, duration, timezone, strategy, profile, and maximum session loss budgets.
- Supports recurring sessions (e.g. weekdays).
- When a session ends, the backend halts new trade entries while preserving protective stops on existing positions.

---

### 6. Virtual Token Wallet & Auditable Double-Entry Ledger
- **Virtual Simulated Token System:**
  - 1 Token = ₹1,000 INR nominal demo valuation.
  - Genesis balance: 40 Tokens (~₹40,000 nominal).
- **Accounting Integrity:**
  - Balances are strictly derived from an immutable database ledger (`WalletLedger`).
  - Total tokens, Available tokens, Allocated margin tokens.
  - Strict rule: Unrealized gains are **never** credited as spendable balance.
  - Top-up simulated test tokens or simulate demo debits.
  - Prominent regulatory disclaimer: Tokens have no legal monetary value, represent no claim on monetary funds, and cannot be redeemed for real currency.

---

### 7. Delta Exchange Testnet Integration
- Directly targets Delta Exchange Testnet REST & WebSocket endpoints (`https://cdn.testnet.delta.exchange` / `https://api.testnet.delta.exchange`).
- HMAC-SHA256 signature generator for authenticated testnet requests.
- High-fidelity simulated testnet matching engine fallback when testnet keys are not configured.
- Clear distinction between live testnet feeds and simulated feeds.

---

## 🔑 API Key & User Configuration

TradePilot is designed to work with Delta Exchange and Delta Exchange Testnet. **Users must supply their own API keys**:

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Open `.env` and enter your Delta Exchange API credentials:
   ```env
   DELTA_API_KEY=your_delta_exchange_api_key_here
   DELTA_API_SECRET=your_delta_exchange_api_secret_here
   ENVIRONMENT=testnet
   ```
   > **How to get keys:** Sign up or log into [https://testnet.delta.exchange](https://testnet.delta.exchange), head to `Settings -> API Keys`, and generate your testnet key.
   >
   > **Security Notice:** Never commit your `.env` file or private credentials to GitHub. The project includes a pre-configured `.gitignore` to protect sensitive local files.

---

## 🚀 One-Click Execution (Single File Runner)

You can launch the complete TradePilot platform (FastAPI backend + Delta Exchange Testnet integration + Glassmorphic React frontend) with **one single command**:

```bash
python run.py
```

This single runner:
1. Loads user environment configuration from `.env`.
2. Initializes the database tables and genesis token ledger.
3. Verifies the pre-built glassmorphic React frontend in `frontend/dist/`.
4. Starts the unified server on `http://localhost:8000`.
5. Automatically opens your default web browser to the TradePilot login screen!

---

### Manual / Developer Setup (Optional)

### Prerequisites
- Python 3.10+
- Node.js 18+ & npm

### Backend Setup
```bash
# Navigate to backend directory
cd backend

# Run the FastAPI server
python run_server.py
```
FastAPI server will be running at `http://localhost:8000` with interactive Swagger docs at `http://localhost:8000/docs`.

### Frontend Setup
```bash
# Navigate to frontend directory
cd frontend

# Install dependencies (already bundled)
npm install

# Start Vite development server
npm run dev
```
The React frontend will be accessible at `http://localhost:3000`.

### Production Single-Port Serving
The frontend has already been built into `frontend/dist/`. The FastAPI backend will automatically serve the full React application directly at `http://localhost:8000/`!

---

## 📂 Project Structure

```
tradepilot/
├── backend/
│   ├── app/
│   │   ├── main.py                  # FastAPI app, routers, WebSocket & static dist serving
│   │   ├── config.py                # App configuration, risk caps, Delta Testnet URLs
│   │   ├── database.py              # SQLite / SQLAlchemy database session
│   │   ├── models.py                # UserConfig, Strategy, Order, Position, WalletLedger, Session, Achievement
│   │   ├── schemas.py               # Pydantic request & response validation schemas
│   │   ├── services/
│   │   │   ├── delta_client.py      # Delta Exchange Testnet client & simulated matching engine
│   │   │   ├── risk_manager.py      # 10-point mandatory risk check engine
│   │   │   ├── strategy_engine.py   # EMA Crossover + RSI, Donchian + ATR, ADX & Backtester
│   │   │   ├── explanation_service.py # Dual-tier signal explanations
│   │   │   ├── wallet_service.py    # Auditable token ledger & solvency calculations
│   │   │   ├── execution_engine.py  # 10s grace period countdown, order fills, emergency stop
│   │   │   ├── scheduler_service.py # Autonomous background session runner
│   │   │   └── achievement_service.py # Responsible learning badges & tier progression
│   │   └── routers/                 # Typed API endpoints (Dashboard, Orders, Strategies, etc.)
│   ├── run_server.py                # Uvicorn entrypoint
│   └── test_pipeline.py             # Complete backend verification suite
└── frontend/
    ├── src/
    │   ├── components/              # Navbar, Sidebar, TradingChart, GraceBanner, Modals
    │   ├── context/AppContext.tsx   # Global theme, tier, wallet, ticker, and emergency stop state
    │   ├── pages/                   # 10 application pages
    │   ├── services/api.ts          # Typed REST API service layer
    │   ├── types/index.ts           # TypeScript interfaces
    │   ├── App.tsx                  # React Router layout
    │   └── main.tsx                 # React DOM root
    ├── dist/                        # Production optimized build bundle
    ├── package.json
    ├── tailwind.config.js
    └── vite.config.ts
```
