"""
Preserve and normalise Indic punctuation in prose before AI processing.
"""

import regex

DANDA        = '\u0964'   # ।
DOUBLE_DANDA = '\u0965'   # ॥

DEVA_DIGITS = str.maketrans('०१२३४५६७८९', '0123456789')

def preserve_danda(text: str) -> str:
    """Ensure Danda is surrounded by a single space on each side."""
    text = regex.sub(r'([^\s])' + DANDA, r'\1 ' + DANDA, text)
    text = regex.sub(DANDA + r'([^\s])', DANDA + r' \1', text)
    return text

def normalise_deva_numerals(text: str, target: str = 'western') -> str:
    """Convert Devanagari numerals to western (0-9) or vice versa."""
    if target == 'western':
        return text.translate(DEVA_DIGITS)
    reverse_map = str.maketrans('0123456789','०१२३४५६७८९')
    return text.translate(reverse_map)

def normalise_indic_punctuation(text: str, numeral_target: str = 'preserve') -> str:
    """Master normalisation function. Run on all text before AI prompt assembly."""
    text = preserve_danda(text)
    if numeral_target != 'preserve':
        text = normalise_deva_numerals(text, numeral_target)
    return text
