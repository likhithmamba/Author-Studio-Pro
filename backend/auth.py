"""
Author Studio Pro — JWT + Password Hashing utilities.
Uses bcrypt directly (passlib has compatibility issues with Python 3.12).
"""

import os
import secrets
import logging
import hashlib
from datetime import datetime, timedelta
from typing import Optional

import bcrypt
from jose import jwt, JWTError

logger = logging.getLogger("auth")

# ─── Password hashing ────────────────────────────────────────────────────────
def _prehash(password: str) -> str:
    """Pre-hash password with SHA-256 to bypass bcrypt's 72-byte limit."""
    return hashlib.sha256(password.encode("utf-8")).hexdigest()

def get_password_hash(password: str) -> str:
    """Hash a password using bcrypt (with SHA-256 pre-hashing)."""
    prehashed = _prehash(password)
    hashed = bcrypt.hashpw(prehashed.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    return f"v2${hashed}"


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its bcrypt hash (supports legacy v1 and new v2 hashes)."""
    if hashed_password.startswith("v2$"):
        actual_hash = hashed_password[3:]
        prehashed = _prehash(plain_password)
        return bcrypt.checkpw(
            prehashed.encode("utf-8"),
            actual_hash.encode("utf-8"),
        )
    else:
        # Legacy passwords without pre-hashing
        if len(plain_password.encode("utf-8")) > 72:
            return False
        return bcrypt.checkpw(
            plain_password.encode("utf-8"),
            hashed_password.encode("utf-8"),
        )


# ─── JWT tokens ──────────────────────────────────────────────────────────────
JWT_SECRET = os.getenv("JWT_SECRET_KEY")
if not JWT_SECRET:
    logger.warning("JWT_SECRET_KEY not set in environment. Using a random ephemeral key. Sessions will invalidate on restart.")
    JWT_SECRET = secrets.token_urlsafe(32)

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
