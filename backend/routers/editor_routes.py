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
    empty = {"scenes": [], "characters": [], "locations": [], "timeline_events": [], "research_notes": []}
    if not sb:
        return empty
    
    try:
        scenes = sb.table("scenes").select("*").eq("project_id", project_id).eq("user_id", uid).order("position").execute()
        chars = sb.table("characters").select("*").eq("project_id", project_id).eq("user_id", uid).execute()
        locs = sb.table("locations").select("*").eq("project_id", project_id).eq("user_id", uid).execute()
        timeline = sb.table("timeline_events").select("*").eq("project_id", project_id).eq("user_id", uid).order("sort_order").execute()
        research = sb.table("research_notes").select("*").eq("project_id", project_id).eq("user_id", uid).execute()
        
        return {
            "scenes": scenes.data or [],
            "characters": chars.data or [],
            "locations": locs.data or [],
            "timeline_events": timeline.data or [],
            "research_notes": research.data or []
        }
    except Exception as e:
        logger.warning(f"get_editor_data failed for project {project_id}: {e}")
        return empty

# --- Scenes ---

@router.post("/api/scenes", tags=["Editor"])
async def create_scene(request: Request, body: SceneCreate):
    uid = get_user_id(request)
    sb = get_supabase()
    if not sb:
        return {"error": "Database offline", "id": None}
    try:
        data = body.dict()
        data["user_id"] = uid
        res = sb.table("scenes").insert(data).execute()
        return res.data[0] if res.data else {"error": "Insert failed"}
    except Exception as e:
        logger.warning(f"create_scene failed: {e}")
        raise HTTPException(500, f"Failed to create scene: {str(e)[:200]}")

@router.put("/api/scenes/{scene_id}/content", tags=["Editor"])
async def save_scene_content(request: Request, scene_id: str, body: SceneContentUpdate):
    uid = get_user_id(request)
    sb = get_supabase()
    if not sb:
        return {"scene_id": scene_id, "status": "offline"}
    
    try:
        # 1. Fetch current scene
        scene_res = sb.table("scenes").select("updated_at", "content").eq("id", scene_id).eq("user_id", uid).execute()
        if not scene_res.data:
            raise HTTPException(404, "Scene not found")
        scene = scene_res.data[0]
        
        # 2. Conflict detection
        if body.saved_at and scene.get("updated_at") and body.saved_at < scene["updated_at"]:
            raise HTTPException(status_code=409, detail={
                "conflict": True,
                "server_content": scene["content"],
                "server_updated_at": scene["updated_at"]
            })
        
        # 3. Update content
        upd = sb.table("scenes").update({"content": body.content}).eq("id", scene_id).eq("user_id", uid).execute()
        
        # 4. Create version (non-blocking, don't crash if versions table fails)
        try:
            sb.table("scene_versions").insert({
                "scene_id": scene_id,
                "user_id": uid,
                "content": body.content,
                "label": "Auto-save"
            }).execute()
        except Exception as ve:
            logger.warning(f"Version creation failed (non-fatal): {ve}")
        
        if upd.data:
            return {"scene_id": scene_id, "saved_at": upd.data[0].get("updated_at")}
        return {"scene_id": scene_id, "status": "saved"}
    except HTTPException:
        raise
    except Exception as e:
        logger.warning(f"save_scene_content failed: {e}")
        raise HTTPException(500, f"Failed to save scene: {str(e)[:200]}")

@router.put("/api/scenes/{scene_id}/meta", tags=["Editor"])
async def update_scene_meta(request: Request, scene_id: str, body: SceneMetaUpdate):
    uid = get_user_id(request)
    sb = get_supabase()
    if not sb:
        return {"status": "offline"}
    try:
        data = {k: v for k, v in body.dict().items() if v is not None}
        res = sb.table("scenes").update(data).eq("id", scene_id).eq("user_id", uid).execute()
        return res.data[0] if res.data else {"status": "updated"}
    except Exception as e:
        logger.warning(f"update_scene_meta failed: {e}")
        raise HTTPException(500, f"Failed to update scene meta: {str(e)[:200]}")

@router.delete("/api/scenes/{scene_id}", tags=["Editor"])
async def delete_scene(request: Request, scene_id: str):
    uid = get_user_id(request)
    sb = get_supabase()
    if not sb:
        return {"status": "offline"}
    try:
        sb.table("scenes").delete().eq("id", scene_id).eq("user_id", uid).execute()
        return {"status": "deleted"}
    except Exception as e:
        logger.warning(f"delete_scene failed: {e}")
        raise HTTPException(500, f"Failed to delete scene: {str(e)[:200]}")

# --- Versions ---

@router.get("/api/scenes/{scene_id}/versions", tags=["Editor"])
async def get_scene_versions(request: Request, scene_id: str):
    uid = get_user_id(request)
    sb = get_supabase()
    if not sb:
        return {"versions": []}
    try:
        res = sb.table("scene_versions").select("*").eq("scene_id", scene_id).eq("user_id", uid).order("created_at", desc=True).limit(50).execute()
        return {"versions": res.data or []}
    except Exception as e:
        logger.warning(f"get_scene_versions failed: {e}")
        return {"versions": []}

@router.post("/api/scenes/{scene_id}/versions/restore/{version_id}", tags=["Editor"])
async def restore_version(request: Request, scene_id: str, version_id: str):
    uid = get_user_id(request)
    sb = get_supabase()
    if not sb:
        raise HTTPException(503, "Database offline")
    try:
        ver = sb.table("scene_versions").select("content").eq("id", version_id).eq("user_id", uid).execute()
        if not ver.data:
            raise HTTPException(404, "Version not found")
            
        content = ver.data[0]["content"]
        
        # Update scene
        sb.table("scenes").update({"content": content}).eq("id", scene_id).eq("user_id", uid).execute()
        
        # Create "restored" version marker
        try:
            sb.table("scene_versions").insert({
                "scene_id": scene_id,
                "user_id": uid,
                "content": content,
                "label": f"Restored from v_{version_id[:8]}"
            }).execute()
        except Exception:
            pass
        
        return {"content": content}
    except HTTPException:
        raise
    except Exception as e:
        logger.warning(f"restore_version failed: {e}")
        raise HTTPException(500, f"Failed to restore version: {str(e)[:200]}")

# --- Analysis endpoint for editor ---

class ProseAnalysisRequest(BaseModel):
    text: str

@router.post("/api/analysis/prose", tags=["Editor"])
async def analyse_prose(request: Request, body: ProseAnalysisRequest):
    """Quick prose analysis for the editor inspector panel."""
    text = body.text.strip()
    if len(text) < 50:
        return {"error": "Text too short for analysis"}
    
    words = text.split()
    word_count = len(words)
    sentences = [s.strip() for s in text.replace("!", ".").replace("?", ".").split(".") if s.strip()]
    sentence_count = max(len(sentences), 1)
    avg_sentence_len = word_count / sentence_count
    
    # Sentence lengths
    sentence_lengths = [len(s.split()) for s in sentences[:20]]
    
    # Passive voice heuristic (was/were/been/being + past participle pattern)
    passive_words = ["was", "were", "been", "being", "is", "are"]
    passive_count = sum(1 for w in words if w.lower() in passive_words)
    passive_pct = min(round((passive_count / max(word_count, 1)) * 100), 30)
    
    # Adverb density (words ending in -ly)
    adverbs = sum(1 for w in words if w.lower().endswith("ly") and len(w) > 3)
    adverb_pct = min(round((adverbs / max(word_count, 1)) * 100), 20)
    
    # Dialogue ratio (text inside quotes)
    import re
    dialogue = re.findall(r'"[^"]*"', text) + re.findall(r'"[^"]*"', text)
    dialogue_words = sum(len(d.split()) for d in dialogue)
    dialogue_ratio = round((dialogue_words / max(word_count, 1)) * 100)
    
    # Readability (Flesch-ish approximation)
    syllable_count = sum(max(1, len(re.findall(r'[aeiouy]+', w.lower()))) for w in words)
    readability = max(0, min(100, round(206.835 - 1.015 * (word_count / sentence_count) - 84.6 * (syllable_count / word_count))))
    
    # Variety score
    unique_lengths = len(set(sentence_lengths))
    variety = min(100, round((unique_lengths / max(len(sentence_lengths), 1)) * 100))
    
    # Overused words
    from collections import Counter
    common_words = {"the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with", "is", "was", "it", "that", "this", "i", "he", "she", "they", "we", "you"}
    word_freq = Counter(w.lower().strip(".,!?;:\"'()") for w in words if w.lower().strip(".,!?;:\"'()") not in common_words and len(w) > 2)
    overused = [{"word": w, "count": c} for w, c in word_freq.most_common(6) if c >= 3]
    
    # Grade
    score = (readability * 0.3 + variety * 0.2 + max(0, 100 - passive_pct * 5) * 0.2 + max(0, 100 - adverb_pct * 8) * 0.15 + min(100, dialogue_ratio * 3) * 0.15)
    grade = "A+" if score >= 90 else "A" if score >= 85 else "A-" if score >= 80 else "B+" if score >= 75 else "B" if score >= 70 else "B-" if score >= 65 else "C+" if score >= 60 else "C" if score >= 55 else "C-"
    
    return {
        "grade": grade,
        "summary": f"{word_count} words, {sentence_count} sentences. Avg sentence: {avg_sentence_len:.0f} words.",
        "readability": readability,
        "pacing": min(100, max(20, round(variety * 0.6 + (100 - passive_pct * 3) * 0.4))),
        "sentenceVariety": variety,
        "showVsTell": max(40, min(95, 100 - passive_pct * 2)),
        "dialogueRatio": dialogue_ratio,
        "passiveVoice": passive_pct,
        "adverbDensity": adverb_pct,
        "clicheScore": max(60, 100 - len(overused) * 5),
        "overusedWords": overused,
        "sentenceLengths": sentence_lengths,
    }

# --- AI Assist endpoint for editor ---

class AIAssistRequest(BaseModel):
    mode: str = "critique"
    text: str = ""

@router.post("/api/ai/assist", tags=["Editor"])
async def ai_assist(request: Request, body: AIAssistRequest):
    """AI editorial assistance for the editor. Returns structured feedback."""
    # For now, return intelligent placeholder feedback based on text analysis
    text = body.text.strip()
    if not text or len(text) < 30:
        return {"feedback": [{"type": "suggest", "icon": "→", "color": "#c9915a", "title": "SUGGESTION", "text": "Write at least a few sentences to get AI feedback."}]}
    
    sentences = [s.strip() for s in text.replace("!", ".").replace("?", ".").split(".") if s.strip()]
    words = text.split()
    
    feedback = []
    
    # Check for very long sentences
    long_sentences = [s for s in sentences if len(s.split()) > 30]
    if long_sentences:
        feedback.append({
            "type": "flag", "icon": "⚠", "color": "#e0b452",
            "title": "PACING FLAG",
            "text": f"Found {len(long_sentences)} sentence(s) over 30 words. Consider breaking them for readability."
        })
    
    # Check for dialogue
    import re
    has_dialogue = bool(re.search(r'["""][^"""]+["""]', text))
    if not has_dialogue and len(words) > 100:
        feedback.append({
            "type": "suggest", "icon": "→", "color": "#c9915a",
            "title": "SUGGESTION",
            "text": "This passage has no dialogue. Consider adding character voice to break up narrative."
        })
    
    # Check for strong verbs vs. weak verbs
    weak_verbs = sum(1 for w in words if w.lower() in {"was", "were", "had", "got", "went", "made", "did", "said"})
    if weak_verbs > len(words) * 0.05:
        feedback.append({
            "type": "suggest", "icon": "→", "color": "#c9915a",
            "title": "VERB STRENGTH",
            "text": f"Weak verbs detected ({weak_verbs} instances). Replace 'was/had/got' with specific, vivid verbs."
        })
    
    # Always give at least one piece of praise
    if len(sentences) >= 3:
        feedback.insert(0, {
            "type": "praise", "icon": "✦", "color": "#52b452",
            "title": "STRONG PASSAGE",
            "text": f"Good momentum across {len(sentences)} sentences. The writing has a natural flow."
        })
    
    if not feedback:
        feedback.append({
            "type": "praise", "icon": "✦", "color": "#52b452",
            "title": "CLEAN PROSE",
            "text": "No major issues detected. Solid writing."
        })
    
    return {"feedback": feedback}

# --- Metadata (Characters, Locations, etc.) ---

@router.post("/api/characters", tags=["Editor"])
async def create_character(request: Request, body: CharacterCreate):
    uid = get_user_id(request)
    sb = get_supabase()
    if not sb:
        return {"error": "Database offline"}
    try:
        data = body.dict()
        data["user_id"] = uid
        res = sb.table("characters").insert(data).execute()
        return res.data[0] if res.data else {"error": "Insert failed"}
    except Exception as e:
        logger.warning(f"create_character failed: {e}")
        raise HTTPException(500, f"Failed to create character: {str(e)[:200]}")

@router.delete("/api/characters/{id}", tags=["Editor"])
async def delete_character(request: Request, id: str):
    uid = get_user_id(request)
    sb = get_supabase()
    if not sb:
        return {"status": "offline"}
    try:
        sb.table("characters").delete().eq("id", id).eq("user_id", uid).execute()
        return {"status": "deleted"}
    except Exception as e:
        logger.warning(f"delete_character failed: {e}")
        raise HTTPException(500, f"Failed to delete character: {str(e)[:200]}")

@router.post("/api/locations", tags=["Editor"])
async def create_location(request: Request, body: LocationCreate):
    uid = get_user_id(request)
    sb = get_supabase()
    if not sb:
        return {"error": "Database offline"}
    try:
        data = body.dict()
        data["user_id"] = uid
        res = sb.table("locations").insert(data).execute()
        return res.data[0] if res.data else {"error": "Insert failed"}
    except Exception as e:
        logger.warning(f"create_location failed: {e}")
        raise HTTPException(500, f"Failed to create location: {str(e)[:200]}")

@router.delete("/api/locations/{id}", tags=["Editor"])
async def delete_location(request: Request, id: str):
    uid = get_user_id(request)
    sb = get_supabase()
    if not sb:
        return {"status": "offline"}
    try:
        sb.table("locations").delete().eq("id", id).eq("user_id", uid).execute()
        return {"status": "deleted"}
    except Exception as e:
        logger.warning(f"delete_location failed: {e}")
        raise HTTPException(500, f"Failed to delete location: {str(e)[:200]}")

@router.post("/api/timeline", tags=["Editor"])
async def create_timeline_event(request: Request, body: TimelineEventCreate):
    uid = get_user_id(request)
    sb = get_supabase()
    if not sb:
        return {"error": "Database offline"}
    try:
        data = body.dict()
        data["user_id"] = uid
        res = sb.table("timeline_events").insert(data).execute()
        return res.data[0] if res.data else {"error": "Insert failed"}
    except Exception as e:
        logger.warning(f"create_timeline_event failed: {e}")
        raise HTTPException(500, f"Failed to create timeline event: {str(e)[:200]}")

@router.delete("/api/timeline/{id}", tags=["Editor"])
async def delete_timeline_event(request: Request, id: str):
    uid = get_user_id(request)
    sb = get_supabase()
    if not sb:
        return {"status": "offline"}
    try:
        sb.table("timeline_events").delete().eq("id", id).eq("user_id", uid).execute()
        return {"status": "deleted"}
    except Exception as e:
        logger.warning(f"delete_timeline_event failed: {e}")
        raise HTTPException(500, f"Failed to delete timeline event: {str(e)[:200]}")

@router.post("/api/research", tags=["Editor"])
async def create_research_note(request: Request, body: ResearchNoteCreate):
    uid = get_user_id(request)
    sb = get_supabase()
    if not sb:
        return {"error": "Database offline"}
    try:
        data = body.dict()
        data["user_id"] = uid
        res = sb.table("research_notes").insert(data).execute()
        return res.data[0] if res.data else {"error": "Insert failed"}
    except Exception as e:
        logger.warning(f"create_research_note failed: {e}")
        raise HTTPException(500, f"Failed to create research note: {str(e)[:200]}")

@router.delete("/api/research/{id}", tags=["Editor"])
async def delete_research_note(request: Request, id: str):
    uid = get_user_id(request)
    sb = get_supabase()
    if not sb:
        return {"status": "offline"}
    try:
        sb.table("research_notes").delete().eq("id", id).eq("user_id", uid).execute()
        return {"status": "deleted"}
    except Exception as e:
        logger.warning(f"delete_research_note failed: {e}")
        raise HTTPException(500, f"Failed to delete research note: {str(e)[:200]}")

# --- Sessions ---
class SessionDelta(BaseModel):
    project_id: str
    words_added: int

@router.post("/api/sessions", tags=["Editor"])
async def update_session(request: Request, body: SessionDelta):
    uid = get_user_id(request)
    sb = get_supabase()
    if not sb:
        return {"status": "offline"}
    
    try:
        today = datetime.utcnow().strftime("%Y-%m-%d")
        
        existing = sb.table("writing_sessions").select("*").eq("project_id", body.project_id).eq("user_id", uid).eq("session_date", today).execute()
        if existing.data:
            curr = existing.data[0]["words_added"]
            res = sb.table("writing_sessions").update({"words_added": curr + body.words_added}).eq("id", existing.data[0]["id"]).execute()
            return res.data[0] if res.data else {"status": "updated"}
        else:
            res = sb.table("writing_sessions").insert({
                "project_id": body.project_id,
                "user_id": uid,
                "session_date": today,
                "words_added": body.words_added
            }).execute()
            return res.data[0] if res.data else {"status": "created"}
    except Exception as e:
        logger.warning(f"update_session failed: {e}")
        return {"status": "offline", "error": str(e)[:200]}
