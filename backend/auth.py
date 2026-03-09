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
def get_password_hash(password: str) -> str:
    """Hash a password using bcrypt. Pre-hashes with SHA-256 to prevent 72-byte limit DoS."""
    sha256_hash = hashlib.sha256(password.encode("utf-8")).hexdigest()
    bcrypt_hash = bcrypt.hashpw(sha256_hash.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    return f"$sha256${bcrypt_hash}"


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash (supports both new pre-hashed and legacy bcrypt hashes)."""
    if hashed_password.startswith("$sha256$"):
        sha256_hash = hashlib.sha256(plain_password.encode("utf-8")).hexdigest()
        bcrypt_hash = hashed_password[8:]
        return bcrypt.checkpw(
            sha256_hash.encode("utf-8"),
            bcrypt_hash.encode("utf-8"),
        )
    else:
        # Legacy fallback
        # If a legacy password is over 72 bytes, bcrypt limits to 72 bytes.
        # This catch block returns False rather than crashing the server.
        try:
            return bcrypt.checkpw(
                plain_password.encode("utf-8"),
                hashed_password.encode("utf-8"),
            )
        except ValueError:
            return False


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
