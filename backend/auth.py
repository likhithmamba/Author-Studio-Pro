"""
Author Studio Pro — JWT + Password Hashing utilities.
Uses bcrypt directly (passlib has compatibility issues with Python 3.12).
"""

import os
import secrets
import logging
from datetime import datetime, timedelta
from typing import Optional

import bcrypt
import hashlib
from jose import jwt, JWTError

logger = logging.getLogger("auth")

# ─── Password hashing ────────────────────────────────────────────────────────
def get_password_hash(password: str) -> str:
    """
    Hash a password using bcrypt.
    To prevent 72-byte limit DoS vulnerabilities, passwords are pre-hashed
    with SHA-256 (hexdigest) before bcrypt, and the final stored string
    is prefixed with 'v2$' to maintain backward compatibility.
    """
    hashed = hashlib.sha256(password.encode("utf-8")).hexdigest()
    bcrypt_hash = bcrypt.hashpw(hashed.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    return f"v2${bcrypt_hash}"


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its bcrypt hash."""
    if hashed_password.startswith("v2$"):
        actual_hash = hashed_password[3:]
        hashed_plain = hashlib.sha256(plain_password.encode("utf-8")).hexdigest()
        return bcrypt.checkpw(
            hashed_plain.encode("utf-8"),
            actual_hash.encode("utf-8"),
        )
    else:
        # Legacy backward compatibility for older hashes
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
