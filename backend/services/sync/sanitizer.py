from backend.services.text_analysis.unicode_normaliser import normalise

EXCLUDED_FIELDS = {'user_id', 'id', 'created_at'}

def sanitize_for_sync(record: dict) -> dict:
    """Strip text fields and NFC-normalise all string values before Supabase upsert."""
    record = {k: (normalise(v) if isinstance(v, str) else v) for k, v in record.items()}
    return {k: v for k, v in record.items() if k not in EXCLUDED_FIELDS}
