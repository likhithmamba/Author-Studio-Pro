"""
Indic-aware token estimation for AI mode budget enforcement.
"""

from backend.services.text_analysis.indic_counter import count_indic_words

TOKEN_MULTIPLIERS = {
    'latin':      1.3,
    'devanagari': 2.8,
    'kannada':    3.1,
    'tamil':      2.9,
    'telugu':     3.0,
}

def estimate_tokens(text: str) -> int:
    """
    Return a conservative token estimate for mixed-script text.
    Adds 10% safety buffer.
    """
    counts = count_indic_words(text)
    estimated = sum(
        counts.get(script, 0) * mult
        for script, mult in TOKEN_MULTIPLIERS.items()
    )
    return int(estimated * 1.10)
