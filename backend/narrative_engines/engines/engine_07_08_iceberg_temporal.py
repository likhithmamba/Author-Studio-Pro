"""
imperialx.engines.iceberg_ratio
==================================
Engine 07: The Iceberg Ratio
Minimal AI (optional, only for edge case classification).

Measures the shown-vs-told ratio per chapter using five linguistic marker
categories. Renders conceptually as an iceberg: visible tip = shown,
submerged mass = told.

Deterministic score runs without AI.
AI is invoked ONLY when overall confidence is below 0.60 on a chapter,
to classify ambiguous passages that the rule-based system cannot resolve.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import List, Dict, Optional, Tuple

from ..shared.pipeline_core import ManuscriptDocument, Sentence


ENGINE_ID = "iceberg_ratio"
ENGINE_VERSION = "1.0.0"

CONFIDENCE_THRESHOLD = 0.60  # below this, optionally invoke AI


# ─────────────────────────────────────────────────────────────────────────────
# LINGUISTIC MARKER SETS
# ─────────────────────────────────────────────────────────────────────────────

# ── TOLD markers (submerged — increase told score) ──────────────────────────

ABSTRACT_NOUN_PATTERN = re.compile(
    r'\b(?:sadness|happiness|fear|anger|love|hatred|joy|sorrow|grief|'
    r'despair|hope|jealousy|guilt|shame|pride|anxiety|loneliness|'
    r'excitement|confusion|surprise|disappointment|regret|embarrassment|'
    r'frustration|terror|anguish|bitterness|relief|contentment)\b',
    re.IGNORECASE
)

FEELING_VERB_PATTERN = re.compile(
    r'\b(?:felt|feels|feeling|seemed|appears|appeared|looked|was|were)\s+'
    r'(?:sad|happy|angry|afraid|nervous|excited|tired|bored|confused|'
    r'lonely|guilty|proud|ashamed|anxious|depressed|elated|devastated|'
    r'terrified|horrified|overjoyed|heartbroken|miserable)\b',
    re.IGNORECASE
)

PASSIVE_VOICE_PATTERN = re.compile(
    r'\b(?:was|were|been|is|are|be)\s+'
    r'(?:\w+ed|(?:broken|taken|given|shown|written|spoken|known|'
    r'seen|done|made|found|thought|said|gone|come|begun|become))\b',
    re.IGNORECASE
)

DIALOGUE_ADVERB_TAGS = re.compile(
    r'(?:said|asked|replied|answered|whispered|shouted|muttered|cried)\s+'
    r'\w+ly\b',
    re.IGNORECASE
)

FILTERING_PHRASE_PATTERN = re.compile(
    r'\b(?:she|he|they|[A-Z][a-z]+)\s+'
    r'(?:noticed|saw|heard|felt|smelled|tasted|sensed|observed|'
    r'realized|realised|thought|decided|wondered|considered|'
    r'believed|knew|understood|remembered|forgot|imagined)\b',
    re.IGNORECASE
)

# Explicit emotion explanation — the worst form of telling
EXPLICIT_EMOTION_PATTERN = re.compile(
    r'\b(?:she|he|they|[A-Z][a-z]+)\s+(?:was|were|felt|seemed)\s+'
    r'(?:very|extremely|deeply|profoundly|overwhelmingly|incredibly)\s+\w+\b',
    re.IGNORECASE
)


# ── SHOWN markers (visible tip — increase shown score) ──────────────────────

SENSORY_SIGHT = re.compile(
    r'\b(?:saw|watched|stared|glanced|glimpsed|peered|gazed|looked|'
    r'spotted|noticed a|flickered|glowed|dimmed|shadow|light|dark|'
    r'bright|color|colour|red|blue|green|black|white|grey|gray|'
    r'pale|vivid|blinding|hazy|blurred|sharp|clear)\b',
    re.IGNORECASE
)

SENSORY_SOUND = re.compile(
    r'\b(?:heard|sound|noise|silence|quiet|loud|whisper|shout|crash|'
    r'bang|hum|click|creak|rustle|thunder|murmur|echo|ringing|'
    r'buzz|roar|screech|thud|tap|knock|footstep|breath|heartbeat)\b',
    re.IGNORECASE
)

SENSORY_TOUCH = re.compile(
    r'\b(?:felt|touch|cold|warm|hot|rough|smooth|sharp|soft|hard|'
    r'wet|dry|sticky|heavy|light|pressure|grip|weight|texture|'
    r'sting|burn|ache|tingle|numb|sweat|shiver|tremble|tension)\b',
    re.IGNORECASE
)

SENSORY_SMELL_TASTE = re.compile(
    r'\b(?:smelled|smell|scent|odor|odour|aroma|reek|stench|'
    r'tasted|taste|bitter|sweet|sour|salt|metallic|smoky|'
    r'fragrant|rotten|fresh|sharp|acrid|pungent)\b',
    re.IGNORECASE
)

PHYSICAL_ACTION_PATTERN = re.compile(
    r'\b(?:ran|walked|turned|reached|grabbed|pushed|pulled|threw|'
    r'caught|struck|fell|rose|sat|stood|crossed|entered|left|'
    r'opened|closed|lifted|dropped|spun|lunged|stepped|pressed|'
    r'leaned|flinched|recoiled|tensed|relaxed|clenched|unclenched)\b',
    re.IGNORECASE
)

DIALOGUE_CLEAN_TAG = re.compile(
    r'(?:said|asked|replied|answered|whispered|shouted|muttered)\s*[,.]',
    re.IGNORECASE
)

ACTION_BEAT_PATTERN = re.compile(
    r'[""]\s*(?:[A-Z][^""]{3,60}[.!?])\s*[""]\s*'
    r'(?:[A-Z][a-z]+\s+)?(?:crossed|turned|leaned|shrugged|nodded|shook|'
    r'stepped|moved|reached|sat|stood|rose|looked|glanced)',
    re.IGNORECASE
)


# ─────────────────────────────────────────────────────────────────────────────
# OUTPUT CONTRACT
# ─────────────────────────────────────────────────────────────────────────────

@dataclass
class IcebergChapterScore:
    chapter_id: int
    chapter_title: Optional[str]
    word_count: int

    shown_score: float          # 0–100 (tip above waterline)
    told_score: float           # 0–100 (submerged mass)
    ratio: float                # shown / (shown + told) — the waterline position
    iceberg_percentage: float   # % of chapter that is 'told' — visual metaphor

    # Component breakdown
    shown_components: Dict[str, float]
    told_components: Dict[str, float]

    confidence: float           # 0–1 — below 0.60 triggers optional AI pass
    zone: str                   # 'show_heavy' | 'balanced' | 'tell_heavy' | 'all_tell'

    # Flagged passages for UI highlighting
    worst_telling_sentences: List[str]  # top 3 offenders
    suggestion: str


@dataclass
class IcebergResult:
    manuscript_id: str
    version_hash: str
    engine_version: str

    chapters: List[IcebergChapterScore]
    manuscript_ratio: float         # overall shown/told ratio
    worst_chapter_id: Optional[int]
    best_chapter_id: Optional[int]

    ai_assisted_chapters: List[int]     # chapters where AI was invoked
    warnings: List[str]


# ─────────────────────────────────────────────────────────────────────────────
# SCORING FUNCTIONS
# ─────────────────────────────────────────────────────────────────────────────

def count_told_signals(chapter_text: str, sentences: List[Sentence], word_count: int) -> Tuple[Dict[str, float], float]:
    """
    Count all 'told' markers per 1000 words.
    Returns (component_scores dict, confidence 0–1).
    """
    if word_count == 0:
        return {}, 0.0

    scale = 1000 / word_count

    abstract_nouns = len(ABSTRACT_NOUN_PATTERN.findall(chapter_text)) * scale
    feeling_verbs  = len(FEELING_VERB_PATTERN.findall(chapter_text)) * scale
    passive_voice  = len(PASSIVE_VOICE_PATTERN.findall(chapter_text)) * scale
    adverb_tags    = len(DIALOGUE_ADVERB_TAGS.findall(chapter_text)) * scale
    filtering      = len(FILTERING_PHRASE_PATTERN.findall(chapter_text)) * scale
    explicit_emo   = len(EXPLICIT_EMOTION_PATTERN.findall(chapter_text)) * scale

    components = {
        'abstract_nouns':  min(100.0, abstract_nouns / 5.0 * 100.0),
        'feeling_verbs':   min(100.0, feeling_verbs  / 4.0 * 100.0),
        'passive_voice':   min(100.0, passive_voice  / 8.0 * 100.0),
        'adverb_tags':     min(100.0, adverb_tags    / 3.0 * 100.0),
        'filtering':       min(100.0, filtering      / 6.0 * 100.0),
        'explicit_emotion':min(100.0, explicit_emo   / 2.0 * 100.0),
    }

    told_score = sum(components.values()) / len(components)

    # Confidence: how many markers fired? More signal = higher confidence
    fired = sum(1 for v in [abstract_nouns, feeling_verbs, passive_voice,
                             adverb_tags, filtering, explicit_emo] if v > 0)
    confidence = min(1.0, fired / 4.0)

    return components, confidence


def count_shown_signals(chapter_text: str, word_count: int) -> Dict[str, float]:
    """
    Count all 'shown' markers per 1000 words.
    """
    if word_count == 0:
        return {}

    scale = 1000 / word_count

    sight = len(SENSORY_SIGHT.findall(chapter_text)) * scale
    sound = len(SENSORY_SOUND.findall(chapter_text)) * scale
    touch = len(SENSORY_TOUCH.findall(chapter_text)) * scale
    smell = len(SENSORY_SMELL_TASTE.findall(chapter_text)) * scale
    action = len(PHYSICAL_ACTION_PATTERN.findall(chapter_text)) * scale
    clean_tags = len(DIALOGUE_CLEAN_TAG.findall(chapter_text)) * scale
    action_beats = len(ACTION_BEAT_PATTERN.findall(chapter_text)) * scale

    return {
        'sight_imagery':    min(100.0, sight       / 15.0 * 100.0),
        'sound_imagery':    min(100.0, sound       / 10.0 * 100.0),
        'touch_imagery':    min(100.0, touch       / 12.0 * 100.0),
        'smell_taste':      min(100.0, smell       / 5.0  * 100.0),
        'physical_action':  min(100.0, action      / 12.0 * 100.0),
        'clean_dialogue':   min(100.0, clean_tags  / 8.0  * 100.0),
        'action_beats':     min(100.0, action_beats/ 4.0  * 100.0),
    }


def find_worst_telling_sentences(sentences: List[Sentence], n: int = 3) -> List[str]:
    """Find the sentences with the highest density of told markers."""
    scored: List[Tuple[float, str]] = []
    for sent in sentences:
        told_count = (
            len(ABSTRACT_NOUN_PATTERN.findall(sent.text)) * 3 +
            len(FEELING_VERB_PATTERN.findall(sent.text)) * 3 +
            len(FILTERING_PHRASE_PATTERN.findall(sent.text)) * 2 +
            len(EXPLICIT_EMOTION_PATTERN.findall(sent.text)) * 4 +
            len(DIALOGUE_ADVERB_TAGS.findall(sent.text)) * 2
        )
        if told_count > 0:
            scored.append((told_count, sent.text))

    scored.sort(key=lambda x: x[0], reverse=True)
    return [text[:200] for _, text in scored[:n]]


def classify_iceberg_zone(ratio: float) -> Tuple[str, str]:
    """Return (zone_label, suggestion)."""
    if ratio >= 0.70:
        return 'show_heavy', 'Excellent. Your prose trusts the reader. Maintain this balance.'
    elif ratio >= 0.50:
        return 'balanced', 'Good balance. A few passages lean on exposition — see highlighted sentences.'
    elif ratio >= 0.30:
        return 'tell_heavy', 'This chapter over-explains. Convert emotion-labels to physical reactions and sensory details.'
    else:
        return 'all_tell', 'CRITICAL: This chapter is almost entirely told. Readers will feel distant from the story. Rewrite opening paragraphs using sensory grounding and action beats.'


# ─────────────────────────────────────────────────────────────────────────────
# MAIN ENGINE
# ─────────────────────────────────────────────────────────────────────────────

def process(
    doc: ManuscriptDocument,
    manuscript_id: str,
    invoke_ai_for_low_confidence: bool = False,
    ai_client: Optional[Any] = None,
) -> IcebergResult:
    """
    Compute Iceberg Ratio for all chapters.
    
    invoke_ai_for_low_confidence: if True and ai_client is provided,
    chapters with confidence < CONFIDENCE_THRESHOLD get an AI analysis pass.
    Default: False — pure deterministic mode.
    """
    chapter_scores: List[IcebergChapterScore] = []
    ai_assisted: List[int] = []

    for chapter in doc.chapters:
        ch_sentences = doc.get_sentences_for_chapter(chapter.id)
        ch_text = doc.get_chapter_text(chapter.id)
        ch_wc = chapter.word_count

        told_components, confidence = count_told_signals(ch_text, ch_sentences, ch_wc)
        shown_components = count_shown_signals(ch_text, ch_wc)

        told_score  = sum(told_components.values()) / len(told_components)  if told_components  else 0.0
        shown_score = sum(shown_components.values()) / len(shown_components) if shown_components else 0.0

        # Ratio: shown / (shown + told)
        total = shown_score + told_score
        ratio = shown_score / total if total > 0 else 0.5

        # Optional AI pass for ambiguous chapters
        if invoke_ai_for_low_confidence and confidence < CONFIDENCE_THRESHOLD and ai_client:
            ai_result = _invoke_ai_analysis(ch_text[:1500], ai_client)
            if ai_result:
                ratio = ai_result.get('ratio', ratio)
                ai_assisted.append(chapter.id)

        iceberg_pct = round((1.0 - ratio) * 100, 1)
        zone, suggestion = classify_iceberg_zone(ratio)
        worst = find_worst_telling_sentences(ch_sentences)

        chapter_scores.append(IcebergChapterScore(
            chapter_id=chapter.id,
            chapter_title=chapter.title,
            word_count=ch_wc,
            shown_score=round(shown_score, 2),
            told_score=round(told_score, 2),
            ratio=round(ratio, 3),
            iceberg_percentage=iceberg_pct,
            shown_components=shown_components,
            told_components=told_components,
            confidence=round(confidence, 2),
            zone=zone,
            worst_telling_sentences=worst,
            suggestion=suggestion,
        ))

    # Manuscript-level ratio
    all_ratios = [c.ratio for c in chapter_scores]
    ms_ratio = sum(all_ratios) / len(all_ratios) if all_ratios else 0.5

    worst_ch = min(chapter_scores, key=lambda c: c.ratio, default=None)
    best_ch  = max(chapter_scores, key=lambda c: c.ratio, default=None)

    warnings: List[str] = []
    all_tell_chapters = [c for c in chapter_scores if c.zone == 'all_tell']
    if all_tell_chapters:
        ids = [c.chapter_id + 1 for c in all_tell_chapters]
        warnings.append(f"Chapter(s) {ids} are almost entirely told. These need full rewrites.")
    if ms_ratio < 0.40:
        warnings.append(
            f"Manuscript-wide iceberg ratio is {ms_ratio*100:.0f}% shown. "
            f"More than 60% of your manuscript is told prose. "
            f"This significantly increases reader distance from the story."
        )

    return IcebergResult(
        manuscript_id=manuscript_id,
        version_hash=doc.version_hash,
        engine_version=ENGINE_VERSION,
        chapters=chapter_scores,
        manuscript_ratio=round(ms_ratio, 3),
        worst_chapter_id=worst_ch.chapter_id if worst_ch else None,
        best_chapter_id=best_ch.chapter_id if best_ch else None,
        ai_assisted_chapters=ai_assisted,
        warnings=warnings,
    )


def _invoke_ai_analysis(text_sample: str, ai_client: Any) -> Optional[Dict]:
    """
    Optional AI pass for ambiguous passages.
    Returns {'ratio': float} or None on failure.
    Caller handles circuit breaking and fallback.
    """
    try:
        prompt = (
            "Analyse this fiction excerpt for show-vs-tell balance.\n"
            "Return ONLY valid JSON: {\"ratio\": <float 0.0-1.0>, "
            "\"primary_issue\": \"<max 80 chars>\"}\n"
            "ratio = proportion that is shown (1.0 = all shown, 0.0 = all told)\n\n"
            f"EXCERPT:\n{text_sample}"
        )
        response = ai_client.call(prompt, max_tokens=60)
        import json
        return json.loads(response)
    except Exception:
        return None


# =============================================================================
# ENGINE 08 — TEMPORAL COHERENCE ENGINE
# =============================================================================
"""
imperialx.engines.temporal_coherence
=======================================
Engine 08: Temporal Coherence Engine
No AI. Pattern matching + contradiction graph.

Tracks all time references in the manuscript and flags contradictions:
  - Character age inconsistencies
  - Season/weather contradictions without a time jump
  - Duration statement conflicts
  - Day-night cycle impossibilities

Every temporal reference is placed on an internal story timeline.
Contradictions occur when the timeline graph contains impossible edges.
"""

ENGINE_ID_TC = "temporal_coherence"
ENGINE_VERSION_TC = "1.0.0"


# ─────────────────────────────────────────────────────────────────────────────
# TEMPORAL PATTERNS
# ─────────────────────────────────────────────────────────────────────────────

# Character age
AGE_PATTERN = re.compile(
    r'\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+(?:was|is|had just turned|turned|'
    r'would be|had been)\s+(\d{1,3})\s+(?:years?\s+old|years?\s+of\s+age)?\b|'
    r'\bat\s+(?:the\s+age\s+of\s+)?(\d{1,3})[,\s]+([A-Z][a-z]+)',
    re.UNICODE
)

# Season markers
SEASON_MAP = {
    'spring': {'march', 'april', 'may', 'bloom', 'blossom', 'thaw', 'warm'},
    'summer': {'june', 'july', 'august', 'hot', 'sweltering', 'humid', 'blazing', 'heat wave'},
    'autumn': {'september', 'october', 'november', 'leaves', 'harvest', 'crisp', 'falling'},
    'winter': {'december', 'january', 'february', 'snow', 'frost', 'frozen', 'ice', 'blizzard', 'cold'},
}

MONTH_TO_SEASON = {
    'january': 'winter', 'february': 'winter', 'march': 'spring',
    'april': 'spring', 'may': 'spring', 'june': 'summer',
    'july': 'summer', 'august': 'summer', 'september': 'autumn',
    'october': 'autumn', 'november': 'autumn', 'december': 'winter',
}

MONTHS = list(MONTH_TO_SEASON.keys())
MONTH_PATTERN = re.compile(
    r'\b(january|february|march|april|may|june|july|august|'
    r'september|october|november|december)\b',
    re.IGNORECASE
)

# Duration statements
DURATION_PATTERNS = [
    (re.compile(r'\b(\w+)\s+(?:days?|weeks?|months?|years?)\s+later\b', re.IGNORECASE), 'later'),
    (re.compile(r'\bthe\s+next\s+(morning|afternoon|evening|day|week|month|year)\b', re.IGNORECASE), 'next'),
    (re.compile(r'\bthat\s+(same\s+)?(morning|afternoon|evening|night|day)\b', re.IGNORECASE), 'same_day'),
    (re.compile(r'\ba\s+(week|month|year|decade|century)\s+(?:had\s+)?passed\b', re.IGNORECASE), 'elapsed'),
    (re.compile(r'\b(three|four|five|six|seven|eight|nine|ten|\d+)\s+(days?|weeks?|months?|years?)\s+(?:had\s+)?passed\b', re.IGNORECASE), 'elapsed'),
]

# Day-night cycle
DAY_NIGHT_TOKENS = {
    'dawn': 0, 'sunrise': 1, 'morning': 2, 'noon': 3,
    'midday': 3, 'afternoon': 4, 'evening': 5, 'sunset': 6,
    'dusk': 6, 'night': 7, 'midnight': 8,
}

DAY_NIGHT_PATTERN = re.compile(
    r'\b(dawn|sunrise|morning|noon|midday|afternoon|evening|sunset|dusk|night|midnight)\b',
    re.IGNORECASE
)


# ─────────────────────────────────────────────────────────────────────────────
# OUTPUT CONTRACT
# ─────────────────────────────────────────────────────────────────────────────

@dataclass
class TemporalEvent:
    event_type: str     # 'AGE' | 'SEASON' | 'MONTH' | 'DURATION' | 'DAY_NIGHT'
    value: str          # the detected value
    chapter_id: int
    sentence_id: int
    context: str
    character_ref: Optional[str] = None   # for AGE events


@dataclass
class TemporalContradiction:
    contradiction_type: str
    description: str
    event_a: TemporalEvent
    event_b: TemporalEvent
    severity: str       # 'definite' | 'possible'


@dataclass
class TemporalResult:
    manuscript_id: str
    version_hash: str
    engine_version: str

    all_events: List[TemporalEvent]
    contradictions: List[TemporalContradiction]
    story_timeline: List[Dict]      # ordered timeline for UI rendering
    character_ages: Dict[str, List[Dict]]   # character → [{chapter, age}]
    season_map: Dict[int, str]      # chapter_id → detected season

    contradiction_count: int
    warnings: List[str]


# ─────────────────────────────────────────────────────────────────────────────
# EXTRACTION FUNCTIONS
# ─────────────────────────────────────────────────────────────────────────────

def extract_age_events(sentences: List[Sentence]) -> List[TemporalEvent]:
    events = []
    for sent in sentences:
        for match in AGE_PATTERN.finditer(sent.text):
            groups = match.groups()
            char = groups[0] or groups[3]
            age = groups[1] or groups[2]
            if char and age and 1 <= int(age) <= 130:
                events.append(TemporalEvent(
                    event_type='AGE',
                    value=age,
                    chapter_id=sent.chapter_id,
                    sentence_id=sent.id,
                    context=sent.text[:200],
                    character_ref=char.strip(),
                ))
    return events


def extract_season_events(sentences: List[Sentence]) -> List[TemporalEvent]:
    events = []
    for sent in sentences:
        text_lower = sent.text.lower()

        # Month detection (most reliable)
        month_match = MONTH_PATTERN.search(sent.text)
        if month_match:
            month = month_match.group(1).lower()
            season = MONTH_TO_SEASON[month]
            events.append(TemporalEvent(
                event_type='MONTH',
                value=month,
                chapter_id=sent.chapter_id,
                sentence_id=sent.id,
                context=sent.text[:200],
            ))
            events.append(TemporalEvent(
                event_type='SEASON',
                value=season,
                chapter_id=sent.chapter_id,
                sentence_id=sent.id,
                context=sent.text[:200],
            ))
            continue

        # Direct season words
        for season, keywords in SEASON_MAP.items():
            if any(kw in text_lower for kw in keywords):
                events.append(TemporalEvent(
                    event_type='SEASON',
                    value=season,
                    chapter_id=sent.chapter_id,
                    sentence_id=sent.id,
                    context=sent.text[:200],
                ))
                break

    return events


def extract_day_night_events(sentences: List[Sentence]) -> List[TemporalEvent]:
    events = []
    for sent in sentences:
        match = DAY_NIGHT_PATTERN.search(sent.text)
        if match:
            events.append(TemporalEvent(
                event_type='DAY_NIGHT',
                value=match.group(1).lower(),
                chapter_id=sent.chapter_id,
                sentence_id=sent.id,
                context=sent.text[:200],
            ))
    return events


# ─────────────────────────────────────────────────────────────────────────────
# CONTRADICTION DETECTION
# ─────────────────────────────────────────────────────────────────────────────

def detect_age_contradictions(age_events: List[TemporalEvent]) -> List[TemporalContradiction]:
    """
    For each character, check that age references are non-decreasing.
    A character cannot be younger in a later chapter than in an earlier one
    (unless the narrative has an explicit time-jump backwards).
    """
    contradictions = []

    # Group by character
    by_char: Dict[str, List[TemporalEvent]] = {}
    for ev in age_events:
        if ev.character_ref:
            by_char.setdefault(ev.character_ref, []).append(ev)

    for char, events in by_char.items():
        sorted_events = sorted(events, key=lambda e: e.chapter_id)
        for i in range(1, len(sorted_events)):
            prev = sorted_events[i - 1]
            curr = sorted_events[i]
            prev_age = int(prev.value)
            curr_age = int(curr.value)

            if curr_age < prev_age and curr.chapter_id > prev.chapter_id:
                contradictions.append(TemporalContradiction(
                    contradiction_type='AGE_REGRESSION',
                    description=(
                        f"{char} is {prev_age} years old in chapter {prev.chapter_id + 1} "
                        f"but {curr_age} in chapter {curr.chapter_id + 1}. "
                        f"Character cannot be younger in a later chapter without a flashback."
                    ),
                    event_a=prev,
                    event_b=curr,
                    severity='definite',
                ))

    return contradictions


def detect_season_contradictions(season_events: List[TemporalEvent]) -> List[TemporalContradiction]:
    """
    Check that season/month references do not contradict each other
    within chapters that are adjacent or close together (no time jump).
    """
    contradictions = []
    season_by_chapter: Dict[int, List[str]] = {}

    for ev in season_events:
        if ev.event_type == 'SEASON':
            season_by_chapter.setdefault(ev.chapter_id, []).append(ev.value)

    chapter_ids = sorted(season_by_chapter.keys())

    for i in range(1, len(chapter_ids)):
        prev_ch = chapter_ids[i - 1]
        curr_ch = chapter_ids[i]

        if curr_ch - prev_ch > 5:
            continue  # chapters far apart may legitimately span seasons

        prev_seasons = set(season_by_chapter[prev_ch])
        curr_seasons = set(season_by_chapter[curr_ch])

        if len(prev_seasons) == 0 or len(curr_seasons) == 0:
            continue

        # Contradiction: incompatible seasons in adjacent chapters with no time jump
        incompatible = {
            ('summer', 'winter'), ('winter', 'summer'),
            ('spring', 'autumn'), ('autumn', 'spring'),
        }
        for prev_s in prev_seasons:
            for curr_s in curr_seasons:
                if (prev_s, curr_s) in incompatible:
                    # Find representative events
                    prev_ev = next((e for e in season_events if e.chapter_id == prev_ch and e.value == prev_s), None)
                    curr_ev = next((e for e in season_events if e.chapter_id == curr_ch and e.value == curr_s), None)
                    if prev_ev and curr_ev:
                        contradictions.append(TemporalContradiction(
                            contradiction_type='SEASON_CONFLICT',
                            description=(
                                f"Chapter {prev_ch + 1} indicates {prev_s} but "
                                f"chapter {curr_ch + 1} indicates {curr_s}. "
                                f"These seasons cannot coexist in adjacent chapters "
                                f"without an explicit time jump."
                            ),
                            event_a=prev_ev,
                            event_b=curr_ev,
                            severity='definite',
                        ))

    return contradictions


def detect_day_night_contradictions(dn_events: List[TemporalEvent]) -> List[TemporalContradiction]:
    """
    Detect impossible day-night sequences within the same chapter.
    e.g. midnight in paragraph 3, then morning in paragraph 5 without a sleep.
    """
    contradictions = []
    by_chapter: Dict[int, List[TemporalEvent]] = {}
    for ev in dn_events:
        by_chapter.setdefault(ev.chapter_id, []).append(ev)

    for ch_id, events in by_chapter.items():
        sorted_events = sorted(events, key=lambda e: e.sentence_id)
        for i in range(1, len(sorted_events)):
            prev = sorted_events[i - 1]
            curr = sorted_events[i]
            prev_val = DAY_NIGHT_TOKENS.get(prev.value, -1)
            curr_val = DAY_NIGHT_TOKENS.get(curr.value, -1)

            # Jump backwards by more than 4 time units without a scene break
            if prev_val > 0 and curr_val > 0 and prev_val - curr_val > 4:
                contradictions.append(TemporalContradiction(
                    contradiction_type='DAY_NIGHT_CYCLE',
                    description=(
                        f"Chapter {ch_id + 1}: '{prev.value}' followed by '{curr.value}' "
                        f"in the same chapter without an indicated sleep or time skip."
                    ),
                    event_a=prev,
                    event_b=curr,
                    severity='possible',
                ))

    return contradictions


# ─────────────────────────────────────────────────────────────────────────────
# MAIN ENGINE
# ─────────────────────────────────────────────────────────────────────────────

def process_temporal(
    doc: ManuscriptDocument,
    manuscript_id: str,
) -> TemporalResult:
    """
    Full temporal coherence analysis.
    Cost: Zero AI. O(n) extraction + O(e^2) contradiction check where e = events.
    Typical e < 500, making the contradiction check negligible.
    """
    sentences = doc.sentences

    age_events    = extract_age_events(sentences)
    season_events = extract_season_events(sentences)
    dn_events     = extract_day_night_events(sentences)

    all_events = age_events + season_events + dn_events
    all_events.sort(key=lambda e: (e.chapter_id, e.sentence_id))

    contradictions: List[TemporalContradiction] = []
    contradictions.extend(detect_age_contradictions(age_events))
    contradictions.extend(detect_season_contradictions(season_events))
    contradictions.extend(detect_day_night_contradictions(dn_events))

    # Character age map
    char_ages: Dict[str, List[Dict]] = {}
    for ev in age_events:
        if ev.character_ref:
            char_ages.setdefault(ev.character_ref, []).append({
                'chapter': ev.chapter_id + 1,
                'age': int(ev.value),
                'context': ev.context,
            })

    # Season map by chapter
    season_ch_map: Dict[int, str] = {}
    for ev in season_events:
        if ev.event_type == 'SEASON' and ev.chapter_id not in season_ch_map:
            season_ch_map[ev.chapter_id] = ev.value

    # Story timeline for UI
    timeline = []
    for ev in all_events:
        timeline.append({
            'chapter': ev.chapter_id + 1,
            'event_type': ev.event_type,
            'value': ev.value,
            'character': ev.character_ref,
            'context': ev.context[:100],
        })

    warnings: List[str] = []
    for c in contradictions:
        if c.severity == 'definite':
            warnings.append(f"CONTRADICTION: {c.description}")
        else:
            warnings.append(f"POSSIBLE ISSUE: {c.description}")

    return TemporalResult(
        manuscript_id=manuscript_id,
        version_hash=doc.version_hash,
        engine_version=ENGINE_VERSION_TC,
        all_events=all_events,
        contradictions=contradictions,
        story_timeline=timeline,
        character_ages=char_ages,
        season_map=season_ch_map,
        contradiction_count=len(contradictions),
        warnings=warnings,
    )
