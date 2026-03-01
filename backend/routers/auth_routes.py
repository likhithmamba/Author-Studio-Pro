import logging
from fastapi import APIRouter, Request, HTTPException
from pydantic import BaseModel

# Import relative to the backend folder (sys.path root)
from auth import (
    create_access_token, verify_token,
    get_password_hash, verify_password,
)
from database import (
    create_user, get_user_by_email, get_user_by_id,
    get_active_subscription,
)
from rate_limiter import limiter

logger = logging.getLogger("auth_routes")
router = APIRouter()


class RegisterRequest(BaseModel):
    email: str
    password: str

class LoginRequest(BaseModel):
    email: str
    password: str


def get_current_user(request: Request) -> dict:
    """Extract and verify JWT from Authorization header."""
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(401, "Missing or invalid authorization header")
    token = auth[7:]
    payload = verify_token(token)
    if not payload:
        raise HTTPException(401, "Invalid or expired token")
    user = get_user_by_id(payload["sub"])
    if not user:
        raise HTTPException(401, "User not found")
    return user


@router.post("/api/auth/register", tags=["Auth"])
@limiter.limit("5/minute")
async def register(request: Request, body: RegisterRequest):
    """Create a new user account."""
    try:
        email = body.email.strip().lower()
        password = body.password

        if not email or not password:
            raise HTTPException(400, "Email and password are required")
        if len(password) < 8:
            raise HTTPException(400, "Password must be at least 8 characters")

        existing = get_user_by_email(email)
        if existing:
            raise HTTPException(409, "An account with this email already exists")

        hashed = get_password_hash(password)
        user = create_user(email, hashed)
        token = create_access_token(user["id"], user["email"])

        return {
            "token": token,
            "user": {
                "id": user["id"],
                "email": user["email"],
                "created_at": user["created_at"],
            },
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Registration failed: {e}", exc_info=True)
        raise HTTPException(500, f"Registration failed: {str(e)}")


@router.post("/api/auth/login", tags=["Auth"])
@limiter.limit("10/minute")
async def login(request: Request, body: LoginRequest):
    """Authenticate and return a JWT."""
    email = body.email.strip().lower()
    user = get_user_by_email(email)
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(401, "Invalid email or password")

    token = create_access_token(user["id"], user["email"])
    sub = get_active_subscription(user["id"])

    return {
        "token": token,
        "user": {
            "id": user["id"],
            "email": user["email"],
            "created_at": user["created_at"],
        },
        "subscription": {
            "plan": sub["plan"] if sub else "free",
            "status": sub["status"] if sub else "none",
            "expires_at": sub.get("expires_at") if sub else None,
        },
    }


@router.get("/api/auth/me", tags=["Auth"])
@limiter.limit("30/minute")
async def me(request: Request):
    """Return current user profile + subscription status."""
    user = get_current_user(request)
    sub = get_active_subscription(user["id"])

    return {
        "user": {
            "id": user["id"],
            "email": user["email"],
            "created_at": user["created_at"],
        },
        "subscription": {
            "plan": sub["plan"] if sub else "free",
            "status": sub["status"] if sub else "none",
            "expires_at": sub.get("expires_at") if sub else None,
        },
    }
