import logging
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Request, HTTPException, Depends
from pydantic import BaseModel
from datetime import datetime

from database import get_supabase
from routers.auth_routes import get_current_user

logger = logging.getLogger("editor_routes")
router = APIRouter()

def get_user_id(request: Request) -> str:
    user = get_current_user(request)
    return user["id"]

# ─── MODELS ──────────────────────────────────────────────────────────────

class SceneContentUpdate(BaseModel):
    content: str
    saved_at: Optional[str] = None

class SceneMetaUpdate(BaseModel):
    title: Optional[str] = None
    status: Optional[str] = None
    pov: Optional[str] = None
    location: Optional[str] = None
    time_of_day: Optional[str] = None
    tension: Optional[str] = None
    mood: Optional[str] = None
    act: Optional[str] = None

class SceneCreate(BaseModel):
    project_id: str
    chapter_id: str
    title: str = "Untitled Scene"

class CharacterCreate(BaseModel):
    project_id: str
    name: str
    role: Optional[str] = None

class LocationCreate(BaseModel):
    project_id: str
    name: str

class TimelineEventCreate(BaseModel):
    project_id: str
    title: str
    event_date: Optional[str] = None

class ResearchNoteCreate(BaseModel):
    project_id: str
    title: str

# ─── ENDPOINTS ───────────────────────────────────────────────────────────

@router.get("/api/editor/data/{project_id}", tags=["Editor"])
async def get_editor_data(request: Request, project_id: str):
    uid = get_user_id(request)
    sb = get_supabase()
    if not sb: return {}
    
    scenes = sb.table("scenes").select("*").eq("project_id", project_id).eq("user_id", uid).order("position").execute()
    chars = sb.table("characters").select("*").eq("project_id", project_id).eq("user_id", uid).execute()
    locs = sb.table("locations").select("*").eq("project_id", project_id).eq("user_id", uid).execute()
    timeline = sb.table("timeline_events").select("*").eq("project_id", project_id).eq("user_id", uid).order("sort_order").execute()
    research = sb.table("research_notes").select("*").eq("project_id", project_id).eq("user_id", uid).execute()
    
    return {
        "scenes": scenes.data,
        "characters": chars.data,
        "locations": locs.data,
        "timeline_events": timeline.data,
        "research_notes": research.data
    }

# --- Scenes ---

@router.post("/api/scenes", tags=["Editor"])
async def create_scene(request: Request, body: SceneCreate):
    uid = get_user_id(request)
    sb = get_supabase()
    data = body.dict()
    data["user_id"] = uid
    res = sb.table("scenes").insert(data).execute()
    return res.data[0] if res.data else None

@router.put("/api/scenes/{scene_id}/content", tags=["Editor"])
async def save_scene_content(request: Request, scene_id: str, body: SceneContentUpdate):
    uid = get_user_id(request)
    sb = get_supabase()
    
    # 1. Fetch current scene
    scene_res = sb.table("scenes").select("updated_at", "content").eq("id", scene_id).eq("user_id", uid).execute()
    if not scene_res.data:
        raise HTTPException(404, "Scene not found")
    scene = scene_res.data[0]
    
    # 2. Conflict detection
    if body.saved_at and scene["updated_at"] and body.saved_at < scene["updated_at"]:
        raise HTTPException(status_code=409, detail={
            "conflict": True,
            "server_content": scene["content"],
            "server_updated_at": scene["updated_at"]
        })
    
    # 3. Update content
    upd = sb.table("scenes").update({"content": body.content}).eq("id", scene_id).eq("user_id", uid).execute()
    
    # 4. Create version
    sb.table("scene_versions").insert({
        "scene_id": scene_id,
        "user_id": uid,
        "content": body.content,
        "label": "Auto-save"
    }).execute()
    
    if upd.data:
        return {"scene_id": scene_id, "saved_at": upd.data[0]["updated_at"]}
    return {"scene_id": scene_id}

@router.put("/api/scenes/{scene_id}/meta", tags=["Editor"])
async def update_scene_meta(request: Request, scene_id: str, body: SceneMetaUpdate):
    uid = get_user_id(request)
    sb = get_supabase()
    data = {k: v for k, v in body.dict().items() if v is not None}
    res = sb.table("scenes").update(data).eq("id", scene_id).eq("user_id", uid).execute()
    return res.data[0] if res.data else None

@router.delete("/api/scenes/{scene_id}", tags=["Editor"])
async def delete_scene(request: Request, scene_id: str):
    uid = get_user_id(request)
    sb = get_supabase()
    sb.table("scenes").delete().eq("id", scene_id).eq("user_id", uid).execute()
    return {"status": "deleted"}

# --- Versions ---

@router.get("/api/scenes/{scene_id}/versions", tags=["Editor"])
async def get_scene_versions(request: Request, scene_id: str):
    uid = get_user_id(request)
    sb = get_supabase()
    res = sb.table("scene_versions").select("*").eq("scene_id", scene_id).eq("user_id", uid).order("created_at", desc=True).limit(50).execute()
    return {"versions": res.data}

@router.post("/api/scenes/{scene_id}/versions/restore/{version_id}", tags=["Editor"])
async def restore_version(request: Request, scene_id: str, version_id: str):
    uid = get_user_id(request)
    sb = get_supabase()
    
    ver = sb.table("scene_versions").select("content").eq("id", version_id).eq("user_id", uid).execute()
    if not ver.data:
        raise HTTPException(404, "Version not found")
        
    content = ver.data[0]["content"]
    
    # Update scene
    upd = sb.table("scenes").update({"content": content}).eq("id", scene_id).eq("user_id", uid).execute()
    
    # Create "restored" version marker
    sb.table("scene_versions").insert({
        "scene_id": scene_id,
        "user_id": uid,
        "content": content,
        "label": f"Restored from v_{version_id[:8]}"
    }).execute()
    
    return {"content": content}

# --- Metadata (Characters, Locations, etc.) ---

@router.post("/api/characters", tags=["Editor"])
async def create_character(request: Request, body: CharacterCreate):
    uid = get_user_id(request)
    sb = get_supabase()
    data = body.dict()
    data["user_id"] = uid
    res = sb.table("characters").insert(data).execute()
    return res.data[0] if res.data else None

@router.delete("/api/characters/{id}", tags=["Editor"])
async def delete_character(request: Request, id: str):
    uid = get_user_id(request)
    sb = get_supabase()
    sb.table("characters").delete().eq("id", id).eq("user_id", uid).execute()
    return {"status": "deleted"}

@router.post("/api/locations", tags=["Editor"])
async def create_location(request: Request, body: LocationCreate):
    uid = get_user_id(request)
    sb = get_supabase()
    data = body.dict()
    data["user_id"] = uid
    res = sb.table("locations").insert(data).execute()
    return res.data[0] if res.data else None

@router.delete("/api/locations/{id}", tags=["Editor"])
async def delete_location(request: Request, id: str):
    uid = get_user_id(request)
    sb = get_supabase()
    sb.table("locations").delete().eq("id", id).eq("user_id", uid).execute()
    return {"status": "deleted"}

@router.post("/api/timeline", tags=["Editor"])
async def create_timeline_event(request: Request, body: TimelineEventCreate):
    uid = get_user_id(request)
    sb = get_supabase()
    data = body.dict()
    data["user_id"] = uid
    res = sb.table("timeline_events").insert(data).execute()
    return res.data[0] if res.data else None

@router.delete("/api/timeline/{id}", tags=["Editor"])
async def delete_timeline_event(request: Request, id: str):
    uid = get_user_id(request)
    sb = get_supabase()
    sb.table("timeline_events").delete().eq("id", id).eq("user_id", uid).execute()
    return {"status": "deleted"}

@router.post("/api/research", tags=["Editor"])
async def create_research_note(request: Request, body: ResearchNoteCreate):
    uid = get_user_id(request)
    sb = get_supabase()
    data = body.dict()
    data["user_id"] = uid
    res = sb.table("research_notes").insert(data).execute()
    return res.data[0] if res.data else None

@router.delete("/api/research/{id}", tags=["Editor"])
async def delete_research_note(request: Request, id: str):
    uid = get_user_id(request)
    sb = get_supabase()
    sb.table("research_notes").delete().eq("id", id).eq("user_id", uid).execute()
    return {"status": "deleted"}

# --- Sessions ---
class SessionDelta(BaseModel):
    project_id: str
    words_added: int

@router.post("/api/sessions", tags=["Editor"])
async def update_session(request: Request, body: SessionDelta):
    uid = get_user_id(request)
    sb = get_supabase()
    today = datetime.utcnow().strftime("%Y-%m-%d")
    
    # This relies on the unique constraint on (user_id, project_id, session_date)
    # Upsert using RPC or just try insert then update
    
    existing = sb.table("writing_sessions").select("*").eq("project_id", body.project_id).eq("user_id", uid).eq("session_date", today).execute()
    if existing.data:
        curr = existing.data[0]["words_added"]
        res = sb.table("writing_sessions").update({"words_added": curr + body.words_added}).eq("id", existing.data[0]["id"]).execute()
        return res.data[0]
    else:
        res = sb.table("writing_sessions").insert({
            "project_id": body.project_id,
            "user_id": uid,
            "session_date": today,
            "words_added": body.words_added
        }).execute()
        return res.data[0] if res.data else None
