from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from typing import List, Optional

from database import get_supabase
from routers.auth_routes import get_current_user
from services.text_analysis.indic_counter import count_indic_words
from services.text_analysis.transliterator import transliterate_text
from services.text_analysis.spellcheck import check_words

router = APIRouter(prefix="/api/editor", tags=["Editor Tools"])

# --- Models ---
class TransliterateRequest(BaseModel):
    text: str
    source_script: str = 'IAST'
    target_script: str = 'DEVANAGARI'

class SpellCheckRequest(BaseModel):
    words: List[str]
    language: str

# --- Endpoints ---

@router.get('/wordcount/{scene_id}')
async def get_word_count(scene_id: str, user=Depends(get_current_user)):
    """Return per-script word count for a scene."""
    sb = get_supabase()
    res = sb.table('scenes').select('content').eq('id', scene_id).eq('user_id', user['id']).execute()
    if not res.data:
        raise HTTPException(404, detail='Scene not found')
    return count_indic_words(res.data[0]['content'])

@router.post('/transliterate')
async def transliterate_endpoint(body: TransliterateRequest, user=Depends(get_current_user)):
    """Transliterate Roman/IAST text to target Indic script."""
    try:
        return await transliterate_text(body.text, body.source_script, body.target_script)
    except ValueError as e:
        raise HTTPException(400, detail=str(e))

@router.post('/spellcheck')
async def spellcheck_endpoint(body: SpellCheckRequest, user=Depends(get_current_user)):
    """Batch spellcheck words against Indic dictionaries."""
    return {'results': await check_words(body.words, body.language)}

# --- IME Session Handler (V9) ---
# In-memory session tracking for demo, ideally uses Redis
IME_SESSIONS = {} 

@router.post('/ime/start')
async def ime_start(user=Depends(get_current_user)):
    """Block autosave and AI triggers during IME composition."""
    IME_SESSIONS[user['id']] = True
    return {'composing': True}

@router.post('/ime/end')
async def ime_end(user=Depends(get_current_user)):
    """Re-enable autosave after IME composition."""
    IME_SESSIONS[user['id']] = False
    return {'composing': False}

@router.get('/ime/status')
async def ime_status(user=Depends(get_current_user)):
    """Check if IME composition is in progress."""
    return {'composing': IME_SESSIONS.get(user['id'], False)}
