# Author Studio Pro — Marketing Website & API

A premium React marketing website with a FastAPI backend, built on top of the existing `author_studio` Python toolkit.

---

## 📁 Project Structure

```
novel formatter/
├── src/                     ← React frontend (Vite)
│   ├── components/          ← All page sections + UI components
│   ├── api.js               ← Frontend API service layer
│   ├── App.jsx              ← Root component + settings state
│   └── index.css            ← CSS design system
├── backend/                 ← FastAPI backend
│   ├── main.py              ← API server (wraps author_studio modules)
│   ├── requirements.txt     ← Python dependencies
│   ├── .env.example         ← Configuration template
│   └── test_api.py          ← Smoke tests
├── public/
│   └── favicon.svg
├── index.html               ← Entry HTML with CSP headers
├── vite.config.js           ← Vite config (with /api proxy)
└── package.json
```

---

## 🚀 Quick Start

### 1. Frontend (React)

```bash
# In the project root (novel formatter/)
npm install
npm run dev
# → Opens at http://localhost:5173
```

### 2. Backend (FastAPI)

```bash
# Set up Python env
cd backend
pip install -r requirements.txt

# Copy and configure environment
cp .env.example .env

# Start the API server
python main.py
# → Runs at http://localhost:8000
# → API docs at http://localhost:8000/api/docs
```

The Vite dev server proxies `/api/*` requests to `localhost:8000` automatically — no CORS issues.

---

## 🔌 API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/templates` | All formatting templates |
| GET | `/api/genres` | All genre profiles |
| GET | `/api/market/{genre_id}` | Market data for a genre |
| POST | `/api/format` | Format manuscript → .docx download |
| POST | `/api/analyse` | Structural + AI analysis → JSON |
| POST | `/api/query/manual` | Manual query package → .zip download |
| POST | `/api/query/ai` | AI-powered query package → .zip download |

Full interactive docs: `http://localhost:8000/api/docs`

---

## 🔒 Security Features

| Feature | Implementation |
|---------|---------------|
| **CSP Headers** | Set in `index.html` |
| **Security Headers** | `X-Frame-Options`, `X-XSS-Protection`, `HSTS` via FastAPI middleware |
| **Rate Limiting** | slowapi — 10 req/min format, 5/min analyse, 3/min AI query |
| **API Key Auth** | Bearer token check, constant-time compare (`secrets.compare_digest`) |
| **File Validation** | Extension check + magic bytes (ZIP/DOCX header) |
| **Input Sanitisation** | HTML stripping, null byte removal, length limits on all text fields |
| **File Cleanup** | Background task deletion of temp files after every request |
| **CORS** | Origin whitelist only (no wildcard) |
| **Client Settings** | All preferences stored in `localStorage` with try/catch — never sent to server |

---

## ⚙️ Settings Panel

Access via the gear icon (⚙️) in the navigation bar:
- **Font Size** — Small / Default / Large / Extra Large
- **High Contrast Mode** — Boost text contrast for accessibility
- **Reduced Motion** — Disables all Framer Motion animations
- **Particle Effects** — Toggle aurora background blobs
- **Analytics Consent** — Opt-in/out of anonymous analytics
- **Data Retention** — Control how long preferences persist
- **Clear All Data** — Wipes all `localStorage` settings

---

## 🤖 AI Integration

The backend connects to [OpenRouter](https://openrouter.ai) — users bring their own API key.

Supported free models:
- `mistralai/mistral-7b-instruct:free` ← Recommended
- `meta-llama/llama-3.2-3b-instruct:free`
- `google/gemma-3-1b-it:free`
- `mistralai/mistral-nemo:free`

---

## 📦 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite 6, Framer Motion 11 |
| CSS | Vanilla CSS, CSS Custom Properties |
| Icons | react-icons (HeroIcons v2) |
| InView | react-intersection-observer |
| Backend | FastAPI, Uvicorn |
| Auth | Bearer token (python-jose ready) |
| Rate Limiting | slowapi |
| File Processing | python-docx, tempfile |
| Validation | Pydantic v2 |
