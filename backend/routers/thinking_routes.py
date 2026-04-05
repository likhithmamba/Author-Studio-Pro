import logging
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Request, HTTPException
from pydantic import BaseModel

from database import get_supabase
from routers.auth_routes import get_current_user

logger = logging.getLogger("thinking_routes")
router = APIRouter()

# ─── PYDANTIC MODELS ─────────────────────────────────────────────────────────

# 1. Quick Capture
class QuickCaptureCreate(BaseModel):
    content: str
    project_id: Optional[str] = None
    tags: List[str] = []
    type: str = "note"

class QuickCaptureUpdate(BaseModel):
    content: Optional[str] = None
    status: Optional[str] = None
    promoted_to: Optional[str] = None

# 2. Idea Cards
class IdeaCardCreate(BaseModel):
    project_id: str
    title: str = "Untitled"
    body: str = ""
    color: str = "white"
    position_x: int = 0
    position_y: int = 0

class IdeaCardUpdate(BaseModel):
    title: Optional[str] = None
    body: Optional[str] = None
    color: Optional[str] = None
    position_x: Optional[int] = None
    position_y: Optional[int] = None

class IdeaConnection(BaseModel):
    project_id: str
    from_card_id: str
    to_card_id: str

# 3. What-If Scenarios
class WhatIfCreate(BaseModel):
    project_id: str
    chapter_id: Optional[str] = None
    title: str
    description: str = ""
    status: str = "plausible"

class WhatIfUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None

# 4. Threads
class ThreadCreate(BaseModel):
    project_id: str
    title: str
    notes: str = ""
    status: str = "todo"
    type: str = "subplot"

class ThreadUpdate(BaseModel):
    title: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = None

# 5. Branches
class BranchCreate(BaseModel):
    project_id: str
    name: str

class BranchUpdate(BaseModel):
    name: Optional[str] = None

class BranchPathCreate(BaseModel):
    branch_id: str
    content: str
    sequence_order: int

class BranchPathUpdate(BaseModel):
    content: Optional[str] = None
    sequence_order: Optional[int] = None

# ─── HELPERS ─────────────────────────────────────────────────────────────────
def get_user_id(request: Request) -> str:
    user = get_current_user(request)
    return user["id"]

# ─── ENDPOINTS ───────────────────────────────────────────────────────────────

# --- Quick Captures ---
@router.get("/api/thinking/captures", tags=["Thinking"])
async def get_captures(request: Request, project_id: Optional[str] = None):
    uid = get_user_id(request)
    sb = get_supabase()
    q = sb.table("quick_captures").select("*").eq("user_id", uid)
    if project_id:
        q = q.eq("project_id", project_id)
    res = q.order("created_at", desc=True).execute()
    return res.data

@router.post("/api/thinking/captures", tags=["Thinking"])
async def create_capture(request: Request, body: QuickCaptureCreate):
    uid = get_user_id(request)
    sb = get_supabase()
    data = body.dict()
    data["user_id"] = uid
    res = sb.table("quick_captures").insert(data).execute()
    return res.data[0]

@router.delete("/api/thinking/captures/{id}", tags=["Thinking"])
async def delete_capture(request: Request, id: str):
    uid = get_user_id(request)
    sb = get_supabase()
    sb.table("quick_captures").delete().eq("id", id).eq("user_id", uid).execute()
    return {"status": "deleted"}

# --- Idea Cards ---
@router.get("/api/thinking/ideas/{project_id}", tags=["Thinking"])
async def get_ideas(request: Request, project_id: str):
    uid = get_user_id(request)
    sb = get_supabase()
    cards = sb.table("idea_cards").select("*").eq("project_id", project_id).eq("user_id", uid).execute()
    connections = sb.table("idea_connections").select("*").eq("project_id", project_id).eq("user_id", uid).execute()
    return {"cards": cards.data, "connections": connections.data}

@router.post("/api/thinking/ideas", tags=["Thinking"])
async def create_idea(request: Request, body: IdeaCardCreate):
    uid = get_user_id(request)
    sb = get_supabase()
    data = body.dict()
    data["user_id"] = uid
    res = sb.table("idea_cards").insert(data).execute()
    return res.data[0]

@router.put("/api/thinking/ideas/{id}", tags=["Thinking"])
async def update_idea(request: Request, id: str, body: IdeaCardUpdate):
    uid = get_user_id(request)
    sb = get_supabase()
    data = {k: v for k, v in body.dict().items() if v is not None}
    if not data:
        return {"status": "no update"}
    res = sb.table("idea_cards").update(data).eq("id", id).eq("user_id", uid).execute()
    if not res.data:
        raise HTTPException(404, "Card not found")
    return res.data[0]

@router.delete("/api/thinking/ideas/{id}", tags=["Thinking"])
async def delete_idea(request: Request, id: str):
    uid = get_user_id(request)
    sb = get_supabase()
    # Before deleting, save to graveyard
    card = sb.table("idea_cards").select("*").eq("id", id).eq("user_id", uid).execute()
    if card.data:
        sb.table("graveyard").insert({
            "project_id": card.data[0]["project_id"],
            "user_id": uid,
            "original_type": "idea_cards",
            "content_snapshot": card.data[0]
        }).execute()
        sb.table("idea_cards").delete().eq("id", id).eq("user_id", uid).execute()
    return {"status": "deleted"}

@router.post("/api/thinking/connections", tags=["Thinking"])
async def create_connection(request: Request, body: IdeaConnection):
    uid = get_user_id(request)
    sb = get_supabase()
    data = body.dict()
    data["user_id"] = uid
    res = sb.table("idea_connections").insert(data).execute()
    return res.data[0]

# --- What-If Scenarios ---
@router.get("/api/thinking/whatifs/{project_id}", tags=["Thinking"])
async def get_whatifs(request: Request, project_id: str):
    uid = get_user_id(request)
    sb = get_supabase()
    res = sb.table("what_if_scenarios").select("*").eq("project_id", project_id).eq("user_id", uid).order("created_at", desc=True).execute()
    return res.data

@router.post("/api/thinking/whatifs", tags=["Thinking"])
async def create_whatif(request: Request, body: WhatIfCreate):
    uid = get_user_id(request)
    sb = get_supabase()
    data = body.dict()
    data["user_id"] = uid
    res = sb.table("what_if_scenarios").insert(data).execute()
    return res.data[0]

@router.put("/api/thinking/whatifs/{id}", tags=["Thinking"])
async def update_whatif(request: Request, id: str, body: WhatIfUpdate):
    uid = get_user_id(request)
    sb = get_supabase()
    data = {k: v for k, v in body.dict().items() if v is not None}
    res = sb.table("what_if_scenarios").update(data).eq("id", id).eq("user_id", uid).execute()
    return res.data[0] if res.data else None

@router.delete("/api/thinking/whatifs/{id}", tags=["Thinking"])
async def delete_whatif(request: Request, id: str):
    uid = get_user_id(request)
    sb = get_supabase()
    sb.table("what_if_scenarios").delete().eq("id", id).eq("user_id", uid).execute()
    return {"status": "deleted"}

# --- Threads (Kanban) ---
@router.get("/api/thinking/threads/{project_id}", tags=["Thinking"])
async def get_threads(request: Request, project_id: str):
    uid = get_user_id(request)
    sb = get_supabase()
    res = sb.table("thread_cards").select("*").eq("project_id", project_id).eq("user_id", uid).order("created_at", desc=True).execute()
    return res.data

@router.post("/api/thinking/threads", tags=["Thinking"])
async def create_thread(request: Request, body: ThreadCreate):
    uid = get_user_id(request)
    sb = get_supabase()
    data = body.dict()
    data["user_id"] = uid
    res = sb.table("thread_cards").insert(data).execute()
    return res.data[0]

@router.put("/api/thinking/threads/{id}", tags=["Thinking"])
async def update_thread(request: Request, id: str, body: ThreadUpdate):
    uid = get_user_id(request)
    sb = get_supabase()
    data = {k: v for k, v in body.dict().items() if v is not None}
    res = sb.table("thread_cards").update(data).eq("id", id).eq("user_id", uid).execute()
    return res.data[0] if res.data else None

@router.delete("/api/thinking/threads/{id}", tags=["Thinking"])
async def delete_thread(request: Request, id: str):
    uid = get_user_id(request)
    sb = get_supabase()
    sb.table("thread_cards").delete().eq("id", id).eq("user_id", uid).execute()
    return {"status": "deleted"}

# --- Story Branches ---
@router.get("/api/thinking/branches/{project_id}", tags=["Thinking"])
async def get_branches(request: Request, project_id: str):
    uid = get_user_id(request)
    sb = get_supabase()
    branches = sb.table("story_branches").select("*").eq("project_id", project_id).eq("user_id", uid).execute()
    paths = sb.table("branch_paths").select("*").in_("branch_id", [b["id"] for b in branches.data]).order("sequence_order").execute() if branches.data else {"data": []}
    return {"branches": branches.data, "paths": paths.data if type(paths) is not dict else paths['data']}

@router.post("/api/thinking/branches", tags=["Thinking"])
async def create_branch(request: Request, body: BranchCreate):
    uid = get_user_id(request)
    sb = get_supabase()
    data = body.dict()
    data["user_id"] = uid
    res = sb.table("story_branches").insert(data).execute()
    return res.data[0]

@router.delete("/api/thinking/branches/{id}", tags=["Thinking"])
async def delete_branch(request: Request, id: str):
    uid = get_user_id(request)
    sb = get_supabase()
    sb.table("story_branches").delete().eq("id", id).eq("user_id", uid).execute()
    return {"status": "deleted"}

@router.post("/api/thinking/paths", tags=["Thinking"])
async def create_path(request: Request, body: BranchPathCreate):
    uid = get_user_id(request)
    sb = get_supabase()
    data = {"user_id": uid, "branch_id": body.branch_id, "summary": body.content, "sort_order": body.sequence_order}
    res = sb.table("branch_paths").insert(data).execute()
    return res.data[0]

@router.put("/api/thinking/paths/{id}", tags=["Thinking"])
async def update_path(request: Request, id: str, body: BranchPathUpdate):
    uid = get_user_id(request)
    sb = get_supabase()
    data = {}
    if body.content is not None: data["summary"] = body.content
    if body.sequence_order is not None: data["sort_order"] = body.sequence_order
    res = sb.table("branch_paths").update(data).eq("id", id).eq("user_id", uid).execute()
    return res.data[0] if res.data else None

@router.delete("/api/thinking/paths/{id}", tags=["Thinking"])
async def delete_path(request: Request, id: str):
    uid = get_user_id(request)
    sb = get_supabase()
    sb.table("branch_paths").delete().eq("id", id).eq("user_id", uid).execute()
    return {"status": "deleted"}

# --- Graveyard ---
@router.get("/api/thinking/graveyard/{project_id}", tags=["Thinking"])
async def get_graveyard(request: Request, project_id: str):
    uid = get_user_id(request)
    sb = get_supabase()
    res = sb.table("graveyard").select("*").eq("project_id", project_id).eq("user_id", uid).order("archived_at", desc=True).execute()
    return res.data

@router.delete("/api/thinking/graveyard/{id}", tags=["Thinking"])
async def delete_graveyard_item(request: Request, id: str):
    uid = get_user_id(request)
    sb = get_supabase()
    sb.table("graveyard").delete().eq("id", id).eq("user_id", uid).execute()
    return {"status": "deleted"}

@router.delete("/api/thinking/graveyard/empty/{project_id}", tags=["Thinking"])
async def empty_graveyard(request: Request, project_id: str):
    uid = get_user_id(request)
    sb = get_supabase()
    sb.table("graveyard").delete().eq("project_id", project_id).eq("user_id", uid).execute()
    return {"status": "emptied"}
