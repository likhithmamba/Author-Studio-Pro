import json
from pathlib import Path
import logging

logger = logging.getLogger(__name__)

try:
    import enchant
    DICT_PATH = Path('backend/data/dictionaries')

    LANG_MAP = {}

    def try_load_dict(lang_code, dict_name, file_name):
        try:
            dict_file = DICT_PATH / file_name
            if dict_file.exists():
                return enchant.DictWithPWL(dict_name, str(dict_file))
            else:
                return enchant.Dict(dict_name)
        except Exception as e:
            logger.warning(f"Failed to load dictionary {dict_name}: {e}")
            return None

    LANG_MAP['hi'] = try_load_dict('hi', 'hi_IN', 'hi_IN.dic')
    LANG_MAP['kn'] = try_load_dict('kn', 'kn_IN', 'kn_IN.dic')
    LANG_MAP['ta'] = try_load_dict('ta', 'ta_IN', 'ta_IN.dic')
    LANG_MAP['te'] = try_load_dict('te', 'te_IN', 'te_IN.dic')

    try:
        LANG_MAP['en'] = enchant.Dict('en_US')
    except Exception as e:
        logger.warning(f"Failed to load english dictionary en_US: {e}")
        LANG_MAP['en'] = None

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
