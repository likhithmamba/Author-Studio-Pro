"""
Unicode-aware word counter for multilingual Indian fiction manuscripts.
Supports: Latin (English), Devanagari (Hindi/Sanskrit), Kannada, Tamil, Telugu.
Handles Hinglish (mixed Latin+Devanagari) without double-counting boundary tokens.
"""

import regex

# Unicode script ranges — verified against Unicode 15.0
SCRIPT_RANGES = {
    'devanagari': (0x0900, 0x097F),
    'kannada':    (0x0C80, 0x0CFF),
    'tamil':      (0x0B80, 0x0BFF),
    'telugu':     (0x0C00, 0x0C7F),
    'latin':      None,
}

def detect_token_script(token: str) -> str:
    """Classify a single whitespace-delimited token by dominant script."""
    counts = {'devanagari':0,'kannada':0,'tamil':0,'telugu':0,'latin':0}
    for ch in token:
        cp = ord(ch)
        classified = False
        for script, rng in SCRIPT_RANGES.items():
            if rng and rng[0] <= cp <= rng[1]:
                counts[script] += 1
                classified = True
                break
        if not classified and ch.isalpha():
            counts['latin'] += 1
    return max(counts, key=counts.get)

def count_indic_words(text: str) -> dict:
    """
    Split text on Unicode whitespace + zero-width joiners.
    Returns per-script word counts and a Hinglish detection flag.
    """
    tokens = regex.split(r'[\s\u200B\u200C\u200D]+', text.strip())
    tokens = [t for t in tokens if t]
    counts = {'devanagari':0,'kannada':0,'tamil':0,'telugu':0,'latin':0,'total':0}
    for tok in tokens:
        script = detect_token_script(tok)
        counts[script] += 1
        counts['total'] += 1
    counts['is_hinglish'] = counts['devanagari'] > 0 and counts['latin'] > 0
    return counts
