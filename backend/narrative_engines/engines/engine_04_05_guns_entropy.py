"""
imperialx.engines.gun_tracker
================================
Engine 04: Chekhov's Gun Tracker
No AI. NER + closure detection engine.

Detects all narrative elements introduced in early chapters that carry
implicit story obligations, then tracks whether each one resolves.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import List, Dict, Optional, Set, Tuple

from ..shared.pipeline_core import ManuscriptDocument, Sentence
from ..shared.ner_core import EntityRegistry, Entity


ENGINE_ID = "gun_tracker"
ENGINE_VERSION = "1.0.0"


# ─────────────────────────────────────────────────────────────────────────────
# FORESHADOWING PATTERN LIBRARY
# ─────────────────────────────────────────────────────────────────────────────

# Phrases that linguistically signal a future payoff is promised
FORESHADOWING_PATTERNS = [
    re.compile(p, re.IGNORECASE) for p in [
        r'\blittle did (?:he|she|they|[a-z]+) know\b',
        r'\bfor the last time\b',
        r'\bfor the first time\b',
        r'\bif only (?:he|she|they|[a-z]+) had\b',
        r'\bsomeday\b.*\bwould\b',
        r'\bnever again\b',
        r'\bhe|she would remember this\b',
        r'\bthat would prove\b',
        r'\bwould later\b',
        r'\bif (?:he|she|they) had known\b',
        r'\bthat was the moment\b',
        r'\bthe last thing\b',
        r'\bit would be years before\b',
        r'\bhe|she couldn\'t have known\b',
    ]
]

# Promise/commitment patterns — character makes a vow or commitment
PROMISE_PATTERNS = [
    re.compile(p, re.IGNORECASE) for p in [
        r'\bI (?:promise|swear|vow|will come back|will return|will find)\b',
        r'\bI (?:won\'t|will never) forget\b',
        r'\bwe will (?:meet|see each other) again\b',
        r'\bI owe you\b',
        r'\bI\'ll make this right\b',
        r'\byou have my word\b',
        r'\bI\'ll be back\b',
        r'\buntil (?:we meet|I return)\b',
        r'\bI\'ll (?:protect|save|find|stop|kill|destroy)\b',
    ]
]

# Threat patterns — antagonistic setup that promises future conflict
THREAT_PATTERNS = [
    re.compile(p, re.IGNORECASE) for p in [
        r'\byou\'ll (?:regret|pay for)\b',
        r'\bthis isn\'t over\b',
        r'\bI\'ll (?:get you|have my revenge|make you pay)\b',
        r'\bwe\'re not done\b',
        r'\byou haven\'t seen the last of\b',
        r'\bmark my words\b',
        r'\bwhen I\'m through with\b',
        r'\bI won\'t forget this\b',
    ]
]

# Objects with narrative weight — definite article + specific noun
NARRATIVE_OBJECT_PATTERNS = [
    re.compile(p, re.IGNORECASE) for p in [
        r'\bthe (?:old |ancient |mysterious |strange |rusted |locked |broken )?'
        r'(?:letter|pistol|gun|knife|key|box|chest|locket|ring|watch|photograph|'
        r'portrait|map|journal|diary|document|scroll|seal|medal|necklace|'
        r'bracelet|token|relic|amulet|pendant|dagger|sword|revolver|envelope|'
        r'package|parcel|note|message|telegram|will|deed|contract|blueprint)\b',
    ]
]

# Resolution indicators — signals a setup has paid off
RESOLUTION_INDICATORS = [
    re.compile(p, re.IGNORECASE) for p in [
        r'\bfinally\b',
        r'\bat last\b',
        r'\bjust as\b.*\bpromised\b',
        r'\bhe|she remembered\b',
        r'\bjust as\b.*\bwarned\b',
        r'\bkept (?:his|her|their) word\b',
        r'\bkept (?:the|his|her) promise\b',
        r'\bthe moment had come\b',
        r'\bpaid (?:in full|for it)\b',
        r'\bhe|she returned\b',
        r'\band so it was\b',
    ]
]


# ─────────────────────────────────────────────────────────────────────────────
# OUTPUT CONTRACT
# ─────────────────────────────────────────────────────────────────────────────

@dataclass
class Gun:
    """A detected narrative setup (the 'loaded gun')."""
    id: str                     # unique ID for UI reference
    gun_type: str               # 'OBJECT' | 'PROMISE' | 'THREAT' | 'FORESHADOWING' | 'CHARACTER'
    description: str            # what was introduced
    surface_text: str           # exact text fragment from manuscript
    chapter_id: int
    paragraph_id: int
    sentence_id: int
    context: str                # 120 chars of surrounding text
    status: str = 'unfired'     # 'fired' | 'unfired' | 'intentional'
    resolved_in_chapter: Optional[int] = None
    resolved_text: Optional[str] = None
    confidence: float = 0.8     # how confident the detection is (0–1)


@dataclass
class GunTrackerResult:
    manuscript_id: str
    version_hash: str
    engine_version: str

    all_guns: List[Gun]
    fired_guns: List[Gun]
    unfired_guns: List[Gun]
    intentional_open_threads: List[Gun]     # writer-marked as intentional

    closure_rate: float         # fired / (fired + unfired), 0–100
    per_chapter_loaded: Dict[int, List[str]]    # chapter_id → list of gun IDs loaded

    warnings: List[str]
    total_detected: int


# ─────────────────────────────────────────────────────────────────────────────
# GUN DETECTION
# ─────────────────────────────────────────────────────────────────────────────

def detect_foreshadowing_guns(sentences: List[Sentence]) -> List[Gun]:
    guns = []
    for sent in sentences:
        for pattern in FORESHADOWING_PATTERNS:
            match = pattern.search(sent.text)
            if match:
                guns.append(Gun(
                    id=f"foreshadow_{sent.id}_{match.start()}",
                    gun_type='FORESHADOWING',
                    description=f"Foreshadowing phrase: '{match.group()}'",
                    surface_text=match.group(),
                    chapter_id=sent.chapter_id,
                    paragraph_id=sent.paragraph_id,
                    sentence_id=sent.id,
                    context=sent.text[:200],
                    confidence=0.85,
                ))
                break  # one gun per sentence maximum

    return guns


def detect_promise_guns(sentences: List[Sentence]) -> List[Gun]:
    guns = []
    for sent in sentences:
        if not sent.is_dialogue:
            continue
        for pattern in PROMISE_PATTERNS:
            match = pattern.search(sent.text)
            if match:
                guns.append(Gun(
                    id=f"promise_{sent.id}_{match.start()}",
                    gun_type='PROMISE',
                    description=f"Character commitment: '{match.group()}'",
                    surface_text=match.group(),
                    chapter_id=sent.chapter_id,
                    paragraph_id=sent.paragraph_id,
                    sentence_id=sent.id,
                    context=sent.text[:200],
                    confidence=0.90,
                ))
                break
    return guns


def detect_threat_guns(sentences: List[Sentence]) -> List[Gun]:
    guns = []
    for sent in sentences:
        if not sent.is_dialogue:
            continue
        for pattern in THREAT_PATTERNS:
            match = pattern.search(sent.text)
            if match:
                guns.append(Gun(
                    id=f"threat_{sent.id}_{match.start()}",
                    gun_type='THREAT',
                    description=f"Antagonistic threat: '{match.group()}'",
                    surface_text=match.group(),
                    chapter_id=sent.chapter_id,
                    paragraph_id=sent.paragraph_id,
                    sentence_id=sent.id,
                    context=sent.text[:200],
                    confidence=0.88,
                ))
                break
    return guns


def detect_object_guns(sentences: List[Sentence]) -> List[Gun]:
    guns = []
    seen_objects: Set[str] = set()
    for sent in sentences:
        for pattern in NARRATIVE_OBJECT_PATTERNS:
            match = pattern.search(sent.text)
            if match:
                obj_name = match.group().lower().strip()
                if obj_name in seen_objects:
                    continue
                seen_objects.add(obj_name)
                guns.append(Gun(
                    id=f"object_{sent.id}_{len(guns)}",
                    gun_type='OBJECT',
                    description=f"Introduced narrative object: '{obj_name}'",
                    surface_text=match.group(),
                    chapter_id=sent.chapter_id,
                    paragraph_id=sent.paragraph_id,
                    sentence_id=sent.id,
                    context=sent.text[:200],
                    confidence=0.75,  # lower confidence — objects can be incidental
                ))
    return guns


# ─────────────────────────────────────────────────────────────────────────────
# CLOSURE DETECTION
# ─────────────────────────────────────────────────────────────────────────────

def check_closure(gun: Gun, later_sentences: List[Sentence]) -> Tuple[bool, Optional[int], Optional[str]]:
    """
    Determine whether a gun has been resolved in later chapters.
    Uses semantic echo detection: looks for the surface form or related words
    appearing in later text alongside resolution indicators.
    
    Returns: (is_resolved, resolved_chapter_id, resolved_text)
    """
    gun_keywords = set(re.findall(r'\b[a-z]{4,}\b', gun.surface_text.lower()))
    gun_keywords.discard('that')
    gun_keywords.discard('this')
    gun_keywords.discard('with')

    # Sentences must be from later chapters
    later = [s for s in later_sentences if s.chapter_id > gun.chapter_id]

    for sent in later:
        sent_lower = sent.text.lower()

        # Check for any resolution indicator in this sentence
        has_resolution_indicator = any(
            pattern.search(sent.text) for pattern in RESOLUTION_INDICATORS
        )

        # Check for semantic echo of the gun's keywords
        sent_words = set(re.findall(r'\b[a-z]{4,}\b', sent_lower))
        keyword_overlap = len(gun_keywords & sent_words)

        if keyword_overlap >= 2 or (keyword_overlap >= 1 and has_resolution_indicator):
            return True, sent.chapter_id, sent.text[:200]

    return False, None, None


# ─────────────────────────────────────────────────────────────────────────────
# MAIN ENGINE
# ─────────────────────────────────────────────────────────────────────────────

def process_gun_tracker(
    doc: ManuscriptDocument,
    entity_registry: EntityRegistry,
    manuscript_id: str,
    intentional_ids: Optional[Set[str]] = None,  # writer-marked as intentional
) -> GunTrackerResult:
    """
    Detect all Chekhov's Guns and check closure for each.
    
    intentional_ids: set of gun IDs the writer has flagged as intentional open threads.
    These are excluded from unfired count but preserved in the result.
    """
    intentional_ids = intentional_ids or set()

    # ── Detection pass ────────────────────────────────────────────────────────
    all_guns: List[Gun] = []

    # Detect from dialogue + prose
    all_guns.extend(detect_foreshadowing_guns(doc.sentences))
    all_guns.extend(detect_promise_guns(doc.sentences))
    all_guns.extend(detect_threat_guns(doc.sentences))
    all_guns.extend(detect_object_guns(doc.sentences))

    # Add character-based guns: characters introduced but never given a resolution
    # (this uses NER registry — introduced characters who vanish)
    for char_name, entities in entity_registry.persons.items():
        if not entities:
            continue
        first_ch = min(e.chapter_id for e in entities)
        last_ch = max(e.chapter_id for e in entities)
        total_chapters = len(doc.chapters)
        # Character appears early but disappears before final 20% of manuscript
        if first_ch <= total_chapters // 4 and last_ch <= 3 * total_chapters // 4:
            first_entity = min(entities, key=lambda e: e.chapter_id)
            all_guns.append(Gun(
                id=f"char_{char_name.replace(' ', '_')}",
                gun_type='CHARACTER',
                description=f"Character '{char_name}' introduced early but absent from final chapters",
                surface_text=char_name,
                chapter_id=first_entity.chapter_id,
                paragraph_id=first_entity.paragraph_id,
                sentence_id=first_entity.sentence_id,
                context=first_entity.context,
                confidence=0.65,  # lowest confidence — many characters legitimately disappear
            ))

    # ── Closure pass ─────────────────────────────────────────────────────────
    # Only check closure for guns in first 75% of manuscript
    # (guns planted in final 25% are probably intentionally unresolved — series setup)
    total_chapters = len(doc.chapters)
    early_chapters_threshold = int(total_chapters * 0.75)

    fired: List[Gun] = []
    unfired: List[Gun] = []
    intentional: List[Gun] = []

    for gun in all_guns:
        if gun.id in intentional_ids:
            gun.status = 'intentional'
            intentional.append(gun)
            continue

        if gun.chapter_id > early_chapters_threshold:
            # Late-planted — skip closure check
            gun.status = 'intentional'
            intentional.append(gun)
            continue

        is_resolved, resolved_ch, resolved_text = check_closure(gun, doc.sentences)
        if is_resolved:
            gun.status = 'fired'
            gun.resolved_in_chapter = resolved_ch
            gun.resolved_text = resolved_text
            fired.append(gun)
        else:
            gun.status = 'unfired'
            unfired.append(gun)

    closure_rate = (len(fired) / (len(fired) + len(unfired)) * 100) if (fired or unfired) else 100.0

    # ── Per-chapter loaded map ────────────────────────────────────────────────
    per_chapter_loaded: Dict[int, List[str]] = {}
    for gun in all_guns:
        per_chapter_loaded.setdefault(gun.chapter_id, []).append(gun.id)

    # ── Warnings ─────────────────────────────────────────────────────────────
    warnings: List[str] = []
    if unfired:
        warnings.append(
            f"{len(unfired)} unfired gun(s) detected. "
            f"These setups were introduced but never resolved."
        )
        for gun in unfired[:5]:  # show top 5 in warning
            warnings.append(
                f"  Unfired [{gun.gun_type}] in Chapter {gun.chapter_id + 1}: "
                f"'{gun.description}'"
            )
    if closure_rate < 60:
        warnings.append(
            f"Closure rate is {closure_rate:.0f}% — below the recommended 75% threshold. "
            f"Many planted setups do not pay off by the manuscript's end."
        )

    return GunTrackerResult(
        manuscript_id=manuscript_id,
        version_hash=doc.version_hash,
        engine_version=ENGINE_VERSION,
        all_guns=all_guns,
        fired_guns=fired,
        unfired_guns=unfired,
        intentional_open_threads=intentional,
        closure_rate=round(closure_rate, 1),
        per_chapter_loaded=per_chapter_loaded,
        warnings=warnings,
        total_detected=len(all_guns),
    )


# =============================================================================
# ENGINE 05 — SCENE ENTROPY SCANNER
# =============================================================================
"""
imperialx.engines.entropy_scanner
=====================================
Engine 05: Scene Entropy Scanner
No AI. Information density scoring per scene/chapter.

Low entropy = inert scene = candidate for cutting or merging.
"""

ENGINE_ID_ENT = "scene_entropy"
ENGINE_VERSION_ENT = "1.0.0"

ACTION_VERB_PATTERN = re.compile(
    r'\b(?:ran|walked|struck|fell|grabbed|pushed|pulled|threw|caught|'
    r'shot|stabbed|killed|broke|smashed|opened|closed|entered|fled|'
    r'escaped|discovered|revealed|confessed|attacked|defended|saved|'
    r'died|screamed|whispered|collapsed|stood|sat|rose|reached|'
    r'seized|released|crossed|arrived|departed|turned|looked|stared)\b',
    re.IGNORECASE
)

EMOTIONAL_POSITIVE = re.compile(
    r'\b(?:happy|joy|love|hope|relief|excited|glad|pleased|delighted|'
    r'satisfied|proud|cheerful|elated|content|grateful|peaceful)\b',
    re.IGNORECASE
)

EMOTIONAL_NEGATIVE = re.compile(
    r'\b(?:sad|fear|anger|hate|despair|grief|anxious|terrified|'
    r'horrified|furious|devastated|heartbroken|miserable|ashamed|'
    r'guilty|disgusted|envious|bitter|hopeless|lonely)\b',
    re.IGNORECASE
)

SETTING_CHANGE_MARKERS = re.compile(
    r'\b(?:meanwhile|elsewhere|later|the next day|that evening|at dawn|'
    r'across town|in another|back at|returning to|moving to|'
    r'miles away|hours later|the following|that morning|that night|'
    r'by the time|when they arrived|as they entered)\b',
    re.IGNORECASE
)

RELATIONSHIP_CHANGE_MARKERS = re.compile(
    r'\b(?:forgave|betrayed|trusted|loved|hated|rejected|accepted|'
    r'abandoned|reunited|reconciled|confessed|admitted|revealed|'
    r'proposed|divorced|married|ended|broke up|fell in love|'
    r'turned against|stood by|defended|blamed)\b',
    re.IGNORECASE
)


# ─────────────────────────────────────────────────────────────────────────────
# OUTPUT CONTRACT
# ─────────────────────────────────────────────────────────────────────────────

@dataclass
class SceneEntropyScore:
    chapter_id: int
    chapter_title: Optional[str]
    entropy_score: float            # 0–100
    zone: str                       # 'essential' | 'functional' | 'weak' | 'inert'
    component_scores: Dict[str, float]
    word_count: int
    suggestion: str                 # action recommendation
    new_entity_count: int
    setting_changes: int
    emotional_deltas: int
    action_density: float


@dataclass
class EntropyResult:
    manuscript_id: str
    version_hash: str
    engine_version: str

    chapters: List[SceneEntropyScore]
    overall_entropy: float
    inert_chapters: List[int]       # chapter IDs with entropy < 20
    weak_chapters: List[int]        # chapter IDs with entropy 20–35
    dead_weight_percentage: float   # % of manuscript that is inert/weak

    new_entity_counts_per_window: Dict[int, int]    # shared with Tension Waveform

    warnings: List[str]


# ─────────────────────────────────────────────────────────────────────────────
# COMPONENT SCORERS
# ─────────────────────────────────────────────────────────────────────────────

def score_new_entities(new_entity_count: int, word_count: int) -> float:
    """New entities per 1000 words, normalised. 5 per 1000 = 100."""
    if word_count == 0:
        return 0.0
    density = (new_entity_count / word_count) * 1000
    return min(100.0, density / 5.0 * 100.0)


def score_relationship_changes(chapter_text: str, word_count: int) -> float:
    """Relationship-change verb density. 3 per 1000 words = 100."""
    if word_count == 0:
        return 0.0
    count = len(RELATIONSHIP_CHANGE_MARKERS.findall(chapter_text))
    density = (count / word_count) * 1000
    return min(100.0, density / 3.0 * 100.0)


def score_setting_changes(chapter_text: str) -> float:
    """Setting change markers. 2+ markers = high score."""
    count = len(SETTING_CHANGE_MARKERS.findall(chapter_text))
    return min(100.0, count / 2.0 * 100.0)


def score_emotional_delta(chapter_text: str, sentences: List[Sentence]) -> float:
    """
    Emotional state change within the chapter.
    Measures shift from opening emotional tone to closing emotional tone.
    """
    if len(sentences) < 2:
        return 0.0

    opening_text = ' '.join(s.text for s in sentences[:max(1, len(sentences) // 5)])
    closing_text = ' '.join(s.text for s in sentences[-(max(1, len(sentences) // 5)):])

    open_pos = len(EMOTIONAL_POSITIVE.findall(opening_text))
    open_neg = len(EMOTIONAL_NEGATIVE.findall(opening_text))
    close_pos = len(EMOTIONAL_POSITIVE.findall(closing_text))
    close_neg = len(EMOTIONAL_NEGATIVE.findall(closing_text))

    open_tone = open_pos - open_neg
    close_tone = close_pos - close_neg
    delta = abs(close_tone - open_tone)

    return min(100.0, delta / 3.0 * 100.0)


def score_action_density(chapter_text: str, word_count: int) -> float:
    """Action verb density. 10 per 1000 words = 100."""
    if word_count == 0:
        return 0.0
    count = len(ACTION_VERB_PATTERN.findall(chapter_text))
    density = (count / word_count) * 1000
    return min(100.0, density / 10.0 * 100.0)


def classify_entropy_zone(score: float) -> Tuple[str, str]:
    """Returns (zone_label, suggestion)."""
    if score >= 65:
        return 'essential', 'This scene is working hard — high information density.'
    elif score >= 45:
        return 'functional', 'Solid scene. Could benefit from one additional revelation or shift.'
    elif score >= 25:
        return 'weak', 'This scene contributes but not enough. Add a relationship change, revelation, or decision.'
    else:
        return 'inert', 'CONSIDER CUTTING. This scene introduces nothing new. Merge with adjacent scene or add a significant plot element.'


# ─────────────────────────────────────────────────────────────────────────────
# MAIN ENGINE
# ─────────────────────────────────────────────────────────────────────────────

def process_entropy(
    doc: ManuscriptDocument,
    entity_registry: EntityRegistry,
    manuscript_id: str,
) -> EntropyResult:
    """
    Compute Scene Entropy for every chapter in the manuscript.
    
    Also returns new_entity_counts_per_window for the Tension Waveform engine
    so they can share NER results without re-running extraction.
    """
    ENTROPY_WEIGHTS = {
        'new_entities': 0.30,
        'relationship_changes': 0.25,
        'setting_changes': 0.15,
        'emotional_delta': 0.20,
        'action_density': 0.10,
    }

    chapter_scores: List[SceneEntropyScore] = []

    # Build window-level new entity counts for sharing with Tension engine
    window_new_entity_counts: Dict[int, int] = {}

    for chapter in doc.chapters:
        ch_sentences = doc.get_sentences_for_chapter(chapter.id)
        ch_text = doc.get_chapter_text(chapter.id)
        ch_word_count = chapter.word_count

        # New entities introduced for the first time in this chapter
        new_entities = entity_registry.get_new_entities_in_chapter(chapter.id)
        new_entity_count = len(new_entities)

        # Map entity velocity to windows for sharing with Tension engine
        for win in doc.get_windows_for_chapter(chapter.id):
            # Approximate: distribute new entities proportionally across windows
            wins_in_ch = len(doc.get_windows_for_chapter(chapter.id))
            window_new_entity_counts[win.id] = new_entity_count // max(wins_in_ch, 1)

        s1 = score_new_entities(new_entity_count, ch_word_count)
        s2 = score_relationship_changes(ch_text, ch_word_count)
        s3 = score_setting_changes(ch_text)
        s4 = score_emotional_delta(ch_text, ch_sentences)
        s5 = score_action_density(ch_text, ch_word_count)

        entropy = (
            s1 * ENTROPY_WEIGHTS['new_entities'] +
            s2 * ENTROPY_WEIGHTS['relationship_changes'] +
            s3 * ENTROPY_WEIGHTS['setting_changes'] +
            s4 * ENTROPY_WEIGHTS['emotional_delta'] +
            s5 * ENTROPY_WEIGHTS['action_density']
        )

        zone, suggestion = classify_entropy_zone(entropy)

        chapter_scores.append(SceneEntropyScore(
            chapter_id=chapter.id,
            chapter_title=chapter.title,
            entropy_score=round(entropy, 2),
            zone=zone,
            component_scores={
                'new_entities': s1,
                'relationship_changes': s2,
                'setting_changes': s3,
                'emotional_delta': s4,
                'action_density': s5,
            },
            word_count=ch_word_count,
            suggestion=suggestion,
            new_entity_count=new_entity_count,
            setting_changes=len(SETTING_CHANGE_MARKERS.findall(ch_text)),
            emotional_deltas=len(EMOTIONAL_POSITIVE.findall(ch_text)) + len(EMOTIONAL_NEGATIVE.findall(ch_text)),
            action_density=round(s5, 2),
        ))

    inert = [s.chapter_id for s in chapter_scores if s.entropy_score < 20]
    weak = [s.chapter_id for s in chapter_scores if 20 <= s.entropy_score < 35]
    dead_pct = len(inert + weak) / len(chapter_scores) * 100 if chapter_scores else 0.0
    overall = sum(s.entropy_score for s in chapter_scores) / len(chapter_scores) if chapter_scores else 0.0

    warnings: List[str] = []
    if inert:
        warnings.append(f"{len(inert)} inert chapter(s) detected: {[c+1 for c in inert]}. Consider cutting or merging these.")
    if dead_pct > 30:
        warnings.append(f"{dead_pct:.0f}% of your manuscript has low information density. Reader engagement risk is high.")

    return EntropyResult(
        manuscript_id=manuscript_id,
        version_hash=doc.version_hash,
        engine_version=ENGINE_VERSION_ENT,
        chapters=chapter_scores,
        overall_entropy=round(overall, 2),
        inert_chapters=inert,
        weak_chapters=weak,
        dead_weight_percentage=round(dead_pct, 1),
        new_entity_counts_per_window=window_new_entity_counts,
        warnings=warnings,
    )
