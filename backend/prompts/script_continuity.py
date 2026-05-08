"""
Script Continuity Guard — injected into every SSO prompt when project.primary_language
is a non-Latin Indic language. Prevents the AI from drifting to English responses
when Hinglish ratio is borderline.
"""

CONTINUITY_GUARD_PROMPT = """
SCRIPT CONTINUITY INSTRUCTION (non-negotiable):
This manuscript is a {primary_language} fiction project. The writer may use Hinglish
(mixed Hindi-English) — this is intentional and stylistic, not an error.
Your response MUST follow these rules:
1. All editorial suggestions and analysis must be in {primary_language}.
2. If suggesting a rewrite of a sentence, match the script of the original sentence.
3. Do NOT suggest switching to English where the original uses {primary_language}.
4. Do NOT flag Hinglish as 'inconsistent register' — it is the writer's voice.
5. If you detect that more than 30% of this scene is in {primary_language} script,
   treat the entire scene as {primary_language}-primary regardless of English words.
"""

LANGUAGE_NAMES = {
    'hi': 'Hindi',
    'kn': 'Kannada',
    'ta': 'Tamil',
    'te': 'Telugu',
    'mr': 'Marathi',
}

def build_continuity_guard(primary_lang_code: str) -> str | None:
    """
    Return the script continuity injection if project is Indic-primary.
    Returns None for English-primary projects — no injection needed.
    """
    lang_name = LANGUAGE_NAMES.get(primary_lang_code)
    if not lang_name:
        return None
    return CONTINUITY_GUARD_PROMPT.format(primary_language=lang_name)
