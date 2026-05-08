import unicodedata
import regex

def normalise(text: str, form: str = 'NFC') -> str:
    """
    Normalise Unicode text to NFC (default) or NFD.
    All text stored in Supabase must be NFC-normalised before upsert.
    All search queries must be NFC-normalised before pg LIKE/ILIKE.
    """
    return unicodedata.normalize(form, text)

def normalise_search_query(query: str) -> str:
    """
    Prepare a search query for Indic-safe Postgres full-text search.
    Steps: NFC normalise → strip diacritics optional → lowercase Latin chars.
    """
    nfc = normalise(query, 'NFC')
    return regex.sub(r'[a-zA-Z]+', lambda m: m.group().lower(), nfc)
