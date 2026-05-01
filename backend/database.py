# ─── Supabase + Auth ────────────────────────────────────────
from supabase import create_client, Client
from typing import Optional
import os

_client = None


def get_supabase() -> Client:
    """Return a cached Supabase client."""
    global _client
    if _client is None:
        url = os.getenv("SUPABASE_URL", "")
        key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
        is_mock = os.getenv("DEVELOPER_MOCK_AUTH", "false").lower() == "true"
        env = os.getenv("ENVIRONMENT", "development").lower()

        # mock mode is disabled in production
        is_mock = is_mock and env != "production"

        if not (url and key) and not is_mock:
            raise RuntimeError(
                "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env"
            )
        
        if is_mock and not (url and key):
            # Return a dummy object in mock mode if keys are missing to avoid crash
            return None

        _client = create_client(url, key)
    return _client


# ═══════════════════════════════════════════════════════════════════════════════
# USER CRUD
# ═══════════════════════════════════════════════════════════════════════════════

def create_user(email: str, password_hash: str) -> dict:
    """Insert a new user row. Returns the created row."""
    sb = get_supabase()
    result = sb.table("users").insert({
        "email": email,
        "password_hash": password_hash,
    }).execute()
    if not result.data:
        raise ValueError("Failed to create user — email may already exist")
    return result.data[0]


def get_user_by_email(email: str) -> Optional[dict]:
    """Fetch a user by email. Returns None if not found."""
    env = os.getenv("ENVIRONMENT", "development").lower()
    if os.getenv("DEVELOPER_MOCK_AUTH", "false").lower() == "true" and env != "production":
        mock_email = os.getenv("MOCK_DEMO_EMAIL", "demo@example.com").lower()
        if email.lower() == mock_email:
            return {
                "id": "00000000-0000-0000-0000-000000000000",
                "email": mock_email,
                "password_hash": os.getenv("MOCK_DEMO_PASSWORD_HASH", "$2b$12$rmoaMSqN5lT2OPA1gddlUMOmGG6xHYgwXWthXeiOROibsGzU"),
                "created_at": "2024-01-01T00:00:00Z"
            }

    sb = get_supabase()
    if not sb: return None
    result = sb.table("users").select("*").eq("email", email).execute()
    return result.data[0] if result.data else None


def get_user_by_id(user_id: str) -> Optional[dict]:
    """Fetch a user by UUID."""
    env = os.getenv("ENVIRONMENT", "development").lower()
    if os.getenv("DEVELOPER_MOCK_AUTH", "false").lower() == "true" and env != "production":
        if user_id == "00000000-0000-0000-0000-000000000000":
            return {
                "id": "00000000-0000-0000-0000-000000000000",
                "email": os.getenv("MOCK_DEMO_EMAIL", "demo@example.com"),
                "created_at": "2024-01-01T00:00:00Z"
            }

    sb = get_supabase()
    if not sb: return None
    result = sb.table("users").select("*").eq("id", user_id).execute()
    return result.data[0] if result.data else None


# ═══════════════════════════════════════════════════════════════════════════════
# SUBSCRIPTION CRUD
# ═══════════════════════════════════════════════════════════════════════════════

def create_subscription(
    user_id: str,
    plan: str,
    razorpay_order_id: str = "",
    razorpay_payment_id: str = "",
    expires_at: Optional[str] = None,
) -> dict:
    """Insert a new subscription row."""
    sb = get_supabase()
    row = {
        "user_id": user_id,
        "plan": plan,
        "status": "active",
        "razorpay_order_id": razorpay_order_id,
        "razorpay_payment_id": razorpay_payment_id,
    }
    if expires_at:
        row["expires_at"] = expires_at
    result = sb.table("subscriptions").insert(row).execute()
    return result.data[0] if result.data else {}


def get_active_subscription(user_id: str) -> Optional[dict]:
    """Get the active subscription for a user (if any)."""
    env = os.getenv("ENVIRONMENT", "development").lower()
    if os.getenv("DEVELOPER_MOCK_AUTH", "false").lower() == "true" and env != "production":
        if user_id == "00000000-0000-0000-0000-000000000000":
            return {
                "id": "mock-sub-id",
                "user_id": user_id,
                "plan": "studio",
                "status": "active",
                "created_at": "2024-01-01T00:00:00Z"
            }

    sb = get_supabase()
    if not sb: return None
    result = (
        sb.table("subscriptions")
        .select("*")
        .eq("user_id", user_id)
        .eq("status", "active")
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    return result.data[0] if result.data else None


def update_subscription_status(subscription_id: str, status: str) -> None:
    """Update the status of a subscription (active/cancelled/expired)."""
    sb = get_supabase()
    sb.table("subscriptions").update({"status": status}).eq("id", subscription_id).execute()


def get_subscription_by_order_id(razorpay_order_id: str) -> Optional[dict]:
    """Look up a subscription by its Razorpay order ID."""
    sb = get_supabase()
    result = (
        sb.table("subscriptions")
        .select("*")
        .eq("razorpay_order_id", razorpay_order_id)
        .limit(1)
        .execute()
    )
    return result.data[0] if result.data else None
