# Author Studio Pro 🖋️✨

### The Professional Manuscript Toolkit for Serious Authors

**Author Studio Pro** is a production-grade SaaS platform that transforms raw manuscripts into submission-ready query packages. Built for authors, literary agents, and publishing houses, it combines industry-standard formatting with AI-powered developmental editing — all from a single, elegant interface.

[![CI](https://github.com/likhithmamba/novel-formatter/actions/workflows/ci.yml/badge.svg)](https://github.com/likhithmamba/novel-formatter/actions)
[![License](https://img.shields.io/badge/license-Proprietary-blue.svg)](#license)

---

## 🎯 Why Author Studio Pro?

| Pain Point | Our Solution |
|------------|-------------|
| Manuscript formatting takes hours | One-click formatting to agency standards (US, UK, WGA Screenplay) |
| Query letters are guesswork | AI reads your manuscript and generates compelling query packages |
| No feedback before submission | Deep structural analysis with readability, pacing, and editorial flags |
| AI costs are unpredictable | BYOK (Bring Your Own Key) — use your own OpenRouter API key |
| Genre fit is uncertain | Real-time market intelligence with word-count benchmarking |

---

## ✨ Feature Suite

### 📄 Intelligent Manuscript Formatting
Upload a `.docx` manuscript and receive a perfectly formatted file matching stringent literary agency standards. Choose from templates including **US Standard**, **UK Standard**, **WGA Screenplay**, and more. Output includes chapter detection, proper page breaks, and industry-correct margins and font sizing.

### 📊 Deep Structural Analysis
A comprehensive analysis engine evaluates your manuscript across multiple dimensions:
- **Readability Metrics** — Flesch-Kincaid, Gunning-Fog, ARI
- **Lexical Diversity** — Type-Token Ratio and hapax legomena
- **Pacing Evaluation** — Scene length variance and dialogue-to-prose ratio
- **Editorial Flags** — Overused words, adverb density, passive voice frequency
- **Trigram Analysis** — Identifies repetitive phrase patterns

### 🤖 AI Developmental Editor
Integrates with **OpenRouter** (via BYOK architecture) to provide AI-powered critique of your manuscript's opening, midpoint, and climax sections. The AI evaluates narrative flow, character development, thematic resonance, and provides actionable revision suggestions.

### 📮 Agent Query Package Generator
Dynamically extracts story intelligence from your raw manuscript to produce:
- **One-page query letter** — Personalized, hook-driven, industry-formatted
- **Plot synopsis** — Structured single-page distillation of your story arc
- **Submission metadata** — Genre classification, word count, comp titles

Available in both **manual mode** (fill in the form) and **AI mode** (the AI reads your manuscript and generates everything).

### 📈 Market Intelligence
Real-time genre benchmarking against publishing industry standards:
- Word count viability for your genre
- Market trend data and comparable title positioning
- Agent preference alignment

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    Frontend (Vercel)                      │
│     React 18 + Vite  •  Framer Motion  •  Vanilla CSS    │
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐ │
│  │ FormatTab│  │AnalyseTab│  │ QueryTab │  │MarketTab │ │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘ │
│       └──────────────┴─────────────┴──────────────┘       │
│                        api.js                             │
└─────────────────────────┬────────────────────────────────┘
                          │ HTTPS
┌─────────────────────────┴────────────────────────────────┐
│                   Backend (Render)                        │
│              FastAPI + Uvicorn (Python)                   │
│                                                          │
│  ┌────────────┐  ┌────────────┐  ┌────────────────────┐  │
│  │ auth_routes│  │format_route│  │   ai_routes        │  │
│  │            │  │            │  │  (OpenRouter BYOK) │  │
│  └─────┬──────┘  └─────┬──────┘  └──────┬─────────────┘  │
│        │               │                │                │
│  ┌─────┴───────────────┴────────────────┴─────────┐      │
│  │   auth.py • database.py • api_utils.py         │      │
│  └────────┬──────────────────────┬────────────────┘      │
└───────────┼──────────────────────┼───────────────────────┘
            │                      │
   ┌────────┴──────┐     ┌────────┴──────┐
   │   Supabase    │     │   Razorpay    │
   │  (Auth + DB)  │     │  (Payments)   │
   └───────────────┘     └───────────────┘
```

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, Framer Motion, Vanilla CSS |
| Backend | FastAPI, Uvicorn, SlowAPI (rate limiting) |
| Database | Supabase (PostgreSQL + Auth) |
| Payments | Razorpay (INR-based subscriptions) |
| AI | OpenRouter API (BYOK — Bring Your Own Key) |
| Deployment | Vercel (frontend) + Render (backend) |
| CI/CD | GitHub Actions |

---

## 💰 Subscription Plans

Author Studio Pro operates on a **freemium SaaS model** with two paid tiers:

| Feature | Free | Studio (₹1,599/mo) | Publisher (₹4,099/mo) |
|---------|------|--------------------|-----------------------|
| Manuscript Formatting | ✅ Basic | ✅ All Templates | ✅ All Templates |
| Structural Analysis | ✅ Limited | ✅ Full Suite | ✅ Full Suite |
| AI Developmental Editor | ❌ | ✅ | ✅ Priority |
| AI Query Package | ❌ | ✅ | ✅ Priority |
| Market Intelligence | ✅ Basic | ✅ Full | ✅ Full + Trends |
| Annual Discount | — | ₹15,999/yr (2 months free) | ₹40,999/yr (2 months free) |

**Payment processing** is handled by Razorpay with server-side HMAC SHA256 signature verification and webhook support for reliable payment capture.

---

## 🔒 Security

Author Studio Pro is built with defense-in-depth:

- **JWT Authentication** — Stateless tokens with configurable expiry, no hardcoded secrets
- **BYOK AI Keys** — API keys stay in-browser, only sent transiently via encrypted form payloads
- **Content Security Policy** — Strict CSP headers preventing XSS and injection attacks
- **Security Headers** — HSTS, X-Frame-Options (DENY), X-Content-Type-Options, Referrer-Policy
- **Rate Limiting** — Multi-tier `slowapi` throttling per endpoint (Format: 10/min, AI: 3/min)
- **CORS Enforcement** — Strict-origin whitelist (no wildcards)
- **Ephemeral File Handling** — FastAPI Background Tasks aggressively purge temp files
- **Error Obfuscation** — Internal exceptions never leak to client responses
- **Email Validation** — Server-side pydantic `EmailStr` validation on all auth endpoints

---

## 🚀 Quick Start

### Prerequisites
- **Python 3.10+** with `pip`
- **Node.js 18+** with `npm`
- **Supabase** project (free tier works)
- **Razorpay** account (for payment testing)

### 1. Clone & Setup Backend

```bash
git clone https://github.com/likhithmamba/novel-formatter.git
cd novel-formatter/backend

# Create virtual environment
python -m venv venv

# Activate (Windows)
.\venv\Scripts\Activate.ps1
# Activate (macOS/Linux)
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your actual keys (see Environment Variables below)

# Start the API server
python -m uvicorn main:app --reload --port 8000
```

> **API Docs:** http://localhost:8000/api/docs

### 2. Setup Frontend

```bash
# From the repository root
npm install
npm run dev
```

> **App:** http://localhost:5173 (Vite proxies `/api/*` to the backend automatically)

### 3. Database Setup

Run the Supabase migration against your project:

```bash
# Using the Supabase CLI
supabase db push

# Or execute manually via the Supabase SQL Editor:
# Copy contents of supabase/migrations/001_initial.sql
```

---

## ⚙️ Environment Variables

### Backend (Render / `.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `JWT_SECRET_KEY` | ✅ | 64-character hex key for JWT signing. Generate: `python -c "import secrets; print(secrets.token_hex(32))"` |
| `SUPABASE_URL` | ✅ | Your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Supabase service role key (not the anon key) |
| `RAZORPAY_KEY_ID` | ✅ | Razorpay API key ID |
| `RAZORPAY_KEY_SECRET` | ✅ | Razorpay API key secret |
| `ALLOWED_ORIGINS` | ✅ | Comma-separated list of allowed frontend origins |
| `PORT` | ❌ | Server port (default: `8000`, Render sets this automatically) |

### Frontend (Vercel / `.env.production`)

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_URL` | ✅ | Full URL to the backend (e.g., `https://your-app.onrender.com`) |
| `VITE_RAZORPAY_KEY_ID` | ✅ | Razorpay public key ID for client-side checkout |

> ⚠️ **Never commit `.env` or `.env.production` with real values.** Use your hosting platform's environment variable management.

---

## 🧪 Testing

```bash
# Backend tests (from repo root)
pytest --tb=short -q

# Frontend build verification
npm run build
```

Tests are configured via `pytest.ini` at the repo root. The CI pipeline runs both backend tests and frontend build checks on every pull request.

---

## 🌐 Deployment

### Frontend → Vercel

1. Connect your GitHub repository to Vercel
2. Set the **Build Command**: `npm run build`
3. Set the **Output Directory**: `dist`
4. Configure environment variables (`VITE_API_URL`, `VITE_RAZORPAY_KEY_ID`)
5. Deploy

### Backend → Render

1. Connect your GitHub repository to Render
2. The `render.yaml` blueprint auto-configures the service
3. Set all required environment variables in the Render dashboard
4. Deploy

### Razorpay Webhook

After deployment, configure your Razorpay webhook:
- **URL**: `https://your-render-service.onrender.com/api/webhook/razorpay`
- **Events**: `payment.captured`, `payment.failed`

---

## 📁 Project Structure

```
author-studio-pro/
├── src/                          # React frontend
│   ├── components/               # UI components (40+ files)
│   │   ├── FormatTab.jsx         # Manuscript formatting
│   │   ├── AnalyseTab.jsx        # Structural analysis
│   │   ├── QueryTab.jsx          # Query package generator
│   │   ├── MarketTab.jsx         # Market intelligence
│   │   ├── AuthModal.jsx         # Login/register modal
│   │   ├── Pricing.jsx           # Subscription plans
│   │   └── ...
│   ├── contexts/AuthContext.jsx  # Authentication state
│   ├── api.js                    # API service layer
│   ├── App.jsx                   # Root component + routing
│   └── main.jsx                  # Entry point
├── backend/                      # FastAPI backend
│   ├── main.py                   # App orchestration + payments
│   ├── auth.py                   # JWT + password hashing
│   ├── database.py               # Supabase persistence
│   ├── rate_limiter.py           # SlowAPI configuration
│   ├── api_utils.py              # Shared utilities
│   ├── routers/
│   │   ├── auth_routes.py        # Registration, login, /me
│   │   ├── format_routes.py      # Manuscript formatting
│   │   └── ai_routes.py          # AI analysis + query gen
│   └── requirements.txt
├── supabase/migrations/          # Database schema
│   └── 001_initial.sql
├── public/                       # Static assets
│   ├── favicon.svg
│   ├── robots.txt
│   └── sitemap.xml
├── .github/workflows/ci.yml      # CI/CD pipeline
├── render.yaml                   # Render deployment blueprint
├── vercel.json                   # Vercel SPA config
├── vite.config.js                # Vite + proxy config
└── pytest.ini                    # Test runner config
```

---

## 📋 API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/health` | ❌ | Health check |
| `GET` | `/api/templates` | ❌ | List formatting templates |
| `GET` | `/api/genres` | ❌ | List supported genres |
| `GET` | `/api/market/{genre}` | ❌ | Market data for a genre |
| `POST` | `/api/format` | ❌ | Format a manuscript |
| `POST` | `/api/analyse` | ❌ | Analyse a manuscript |
| `POST` | `/api/query/manual` | ❌ | Generate manual query package |
| `POST` | `/api/query/ai` | ❌ | AI-generated query package |
| `POST` | `/api/auth/register` | ❌ | Create account |
| `POST` | `/api/auth/login` | ❌ | Authenticate |
| `GET` | `/api/auth/me` | ✅ | Current user + subscription |
| `POST` | `/api/create-order` | ✅ | Create Razorpay payment order |
| `POST` | `/api/verify-payment` | ✅ | Verify payment signature |
| `POST` | `/api/webhook/razorpay` | 🔐 | Razorpay webhook handler |
| `POST` | `/api/ai/validate-key` | ❌ | Validate OpenRouter API key |

> **Interactive docs:** `/api/docs` (Swagger UI) • `/api/redoc` (ReDoc)

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

The CI pipeline will automatically run backend tests and frontend build checks on your PR.

---

## 📄 License

Author Studio Pro is proprietary software. All rights reserved.

© 2026 Likhith Mamba. Unauthorized reproduction or distribution is prohibited.

---

<p align="center">
  <strong>Author Studio Pro</strong> — Professional manuscript tools for the modern author.<br>
  <em>Format. Analyse. Query. Publish.</em>
</p>
