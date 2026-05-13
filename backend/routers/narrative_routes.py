"""
narrative_routes.py — Inkforge Narrative Intelligence API
=========================================================
Three endpoints mapping to the three orchestrator pipeline modes:
  /api/narrative/quick      → real-time editor feedback (Fingerprint + Tension)
  /api/narrative/full       → deep analysis (all 9 engines)
  /api/narrative/submission → pre-submission check (Cold Open + Guns + Temporal)

All engines are deterministic and zero-dependency. No tokens consumed.
"""

import logging
import hashlib
import dataclasses
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta

from fastapi import APIRouter, Request, HTTPException, Depends
from pydantic import BaseModel

from rate_limiter import limiter
from routers.auth_routes import require_premium_tier
from database import get_supabase

logger = logging.getLogger("narrative_routes")
router = APIRouter(prefix="/api/narrative", tags=["Narrative Intelligence"])

# ── Lazy import to avoid startup cost ────────────────────────────────────────
_engine_mod = None

def _engines():
    """Lazy-load the narrative engine suite on first request."""
    global _engine_mod
    if _engine_mod is None:
        from narrative_engines.orchestrator import (
            run_all, run_quick_feedback, run_submission_suite,
            OrchestratorResult, ALL_ENGINE_IDS,
        )
        _engine_mod = {
            "run_all": run_all,
            "run_quick_feedback": run_quick_feedback,
            "run_submission_suite": run_submission_suite,
            "OrchestratorResult": OrchestratorResult,
            "ALL_ENGINE_IDS": ALL_ENGINE_IDS,
        }
    return _engine_mod


# ── Request Models ───────────────────────────────────────────────────────────

class NarrativeQuickRequest(BaseModel):
    """Minimal payload for real-time editor feedback."""
    raw_text: str
    manuscript_id: str
    genre: str = "default"

class NarrativeFullRequest(BaseModel):
    """Full analysis payload."""
    raw_text: str
    manuscript_id: str
    genre: str = "default"
    chapter_titles: Optional[Dict[int, str]] = None

class NarrativeSubmissionRequest(BaseModel):
    """Pre-submission check payload."""
    raw_text: str
    manuscript_id: str
    genre: str = "default"


# ── Serialization ────────────────────────────────────────────────────────────

def _serialize_dataclass(obj) -> Any:
    """
    Recursively convert a dataclass tree to JSON-safe dicts.
    Handles nested dataclasses, lists, dicts, sets, and primitives.
    """
    if obj is None:
        return None
    if isinstance(obj, (str, int, float, bool)):
        return obj
    if isinstance(obj, set):
        return list(obj)
    if isinstance(obj, (list, tuple)):
        return [_serialize_dataclass(item) for item in obj]
    if isinstance(obj, dict):
        return {str(k): _serialize_dataclass(v) for k, v in obj.items()}
    if dataclasses.is_dataclass(obj) and not isinstance(obj, type):
        return {f.name: _serialize_dataclass(getattr(obj, f.name)) for f in dataclasses.fields(obj)}
    # Fallback for custom objects — try __dict__
    if hasattr(obj, '__dict__'):
        return {k: _serialize_dataclass(v) for k, v in obj.__dict__.items() if not k.startswith('_')}
    return str(obj)


def _serialize_result(result) -> dict:
    """Serialize an OrchestratorResult to a JSON-safe dict."""
    data = _serialize_dataclass(result)
    # Add the computed summary
    data["_summary"] = result.summary()
    data["_completed_engines"] = result.completed_engines
    data["_has_errors"] = result.has_errors
    return data


# ── Text validation ──────────────────────────────────────────────────────────

MAX_QUICK_CHARS = 300_000      # ~60k words — quick feedback limit
MAX_FULL_CHARS = 1_000_000     # ~200k words — full analysis limit
MAX_SUBMISSION_CHARS = 1_000_000

def _validate_text(raw_text: str, max_chars: int, endpoint: str) -> str:
    """Validate and return cleaned text, or raise HTTP 4xx."""
    if not raw_text or not raw_text.strip():
        raise HTTPException(400, f"{endpoint}: raw_text must be non-empty")
    text = raw_text.strip()
    if len(text) < 100:
        raise HTTPException(400, f"{endpoint}: manuscript must be at least 100 characters")
    if len(text) > max_chars:
        raise HTTPException(
            413,
            f"{endpoint}: text too large ({len(text):,} chars). "
            f"Maximum: {max_chars:,} chars (~{max_chars // 5:,} words)"
        )
    return text


# ── Cache helpers ────────────────────────────────────────────────────────────

def _make_cache_key(mode: str, text: str, genre: str) -> str:
    """Generate a deterministic cache key from mode + text hash + genre."""
    text_hash = hashlib.sha256(text.encode("utf-8")).hexdigest()[:24]
    return f"narr:{mode}:{genre}:{text_hash}"


def _check_cache(cache_key: str) -> Optional[dict]:
    """Check the ai_analysis_cache table for a cached result."""
    sb = get_supabase()
    if not sb:
        return None
    try:
        res = sb.table("ai_analysis_cache").select("result").eq(
            "cache_key", cache_key
        ).gte(
            "expires_at", datetime.utcnow().isoformat()
        ).execute()
        if res.data:
            return res.data[0]["result"]
    except Exception as e:
        logger.debug(f"Cache read failed (non-fatal): {e}")
    return None


def _write_cache(cache_key: str, mode: str, result: dict, project_id: str = None, ttl_hours: int = 2):
    """Write result to the ai_analysis_cache table."""
    sb = get_supabase()
    if not sb:
        return
    try:
        cache_data = {
            "cache_key": cache_key,
            "mode": f"narrative_{mode}",
            "result": result,
            "expires_at": (datetime.utcnow() + timedelta(hours=ttl_hours)).isoformat(),
        }
        if project_id:
            cache_data["project_id"] = project_id
        sb.table("ai_analysis_cache").upsert(cache_data).execute()
    except Exception as e:
        logger.debug(f"Cache write failed (non-fatal): {e}")


# ═══════════════════════════════════════════════════════════════════════════════
# ENDPOINT 1: Quick Feedback (Fingerprint + Tension)
# Used by: Editor Inspector Panel, debounced on typing
# Performance target: < 2 seconds
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/quick")
@limiter.limit("30/minute")
async def narrative_quick(
    request: Request,
    body: NarrativeQuickRequest,
    _user: dict = Depends(require_premium_tier),
):
    """
    Real-time narrative feedback for the editor.
    Runs only Fingerprint and Tension engines — no NER, no AI.
    Returns in < 2 seconds for manuscripts up to 60k words.
    """
    text = _validate_text(body.raw_text, MAX_QUICK_CHARS, "quick")
    cache_key = _make_cache_key("quick", text, body.genre)

    # Check cache first
    cached = _check_cache(cache_key)
    if cached:
        cached["_from_cache"] = True
        return cached

    eng = _engines()
    try:
        result = eng["run_quick_feedback"](
            raw_text=text,
            manuscript_id=body.manuscript_id,
            genre=body.genre,
        )
        serialized = _serialize_result(result)
        # Cache for 30 minutes (quick feedback changes frequently)
        _write_cache(cache_key, "quick", serialized, body.manuscript_id, ttl_hours=0.5)
        serialized["_from_cache"] = False
        return serialized
    except Exception as e:
        logger.exception(f"Quick narrative analysis failed: {e}")
        raise HTTPException(500, f"Narrative analysis failed: {str(e)[:200]}")


# ═══════════════════════════════════════════════════════════════════════════════
# ENDPOINT 2: Full Analysis (All 9 Engines)
# Used by: Analysis Tab "Deep Narrative Intelligence" section
# Performance target: < 10 seconds for 100k words
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/full")
@limiter.limit("5/minute")
async def narrative_full(
    request: Request,
    body: NarrativeFullRequest,
    _user: dict = Depends(require_premium_tier),
):
    """
    Deep narrative analysis using all 9 engines.
    Deterministic — no AI tokens consumed. Results are cached for 2 hours.
    """
    text = _validate_text(body.raw_text, MAX_FULL_CHARS, "full")
    cache_key = _make_cache_key("full", text, body.genre)

    cached = _check_cache(cache_key)
    if cached:
        cached["_from_cache"] = True
        return cached

    eng = _engines()
    try:
        result = eng["run_all"](
            raw_text=text,
            manuscript_id=body.manuscript_id,
            genre=body.genre,
            chapter_titles=body.chapter_titles,
        )
        serialized = _serialize_result(result)
        _write_cache(cache_key, "full", serialized, body.manuscript_id, ttl_hours=2)
        serialized["_from_cache"] = False
        return serialized
    except Exception as e:
        logger.exception(f"Full narrative analysis failed: {e}")
        raise HTTPException(500, f"Narrative analysis failed: {str(e)[:200]}")


# ═══════════════════════════════════════════════════════════════════════════════
# ENDPOINT 3: Submission Check (Cold Open + Guns + Temporal)
# Used by: Submission/Query tab "Manuscript Readiness" panel
# Performance target: < 5 seconds
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/submission")
@limiter.limit("10/minute")
async def narrative_submission(
    request: Request,
    body: NarrativeSubmissionRequest,
    _user: dict = Depends(require_premium_tier),
):
    """
    Pre-submission manuscript readiness check.
    Runs Cold Open Scorer, Chekhov's Gun Tracker, and Temporal Coherence.
    """
    text = _validate_text(body.raw_text, MAX_SUBMISSION_CHARS, "submission")
    cache_key = _make_cache_key("submission", text, body.genre)

    cached = _check_cache(cache_key)
    if cached:
        cached["_from_cache"] = True
        return cached

    eng = _engines()
    try:
        result = eng["run_submission_suite"](
            raw_text=text,
            manuscript_id=body.manuscript_id,
            genre=body.genre,
        )
        serialized = _serialize_result(result)
        _write_cache(cache_key, "submission", serialized, body.manuscript_id, ttl_hours=4)
        serialized["_from_cache"] = False
        return serialized
    except Exception as e:
        logger.exception(f"Submission narrative analysis failed: {e}")
        raise HTTPException(500, f"Narrative analysis failed: {str(e)[:200]}")


# ═══════════════════════════════════════════════════════════════════════════════
# HEALTH CHECK — confirms engine suite is operational
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/status")
async def narrative_status(request: Request):
    """Check that the narrative engine suite is loaded and operational."""
    try:
        eng = _engines()
        return {
            "status": "operational",
            "engines": eng["ALL_ENGINE_IDS"],
            "engine_count": len(eng["ALL_ENGINE_IDS"]),
            "pipelines": ["quick", "full", "submission"],
        }
    except Exception as e:
        return {
            "status": "error",
            "detail": str(e)[:200],
        }
