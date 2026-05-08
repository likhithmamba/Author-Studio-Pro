"""
Enhanced language router v2.
Improvements over v1:
  1. Multi-pass detection — runs langdetect 3 times, takes majority vote
  2. Script ratio fallback — if langdetect confidence < threshold, use character-level Indic ratio
  3. Hinglish-aware — Hinglish routes to Gemini only above 40% Indic ratio
"""

from collections import Counter
from backend.services.text_analysis.indic_counter import count_indic_words

try:
    from langdetect import detect_langs, DetectorFactory
    DetectorFactory.seed = 42  # CRITICAL: make langdetect deterministic
except ImportError:
    detect_langs = None

SUPPORTED_INDIC   = {'hi','kn','ta','te','mr','gu','pa'}
CONFIDENCE_MIN    = 0.85
INDIC_RATIO_MIN   = 0.40   # 40% Indic tokens triggers Indic routing
PASSES            = 3      # multi-pass voting runs

MODEL_INDIC_PAID  = 'google/gemini-flash-1.5'         # via OpenRouter
MODEL_INDIC_FREE  = 'google/gemini-flash-1.5-8b'      # cheaper for free tier
MODEL_LATIN_PAID  = 'anthropic/claude-3-5-sonnet'
MODEL_LATIN_FREE  = 'anthropic/claude-3-haiku'

def detect_language_robust(text: str) -> tuple[str, float]:
    """Run langdetect PASSES times, return majority-vote language and mean confidence."""
    if not detect_langs:
        return 'en', 1.0
        
    results = []
    for _ in range(PASSES):
        try:
            langs = detect_langs(text)
            results.append((langs[0].lang, langs[0].prob))
        except Exception:
            results.append(('en', 0.5))
    
    lang_votes = Counter(r[0] for r in results)
    top_lang = lang_votes.most_common(1)[0][0]
    mean_conf = sum(r[1] for r in results if r[0] == top_lang) / lang_votes[top_lang]
    return top_lang, mean_conf

async def route_model(text: str, user_id: str, tier: str, byok_model: str | None = None) -> str:
    """Determine the correct OpenRouter model string for this text and user."""
    if byok_model:
        return byok_model
        
    # Fast path: character-level script ratio
    counts = count_indic_words(text)
    indic_total = sum(counts.get(s,0) for s in ['devanagari','kannada','tamil','telugu'])
    indic_ratio  = indic_total / max(counts['total'], 1)
    
    if indic_ratio >= INDIC_RATIO_MIN:
        return MODEL_INDIC_PAID if tier != 'free' else MODEL_INDIC_FREE
        
    # Slow path: langdetect for ambiguous Latin/Hinglish
    lang, conf = detect_language_robust(text)
    if lang in SUPPORTED_INDIC and conf >= CONFIDENCE_MIN:
        return MODEL_INDIC_PAID if tier != 'free' else MODEL_INDIC_FREE
        
    return MODEL_LATIN_PAID if tier != 'free' else MODEL_LATIN_FREE
