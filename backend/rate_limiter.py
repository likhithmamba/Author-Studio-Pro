"""
Author Studio Pro — Rate Limiter with optional Upstash Redis backend.
FIX-3: Uses Upstash Redis if configured, falls back to in-memory.
"""
import os
import logging

from slowapi import Limiter
from slowapi.util import get_remote_address

logger = logging.getLogger("author-studio-rate-limiter")

_redis_url = os.getenv("UPSTASH_REDIS_REST_URL", "")
_redis_token = os.getenv("UPSTASH_REDIS_REST_TOKEN", "")


def _build_limiter():
    """Build the Limiter with Redis storage if available, else in-memory."""
    if _redis_url and _redis_token:
        try:
            # Parse host from the REST URL (strip https://)
            host = _redis_url.replace("https://", "").replace("http://", "").rstrip("/")
            storage_uri = f"redis://:{_redis_token}@{host}:6379"
            lim = Limiter(key_func=get_remote_address, storage_uri=storage_uri)
            logger.info("Rate limiter: Upstash Redis mode")
            return lim
        except Exception as e:
            logger.error(f"Redis rate limiter init failed, falling back to in-memory: {e}")

    logger.info("Rate limiter: in-memory mode (no Redis configured)")
    return Limiter(key_func=get_remote_address)


limiter = _build_limiter()
