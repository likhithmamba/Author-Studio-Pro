import logging
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Request, HTTPException
from pydantic import BaseModel

from database import get_supabase
from routers.auth_routes import get_current_user

logger = logging.getLogger("sso_routes")
router = APIRouter()

def get_user_id(request: Request) -> str:
    user = get_current_user(request)
    return user["id"]

class CharacterStatePayload(BaseModel):
    id: Optional[str] = None
    project_id: str
    character_id: str
    character_name: str
    role: Optional[str] = None
    arc_phase: Optional[str] = None
    current_state: Optional[str] = None
    chapter_id: Optional[str] = None
    confidence_score: float = 0.70

class ConflictStatePayload(BaseModel):
    id: Optional[str] = None
    project_id: str
    conflict_id: str
    type: Optional[str] = None
    intensity: Optional[float] = None
    parties: List[str] = []
    status: Optional[str] = None
    chapter_id: Optional[str] = None

class ProgressionMarkerPayload(BaseModel):
    id: Optional[str] = None
    project_id: str
    marker_id: str
    chapter_id: str
    phase: Optional[str] = None
    confidence: float = 0.70

@router.get("/api/sso/character-states/{project_id}", tags=["SSO"])
async def get_character_states(request: Request, project_id: str):
    uid = get_user_id(request)
    try:
        sb = get_supabase()
        if not sb: return []
        res = sb.table("character_states").select("*").eq("project_id", project_id).eq("user_id", uid).execute()
        return res.data
    except Exception as e:
        logger.warning(f"get_character_states failed: {e}")
        return []

@router.post("/api/sso/character-states", tags=["SSO"])
async def upsert_character_state(request: Request, body: CharacterStatePayload):
    uid = get_user_id(request)
    try:
        sb = get_supabase()
        if not sb: return None
        data = body.dict(exclude_unset=True)
        if "id" not in data or not data["id"]:
            data.pop("id", None)
        data["user_id"] = uid
        res = sb.table("character_states").upsert(data, on_conflict="id" if "id" in data else None).execute()
        return res.data[0] if res.data else None
    except Exception as e:
        logger.warning(f"upsert_character_state failed: {e}")
        return None

@router.get("/api/sso/conflict-states/{project_id}", tags=["SSO"])
async def get_conflict_states(request: Request, project_id: str):
    uid = get_user_id(request)
    try:
        sb = get_supabase()
        if not sb: return []
        res = sb.table("conflict_states").select("*").eq("project_id", project_id).eq("user_id", uid).execute()
        return res.data
    except Exception as e:
        logger.warning(f"get_conflict_states failed: {e}")
        return []

@router.post("/api/sso/conflict-states", tags=["SSO"])
async def upsert_conflict_state(request: Request, body: ConflictStatePayload):
    uid = get_user_id(request)
    try:
        sb = get_supabase()
        if not sb: return None
        data = body.dict(exclude_unset=True)
        if "id" not in data or not data["id"]:
            data.pop("id", None)
        data["user_id"] = uid
        res = sb.table("conflict_states").upsert(data, on_conflict="id" if "id" in data else None).execute()
        return res.data[0] if res.data else None
    except Exception as e:
        logger.warning(f"upsert_conflict_state failed: {e}")
        return None

@router.get("/api/sso/progression-markers/{project_id}", tags=["SSO"])
async def get_progression_markers(request: Request, project_id: str):
    uid = get_user_id(request)
    try:
        sb = get_supabase()
        if not sb: return []
        res = sb.table("progression_markers").select("*").eq("project_id", project_id).eq("user_id", uid).execute()
        return res.data
    except Exception as e:
        logger.warning(f"get_progression_markers failed: {e}")
        return []

@router.post("/api/sso/progression-markers", tags=["SSO"])
async def upsert_progression_marker(request: Request, body: ProgressionMarkerPayload):
    uid = get_user_id(request)
    try:
        sb = get_supabase()
        if not sb: return None
        data = body.dict(exclude_unset=True)
        if "id" not in data or not data["id"]:
            data.pop("id", None)
        data["user_id"] = uid
        res = sb.table("progression_markers").upsert(data, on_conflict="id" if "id" in data else None).execute()
        return res.data[0] if res.data else None
    except Exception as e:
        logger.warning(f"upsert_progression_marker failed: {e}")
        return None

@router.delete("/api/sso/progression-markers/{id}", tags=["SSO"])
async def delete_progression_marker(request: Request, id: str):
    uid = get_user_id(request)
    try:
        sb = get_supabase()
        if not sb: return {"status": "offline"}
        sb.table("progression_markers").delete().eq("id", id).eq("user_id", uid).execute()
        return {"status": "deleted"}
    except Exception as e:
        logger.warning(f"delete_progression_marker failed: {e}")
        return {"status": "error"}
