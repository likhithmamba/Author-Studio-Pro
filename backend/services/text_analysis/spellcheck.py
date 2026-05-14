import json
from pathlib import Path

try:
    import enchant
    DICT_PATH = Path('backend/data/dictionaries')
    LANG_MAP = {}

    try:
        LANG_MAP['hi'] = enchant.DictWithPWL('hi_IN', str(DICT_PATH / 'hi_IN.dic'))
    except enchant.errors.DictNotFoundError:
        pass

    try:
        LANG_MAP['kn'] = enchant.DictWithPWL('kn_IN', str(DICT_PATH / 'kn_IN.dic'))
    except enchant.errors.DictNotFoundError:
        pass

    try:
        LANG_MAP['ta'] = enchant.DictWithPWL('ta_IN', str(DICT_PATH / 'ta_IN.dic'))
    except enchant.errors.DictNotFoundError:
        pass

    try:
        LANG_MAP['te'] = enchant.DictWithPWL('te_IN', str(DICT_PATH / 'te_IN.dic'))
    except enchant.errors.DictNotFoundError:
        pass

    try:
        LANG_MAP['en'] = enchant.Dict('en_US')
    except enchant.errors.DictNotFoundError:
        pass

except ImportError:
    enchant = None

# In-memory cache fallback since redis might not be available
_cache = {}

async def check_words(words: list[str], language: str) -> list[dict]:
    """Check a batch of words against the appropriate Hunspell dictionary."""
    if not enchant:
        return [{'word': w, 'correct': True, 'suggestions': []} for w in words]
        
    d = LANG_MAP.get(language, LANG_MAP.get('en'))
    if not d:
        return [{'word': w, 'correct': True, 'suggestions': []} for w in words]

    results = []
    for word in words[:200]:
        cache_key = f'spell:{language}:{word}'
        if cache_key in _cache:
            results.append(_cache[cache_key])
            continue
            
        correct = d.check(word)
        suggestions = d.suggest(word)[:5] if not correct else []
        entry = {'word': word, 'correct': correct, 'suggestions': suggestions}
        _cache[cache_key] = entry
        results.append(entry)
    return results
