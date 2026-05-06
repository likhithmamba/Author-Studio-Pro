"""
Inkforge — JWT + Password Hashing utilities.
Uses bcrypt directly (passlib has compatibility issues with Python 3.12).
"""

import os
import secrets
import logging
from datetime import datetime, timedelta
from typing import Optional

import bcrypt
from jose import jwt, JWTError

logger = logging.getLogger("author-studio-auth")


# ─── Password hashing ────────────────────────────────────────────────────────
def get_password_hash(password: str) -> str:
    """Hash a password using bcrypt."""
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its bcrypt hash."""
    return bcrypt.checkpw(
        plain_password.encode("utf-8"),
        hashed_password.encode("utf-8"),
    )


# ─── JWT tokens ──────────────────────────────────────────────────────────────
# FIX-2: In production, JWT_SECRET_KEY MUST be set. Random fallback only for dev.
_env = os.getenv("ENVIRONMENT", "development")
JWT_SECRET = os.getenv("JWT_SECRET_KEY")

if not JWT_SECRET:
    if _env == "production":
        raise RuntimeError(
            "JWT_SECRET_KEY must be set in production. "
            'Generate one: python -c "import secrets; print(secrets.token_urlsafe(64))"'
        )
    JWT_SECRET = secrets.token_urlsafe(32)
    logger.warning(
        "JWT_SECRET_KEY not set — using a random ephemeral key. "
        "All tokens will be invalidated on server restart. "
        "Set JWT_SECRET_KEY in your environment for production."
    )

JWT_ALGORITHM = "HS256"
JWT_EXPIRE_HOURS = 72  # 3 days


def create_access_token(user_id: str, email: str) -> str:
    """Create a JWT access token for the given user."""
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.utcnow() + timedelta(hours=JWT_EXPIRE_HOURS),
        "iat": datetime.utcnow(),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def verify_token(token: str) -> Optional[dict]:
    """
    Verify a JWT token and return its payload.
    Returns None if the token is invalid or expired.
    """
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except JWTError:
        return None
