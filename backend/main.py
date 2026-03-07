# ─────────────────────────────────────────────────────────────────────────────
# Author Studio Pro — FastAPI Backend  (v2 — corrected against actual source)
# ─────────────────────────────────────────────────────────────────────────────
# Run:  uvicorn main:app --reload --port 8000
# ─────────────────────────────────────────────────────────────────────────────

import os, sys, io, re, json, time, uuid, tempfile, zipfile, secrets, logging, hmac, hashlib
from pathlib import Path
from typing import Optional, List
from datetime import datetime, timedelta
from functools import lru_cache

from fastapi import (
    FastAPI, File, UploadFile, Form, HTTPException,
    Depends, Request, BackgroundTasks, status,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from dotenv import load_dotenv
from pydantic import BaseModel

load_dotenv()

# ─── Local modules ────────────────────────────────────────────────────────────
from auth import (
    create_access_token, verify_token,
    get_password_hash, verify_password,
)
from database import (
    get_supabase, create_user, get_user_by_email, get_user_by_id,
    create_subscription, get_active_subscription,
    update_subscription_status, get_subscription_by_order_id,
)

# ─── Razorpay client ──────────────────────────────────────────────────────────
try:
    import razorpay
    RAZORPAY_KEY_ID = os.getenv("RAZORPAY_KEY_ID", "")
    RAZORPAY_KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET", "")
    razorpay_client = (
        razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))
        if RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET
        else None
    )
except ImportError:
    razorpay_client = None
    RAZORPAY_KEY_ID = ""
    RAZORPAY_KEY_SECRET = ""

sys.path.insert(0, str(Path(__file__).parent.parent / "raw claude novel editor pro" / "author_studio"))

# ─── Logging ──────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("author-studio-api")

# ─── Rate limiter ────────────────────────────────────────────────────────────
from rate_limiter import limiter

# ─── Routers ──────────────────────────────────────────────────────────────────
from routers.auth_routes import router as auth_router
from routers.format_routes import router as format_router
from routers.ai_routes import router as ai_router

# ─── App ──────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="Author Studio Pro API",
    description="Professional manuscript formatting, analysis, and query generation.",
    version="2.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception on {request.method} {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal server error occurred."}
    )

app.include_router(auth_router)
app.include_router(format_router)
app.include_router(ai_router)

# ─── CORS ─────────────────────────────────────────────────────────────────────
ALLOWED_ORIGINS = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:5173,http://localhost:5174"
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

# ─── Security headers ─────────────────────────────────────────────────────────
@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response

# ─── Request logging ──────────────────────────────────────────────────────────
@app.middleware("http")
async def log_requests(request: Request, call_next):
    rid = str(uuid.uuid4())[:8]
    t0 = time.time()
    logger.info(f"[{rid}] {request.method} {request.url.path}")
    try:
        response = await call_next(request)
        logger.info(f"[{rid}] ← {response.status_code} ({(time.time()-t0)*1000:.1f}ms)")
        return response
    except Exception as exc:
        logger.error(f"[{rid}] error: {exc}")
        raise

from api_utils import (
    require_api_key, validate_upload, check_magic,
    san, save_tmp, rm, _mods, _parse_upload
)


# ═══════════════════════════════════════════════════════════════════════════════
# META, MARKET, FORMAT (Moved to routers/format_routes.py)
# ═══════════════════════════════════════════════════════════════════════════════


# ═══════════════════════════════════════════════════════════════════════════════
# ANALYSE & QUERY (Moved to routers/ai_routes.py)
# ═══════════════════════════════════════════════════════════════════════════════


# ═══════════════════════════════════════════════════════════════════════════════
# STARTUP / SHUTDOWN
# ═══════════════════════════════════════════════════════════════════════════════

@app.on_event("startup")
async def _startup():
    logger.info(f"Author Studio Pro API v2.0 starting")
    logger.info(f"Allowed origins: {ALLOWED_ORIGINS}")


@app.on_event("shutdown")
async def _shutdown():
    logger.info("Author Studio Pro API shutting down")


# ═══════════════════════════════════════════════════════════════════════════════
# AUTHENTICATION (Moved to routers/auth_routes.py)
# ═══════════════════════════════════════════════════════════════════════════════


# ═══════════════════════════════════════════════════════════════════════════════
# RAZORPAY PAYMENT
# ═══════════════════════════════════════════════════════════════════════════════

# Plan amounts in paise (₹1 = 100 paise)
# Using INR equivalents:  $19 ≈ ₹1,599  |  $49 ≈ ₹4,099
PLAN_AMOUNTS = {
    "studio_monthly":    159900,   # ₹1,599
    "studio_annual":    1599900,   # ₹15,999  (≈ $19 × 10 months, 2 free)
    "publisher_monthly":  409900,  # ₹4,099
    "publisher_annual":  4099900,  # ₹40,999  (≈ $49 × 10 months, 2 free)
}

PLAN_LABELS = {
    "studio_monthly": "Studio — Monthly",
    "studio_annual": "Studio — Annual",
    "publisher_monthly": "Publisher — Monthly",
    "publisher_annual": "Publisher — Annual",
}


class CreateOrderRequest(BaseModel):
    plan_id: str           # e.g. "studio_monthly"


class VerifyPaymentRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str


@app.post("/api/create-order", tags=["Payment"])
@limiter.limit("10/minute")
async def create_order(request: Request, body: CreateOrderRequest):
    """Create a Razorpay order for the selected plan."""
    if not razorpay_client:
        raise HTTPException(503, "Payment gateway not configured")

    user = get_current_user(request)
    plan_id = body.plan_id

    if plan_id not in PLAN_AMOUNTS:
        raise HTTPException(400, f"Invalid plan: {plan_id}. Valid plans: {list(PLAN_AMOUNTS.keys())}")

    # Check for existing active subscription
    existing = get_active_subscription(user["id"])
    if existing and existing["plan"] == plan_id.split("_")[0]:
        raise HTTPException(409, "You already have an active subscription for this plan")

    try:
        order = razorpay_client.order.create({
            "amount": PLAN_AMOUNTS[plan_id],
            "currency": "INR",
            "receipt": f"asp_{user['id'][:8]}_{int(time.time())}",
            "notes": {
                "user_id": user["id"],
                "plan_id": plan_id,
                "plan_label": PLAN_LABELS.get(plan_id, plan_id),
            },
        })

        # Pre-create a pending subscription
        create_subscription(
            user_id=user["id"],
            plan=plan_id,
            razorpay_order_id=order["id"],
        )
        # Mark it as pending immediately
        sub = get_subscription_by_order_id(order["id"])
        if sub:
            update_subscription_status(sub["id"], "pending")

        return {
            "order_id": order["id"],
            "amount": order["amount"],
            "currency": order["currency"],
            "key_id": RAZORPAY_KEY_ID,
            "plan_label": PLAN_LABELS.get(plan_id, plan_id),
        }
    except Exception as e:
        logger.exception("Razorpay order creation failed")
        raise HTTPException(500, f"Payment order creation failed: {str(e)[:200]}")


@app.post("/api/verify-payment", tags=["Payment"])
@limiter.limit("10/minute")
async def verify_payment(request: Request, body: VerifyPaymentRequest):
    """
    Verify Razorpay payment signature using HMAC SHA256.
    The signature is: HMAC_SHA256(order_id + "|" + payment_id, key_secret)
    """
    if not RAZORPAY_KEY_SECRET:
        raise HTTPException(503, "Payment gateway not configured")

    user = get_current_user(request)

    # ── HMAC SHA256 verification ─────────────────────────────────────────────
    message = f"{body.razorpay_order_id}|{body.razorpay_payment_id}"
    expected_signature = hmac.new(
        RAZORPAY_KEY_SECRET.encode("utf-8"),
        message.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()

    if not hmac.compare_digest(expected_signature, body.razorpay_signature):
        logger.warning(f"Payment signature mismatch for order {body.razorpay_order_id}")
        raise HTTPException(400, "Payment verification failed — invalid signature")

    # ── Activate subscription ────────────────────────────────────────────────
    sub = get_subscription_by_order_id(body.razorpay_order_id)
    if not sub:
        raise HTTPException(404, "No subscription found for this order")

    if sub["user_id"] != user["id"]:
        raise HTTPException(403, "Subscription does not belong to this user")

    # Calculate expiry based on plan type
    plan_id = sub["plan"]
    if "annual" in plan_id:
        expires = (datetime.utcnow() + timedelta(days=365)).isoformat()
    else:
        expires = (datetime.utcnow() + timedelta(days=30)).isoformat()

    # Update subscription to active + set payment ID and expiry
    sb = get_supabase()
    sb.table("subscriptions").update({
        "status": "active",
        "razorpay_payment_id": body.razorpay_payment_id,
        "expires_at": expires,
    }).eq("id", sub["id"]).execute()

    logger.info(f"Payment verified for user {user['id']}, plan {plan_id}")

    return {
        "success": True,
        "plan": plan_id,
        "plan_label": PLAN_LABELS.get(plan_id, plan_id),
        "expires_at": expires,
        "message": "Payment verified successfully! Your subscription is now active.",
    }


@app.post("/api/webhook/razorpay", tags=["Payment"])
async def razorpay_webhook(request: Request):
    """
    Razorpay webhook handler for async payment events.
    Verifies webhook signature and updates subscription status.
    """
    if not RAZORPAY_KEY_SECRET:
        raise HTTPException(503, "Payment gateway not configured")

    body = await request.body()
    signature = request.headers.get("X-Razorpay-Signature", "")

    # Verify webhook signature
    expected = hmac.new(
        RAZORPAY_KEY_SECRET.encode("utf-8"),
        body,
        hashlib.sha256,
    ).hexdigest()

    if not hmac.compare_digest(expected, signature):
        logger.warning("Webhook signature verification failed")
        raise HTTPException(400, "Invalid webhook signature")

    try:
        event = json.loads(body)
        event_type = event.get("event", "")
        payload = event.get("payload", {})

        if event_type == "payment.captured":
            payment = payload.get("payment", {}).get("entity", {})
            order_id = payment.get("order_id", "")
            payment_id = payment.get("id", "")

            sub = get_subscription_by_order_id(order_id)
            if sub and sub["status"] != "active":
                plan_id = sub["plan"]
                if "annual" in plan_id:
                    expires = (datetime.utcnow() + timedelta(days=365)).isoformat()
                else:
                    expires = (datetime.utcnow() + timedelta(days=30)).isoformat()

                sb = get_supabase()
                sb.table("subscriptions").update({
                    "status": "active",
                    "razorpay_payment_id": payment_id,
                    "expires_at": expires,
                }).eq("id", sub["id"]).execute()
                logger.info(f"Webhook: activated subscription {sub['id']}")

        elif event_type == "payment.failed":
            payment = payload.get("payment", {}).get("entity", {})
            order_id = payment.get("order_id", "")
            sub = get_subscription_by_order_id(order_id)
            if sub:
                update_subscription_status(sub["id"], "failed")
                logger.info(f"Webhook: payment failed for subscription {sub['id']}")

        logger.info(f"Webhook processed: {event_type}")
        return {"status": "ok"}

    except Exception as e:
        logger.exception("Webhook processing error")
        return {"status": "error", "detail": str(e)[:200]}


# ═══════════════════════════════════════════════════════════════════════════════
# AI KEY VALIDATION
# ═══════════════════════════════════════════════════════════════════════════════

class ValidateKeyRequest(BaseModel):
    api_key: str
    provider: str = "openrouter"  # currently only openrouter


@app.post("/api/ai/validate-key", tags=["AI"])
@limiter.limit("5/minute")
async def validate_ai_key(request: Request, body: ValidateKeyRequest):
    """
    Server-side validation of an AI API key.
    Makes a lightweight test request to the provider.
    """
    import requests as http_requests

    if body.provider == "openrouter":
        try:
            resp = http_requests.get(
                "https://openrouter.ai/api/v1/models",
                headers={"Authorization": f"Bearer {body.api_key}"},
                timeout=10,
            )
            if resp.status_code == 200:
                return {"valid": True, "provider": "openrouter", "message": "API key is valid"}
            else:
                return {"valid": False, "provider": "openrouter", "message": f"Key validation failed (HTTP {resp.status_code})"}
        except Exception as e:
            return {"valid": False, "provider": "openrouter", "message": f"Could not reach provider: {str(e)[:100]}"}
    else:
        raise HTTPException(400, f"Unsupported provider: {body.provider}")


# ─── Entry ────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=os.getenv("HOST", "0.0.0.0"),
        port=int(os.getenv("PORT", "8000")),
        reload=os.getenv("RELOAD", "true").lower() == "true",
        log_level="info",
    )
