import hashlib
import json

try:
    from indic_transliteration import sanscript
    from indic_transliteration.sanscript import transliterate
    SUPPORTED_PAIRS = {
        ('IAST', 'DEVANAGARI'):  (sanscript.IAST, sanscript.DEVANAGARI),
        ('HK', 'DEVANAGARI'):    (sanscript.HK,   sanscript.DEVANAGARI),
        ('IAST', 'KANNADA'):     (sanscript.IAST, sanscript.KANNADA),
        ('IAST', 'TAMIL'):       (sanscript.IAST, sanscript.TAMIL),
        ('IAST', 'TELUGU'):      (sanscript.IAST, sanscript.TELUGU),
    }
except ImportError:
    transliterate = None
    SUPPORTED_PAIRS = {}

_cache = {}

async def transliterate_text(
    text: str, source: str = 'IAST', target: str = 'DEVANAGARI'
) -> dict:
    """Transliterate Roman/IAST text to target Indic script."""
    if not transliterate:
        return {'original': text, 'transliterated': text, 'script_used': target}
        
    pair = (source.upper(), target.upper())
    if pair not in SUPPORTED_PAIRS:
        raise ValueError(f'Unsupported pair: {pair}. Supported: {list(SUPPORTED_PAIRS)}')
        
    cache_key = 'translit:' + hashlib.sha256(f'{source}:{target}:{text}'.encode()).hexdigest()[:24]
    if cache_key in _cache:
        return _cache[cache_key]
        
    src_script, tgt_script = SUPPORTED_PAIRS[pair]
    result = transliterate(text, src_script, tgt_script)
    payload = {'original': text, 'transliterated': result, 'script_used': target}
    _cache[cache_key] = payload
    return payload
