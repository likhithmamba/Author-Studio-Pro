# Author Studio Pro 🖋️✨

A premium, production-ready React marketing website and interactive tool suite built on top of the proprietary `author_studio` Python manuscript toolkit. Author Studio Pro bridges the gap between raw manuscript files and submission-ready query packages, leveraging local formatting logic alongside AI-powered developmental editing.

---

## 🏗️ Architecture Design

The project employs a completely decoupled, modular architecture adhering to enterprise standards.

### Frontend (React 18 + Vite)
- **Component-Based UI:** The massive interactive `Tools` suite is split logically into dedicated tabs (`FormatTab`, `AnalyseTab`, `QueryTab`, `MarketTab`) and shared UI components, maximizing React rendering performance and code maintainability.
- **Robust API Service Layer:** A centralized `api.js` intercepts all backend communication, effectively translating network timeouts and HTTP errors into graceful, user-friendly frontend alerts.
- **State Management:** Critical preferences—such as API keys and UI preferences—are strictly bound to local scope (`localStorage`) with no server transmission unless explicitly required by an AI endpoint.
- **Aesthetics & Motion:** Built completely vanilla CSS with meticulously hand-crafted `framer-motion` micro-interactions, avoiding heavy utility-class library bloat.

### Backend (FastAPI)
- **Modular Routing:** The monolithic backend `main.py` acts purely as an orchestration layer, deferring core business logic to dedicated, decoupled modular routers (`auth_routes.py`, `format_routes.py`, `ai_routes.py`).
- **Global Error Handling:** Application-wide exception interception guarantees the frontend reliably receives standard JSON responses (e.g., `{"detail": "Internal Server Error"}`), completely eliminating unhandled edge-case connection drops.
- **Strict Network Policies:** External integrations (such as OpenRouter AI generation) are hardened with strictly enforced 60-second timeouts, preventing hanging backend worker threads.
- **Dependency Inversion:** Dedicated utility extraction (`api_utils.py` and decoupled `rate_limiter.py`) cleanly prevents circular import dependencies across endpoints.

---

## ✨ Core Features

1. **Intelligent Manuscript Formatting:** Instant `.docx` parsing and restructuring to meet stringent Literary Agency standards (US standard, UK standard, WGA Screenplay, etc.).
2. **Deep Structural Analysis:** Generates readability metrics, lexical diversity, pacing evaluation, and editorial flags running entirely locally.
3. **AI Developmental Editor:** Integrates with OpenRouter (using Bring Your Own Key / BYOK architecture) to synthetically read, digest, and critique opening, midpoint, and climax sections.
4. **Agent Query Package Generation:** Dynamically extracts story intelligence from raw manuscripts to write compelling query letters and 1-page plot synopses without requiring manual author forms.
5. **Market Intelligence Database:** Real-time genre benchmarking and length viability feedback based on built-in publishing industry standards.

---

## 🔒 Security Hardening

- **Stateless Authentication:** JWT-based user session handling tightly integrated with Supabase identity services.
- **BYOK (Bring Your Own Key):** API keys are kept strictly local in the client browser, only sent within transient form payloads, and immediately flushed from server memory.
- **Automated Resource Janitors:** Ephemeral file drops utilize temporary file directories that are aggressively purged from the server filesystem using FastAPI Background Tasks upon request completion.
- **Strict Request Throttling:** Multi-tier rate limits (`slowapi`) dynamically protect endpoints based on computational intensity (e.g., Format=10/min, Analysis=5/min, AI Generation=3/min).
- **CORS Enforcements:** Preconfigured strict-origin whitelisting instead of wildcard accepts.

---

## 🚀 Quick Start Guide

### 1. Backend (FastAPI setup)

```bash
cd backend

# Create and activate virtual environment
python -m venv venv
.\venv\Scripts\Activate.ps1  # Windows

# Install Python requirements
pip install -r requirements.txt

# Configure secret keys (Duplicate .env.example)
cp .env.example .env

# Launch Uvicorn in standard development mode
python -m uvicorn main:app --reload --port 8000
```
*(The backend acts as the service and will listen on `localhost:8000`. API Documentation is accessible dynamically via `http://localhost:8000/api/docs`)*

### 2. Frontend (React setup)

```bash
# From the root directory
npm install

# Launch Vite development server
npm run dev
```
*(Vite seamlessly proxies all `/api/*` network requests safely to the FastAPI backend, bypassing CORS constraints natively in development).*

---

## 💡 Environment Configuration Checklist

Before deployment, ensure the following `.env` parameters are verified:
- `API_KEY`: Studio-level master authorization key for premium components.
- `JWT_SECRET_KEY`: High-entropy key for JSON Web Token signatures.
- `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY`: Supabase persistence configuration.
- `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET`: Razorpay payment infrastructure logic.
- `ALLOWED_ORIGINS`: Safe, strict list for production frontend domain instances.

*Author Studio Pro is engineered designed with excellence, modularity, and aesthetic superiority at its absolute core.*
