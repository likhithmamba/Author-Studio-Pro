from backend.services.text_analysis.unicode_normaliser import normalise

try:
    from indic_transliteration.sanscript import transliterate, DEVANAGARI, IAST
except ImportError:
    transliterate = None

try:
    from rapidfuzz import fuzz
except ImportError:
    import difflib
    class fuzz:
        @staticmethod
        def ratio(s1, s2):
            return difflib.SequenceMatcher(None, s1, s2).ratio() * 100

def to_roman(indic_text: str) -> str:
    """Transliterate any Indic script token to IAST for cross-script comparison."""
    if not transliterate:
        return normalise(indic_text).lower()
    return transliterate(normalise(indic_text), DEVANAGARI, IAST).lower()

def entities_are_same(name_a: str, name_b: str, threshold: int = 88) -> bool:
    """Return True if name_a and name_b likely refer to the same entity across scripts."""
    a = to_roman(name_a) if not name_a.isascii() else name_a.lower()
    b = to_roman(name_b) if not name_b.isascii() else name_b.lower()
    score = fuzz.ratio(a, b)
    return score >= threshold

def resolve_entity_duplicates(entities: list[dict]) -> list[dict]:
    """Merge cross-script duplicates. The highest-frequency name wins as canonical form."""
    merged = []
    used = set()
    for i, entity in enumerate(entities):
        if i in used:
            continue
        group = [entity]
        for j, other in enumerate(entities[i+1:], start=i+1):
            if j not in used and entities_are_same(entity['name'], other['name']):
                group.append(other)
                used.add(j)
        canonical = max(group, key=lambda e: e['frequency'])
        
        # Ensure aliases is initialized
        if 'aliases' not in canonical:
            canonical['aliases'] = []
            
        canonical['aliases'].extend([e['name'] for e in group if e['name'] != canonical['name']])
        canonical['frequency'] = sum(e['frequency'] for e in group)
        merged.append(canonical)
        used.add(i)
    return merged
