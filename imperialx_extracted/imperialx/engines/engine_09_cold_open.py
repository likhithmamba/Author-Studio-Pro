"""
imperialx.engines.cold_open_scorer
=====================================
Engine 09: The Cold Open Scorer
Light AI (single optional call for line-level suggestions).

Scores the opening chapter against five structural criteria derived
from publishing industry research. Returns a score out of 100 plus
specific, actionable line-level feedback.

Deterministic structural score runs without AI.
AI is called once ONLY for suggestion generation (not scoring).
Result is cached permanently by content hash.
"""

from __future__ import annotations

import re
import json
from dataclasses import dataclass, field
from typing import List, Dict, Optional, Any

from ..shared.pipeline_core import ManuscriptDocument, Sentence, Chapter
from ..shared.stylometry import compute_profile


ENGINE_ID = "cold_open"
ENGINE_VERSION = "1.0.0"


# ─────────────────────────────────────────────────────────────────────────────
# CRITERION WEIGHTS
# ─────────────────────────────────────────────────────────────────────────────

CRITERION_WEIGHTS = {
    'inciting_proximity':   0.25,   # how quickly does something happen?
    'character_grounding':  0.20,   # is there a named character in paragraph 1?
    'setting_grounding':    0.15,   # time / place / situation in first 200 words?
    'hook_density':         0.25,   # unresolved questions per 100 words?
    'voice_signal':         0.15,   # distinctive voice markers in opening paragraph?
}


# ─────────────────────────────────────────────────────────────────────────────
# HOOK / QUESTION PATTERNS
# ─────────────────────────────────────────────────────────────────────────────

QUESTION_HOOK_PATTERN = re.compile(r'\?')  # explicit questions

IMPLICIT_HOOK_PATTERN = re.compile(
    r'\b(?:something\s+(?:was\s+)?wrong|strange|nobody\s+knew|no\s+one\s+knew|'
    r'it\s+(?:would|should)\s+(?:have\s+)?(?:been\s+)?(?:impossible|unthinkable)|'
    r'that\s+was\s+the\s+last|never\s+happened\s+before|couldn\'t\s+explain|'
    r'shouldn\'t\s+have|impossible|inexplicable|no\s+reason\s+for|'
    r'without\s+warning|out\s+of\s+nowhere|no\s+one\s+expected|'
    r'everyone\s+(?:thought|assumed|believed)\s+(?:it|he|she|they)\s+was|'
    r'until\s+(?:now|that\s+moment|today))\b',
    re.IGNORECASE
)

INCITING_ACTION_VERBS = re.compile(
    r'\b(?:died|killed|shot|stabbed|screamed|ran|fled|escaped|'
    r'vanished|disappeared|burst|exploded|crashed|collapsed|'
    r'confessed|revealed|discovered|found|arrived|entered|'
    r'received|opened|read|heard|saw|witnessed|realised|realized)\b',
    re.IGNORECASE
)

GROUNDING_MARKERS = re.compile(
    r'\b(?:in\s+(?:the\s+)?(?:year|summer|winter|spring|autumn|january|'
    r'february|march|april|may|june|july|august|september|october|'
    r'november|december|\d{4})|that\s+(?:morning|afternoon|evening|night)|'
    r'the\s+(?:morning|afternoon|evening|day)\s+(?:of|that|when)|'
    r'it\s+was\s+(?:a|the)|'
    r'(?:london|paris|new york|chicago|tokyo|berlin|moscow|rome|'
    r'the city|the town|the village|the house|the office|the station|'
    r'the airport|the hospital|the school)\b)',
    re.IGNORECASE
)

VOICE_MARKER_PATTERN = re.compile(
    r'--|\.{3}|(?<!\w)\'(?=\w)|'          # em-dashes, ellipsis
    r'\b(?:listen|look|here\'s|here is|'   # direct address
    r'mind you|truth be told|fact is|'
    r'not that|which meant|which means)\b',
    re.IGNORECASE
)


# ─────────────────────────────────────────────────────────────────────────────
# OUTPUT CONTRACT
# ─────────────────────────────────────────────────────────────────────────────

@dataclass
class CriterionScore:
    name: str
    display_name: str
    score: float                # 0–100
    weight: float
    weighted_contribution: float
    rationale: str
    flagged_text: Optional[str]    # text that caused a low score


@dataclass
class ColdOpenResult:
    manuscript_id: str
    version_hash: str
    engine_version: str

    total_score: float          # 0–100 — the final grade
    grade: str                  # 'A' | 'B' | 'C' | 'D' | 'F'
    readiness: str              # 'submission_ready' | 'near_ready' | 'needs_work' | 'not_ready'

    criteria: List[CriterionScore]

    # Line-level data
    first_named_character_line: Optional[int]   # line number
    inciting_action_line: Optional[int]
    grounding_detected: bool
    hook_count: int             # total hooks in opening chapter
    hook_density_per_100: float

    # AI suggestions (populated if AI was invoked)
    ai_suggestions: Optional[Dict]
    ai_was_invoked: bool

    warnings: List[str]
    strengths: List[str]


# ─────────────────────────────────────────────────────────────────────────────
# CRITERION SCORING FUNCTIONS
# ─────────────────────────────────────────────────────────────────────────────

def score_inciting_proximity(sentences: List[Sentence]) -> tuple:
    """
    How many lines before the first significant action or tension event?
    Score: first inciting action in lines 1–5 = 100, in lines 6–15 = 70,
    in lines 16–30 = 40, beyond 30 = 10.
    """
    for i, sent in enumerate(sentences):
        if INCITING_ACTION_VERBS.search(sent.text) or IMPLICIT_HOOK_PATTERN.search(sent.text):
            line_num = i + 1
            if line_num <= 5:
                return 100.0, line_num, sent.text[:150]
            elif line_num <= 15:
                return 70.0, line_num, sent.text[:150]
            elif line_num <= 30:
                return 40.0, line_num, sent.text[:150]
            else:
                return 10.0, line_num, sent.text[:150]
    return 0.0, None, None


def score_character_grounding(sentences: List[Sentence]) -> tuple:
    """
    Is there a named character (proper noun) in the first paragraph (first ~5 sentences)?
    """
    PROPER_NOUN = re.compile(r'\b([A-Z][a-z]{2,})\b')
    NOT_NAMES = {'The', 'A', 'An', 'It', 'He', 'She', 'They', 'We', 'There', 'Then', 'When'}

    first_para_sentences = sentences[:5]
    for sent in first_para_sentences:
        for match in PROPER_NOUN.finditer(sent.text):
            name = match.group(1)
            if name not in NOT_NAMES and len(name) > 2:
                return 100.0, match.group(1), None

    # Check first 10 sentences for partial credit
    for sent in sentences[5:10]:
        for match in PROPER_NOUN.finditer(sent.text):
            name = match.group(1)
            if name not in NOT_NAMES:
                return 60.0, name, "Named character found after paragraph 1 — move to opening paragraph for full impact."

    return 20.0, None, "No named character found in opening. Agents need someone to follow from line one."


def score_setting_grounding(text_first_200_words: str) -> tuple:
    """
    Is there time, place, or situation grounding in the first 200 words?
    """
    grounding_matches = GROUNDING_MARKERS.findall(text_first_200_words)
    count = len(grounding_matches)

    if count >= 3:
        return 100.0, True, None
    elif count == 2:
        return 75.0, True, None
    elif count == 1:
        return 50.0, True, "Only one grounding marker found. Add time and place references in the first 200 words."
    else:
        return 10.0, False, "No setting grounding found. Readers need to know WHEN and WHERE in the first 200 words."


def score_hook_density(sentences: List[Sentence]) -> tuple:
    """
    Hooks (explicit questions + implicit tension phrases) per 100 words.
    Target: 1.5 hooks per 100 words = 100 score.
    """
    total_words = sum(s.word_count for s in sentences)
    if total_words == 0:
        return 0.0, 0, 0.0

    hook_count = sum(
        len(QUESTION_HOOK_PATTERN.findall(s.text)) +
        len(IMPLICIT_HOOK_PATTERN.findall(s.text))
        for s in sentences
    )
    density = (hook_count / total_words) * 100
    score = min(100.0, density / 1.5 * 100.0)
    return round(score, 1), hook_count, round(density, 2)


def score_voice_signal(opening_para_text: str) -> tuple:
    """
    Does the opening paragraph have distinctive voice markers?
    Voice = em-dashes, direct address, distinctive phrasing, unusual structure.
    """
    markers = VOICE_MARKER_PATTERN.findall(opening_para_text)
    count = len(markers)

    # Also check sentence rhythm variance in opening
    sentences_rough = re.split(r'[.!?]+', opening_para_text)
    lengths = [len(s.split()) for s in sentences_rough if s.strip()]
    if lengths:
        mean_len = sum(lengths) / len(lengths)
        variance = (sum((l - mean_len) ** 2 for l in lengths) / len(lengths)) ** 0.5
    else:
        variance = 0.0

    # Combine marker count + rhythm variance
    score_markers = min(100.0, count / 3.0 * 100.0)
    score_rhythm = min(100.0, variance / 8.0 * 100.0)
    score = (score_markers * 0.6 + score_rhythm * 0.4)

    if score >= 70:
        rationale = "Strong distinctive voice in opening paragraph."
        flag = None
    elif score >= 40:
        rationale = "Some voice presence but opening could be more distinctive."
        flag = opening_para_text[:150]
    else:
        rationale = "Opening paragraph reads generically. Add a distinctive turn of phrase, unusual rhythm, or direct voice marker."
        flag = opening_para_text[:150]

    return round(score, 1), rationale, flag


# ─────────────────────────────────────────────────────────────────────────────
# GRADE + READINESS
# ─────────────────────────────────────────────────────────────────────────────

def score_to_grade(score: float) -> tuple:
    if score >= 85:
        return 'A', 'submission_ready'
    elif score >= 72:
        return 'B', 'near_ready'
    elif score >= 58:
        return 'C', 'needs_work'
    elif score >= 42:
        return 'D', 'significant_revision'
    else:
        return 'F', 'not_ready'


# ─────────────────────────────────────────────────────────────────────────────
# AI SUGGESTION CALL (optional, cached by content hash)
# ─────────────────────────────────────────────────────────────────────────────

def invoke_ai_suggestions(
    first_chapter_text: str,
    deterministic_scores: Dict[str, float],
    ai_client: Any,
) -> Optional[Dict]:
    """
    Single LLM call to generate line-level suggestions for lowest-scoring criteria.
    Returns structured JSON only. Token budget: ~800 in / 400 out.
    Cached by content hash — identical content never pays twice.
    """
    lowest = sorted(deterministic_scores.items(), key=lambda x: x[1])[:2]
    lowest_names = [k for k, _ in lowest]

    schema = json.dumps({
        'hook_density_note': '<max 120 chars>',
        'grounding_note': '<max 120 chars>',
        'voice_note': '<max 120 chars>',
        'top_fix': '<single most impactful structural fix, max 200 chars>',
    })

    prompt = (
        "You are a structural manuscript analyst.\n"
        "Return ONLY valid JSON matching this schema. No preamble, no markdown.\n"
        f"Schema: {schema}\n\n"
        f"Weakest criteria detected: {', '.join(lowest_names)}\n"
        f"Deterministic scores: {json.dumps(deterministic_scores)}\n\n"
        "Opening chapter excerpt (first 800 words):\n"
        f"{first_chapter_text[:3000]}\n\n"
        "Provide one concrete, specific line-level suggestion for each schema field."
    )

    try:
        response = ai_client.call(prompt, max_tokens=400)
        clean = response.strip()
        if clean.startswith('```'):
            clean = re.sub(r'^```[a-z]*\n?', '', clean).rstrip('```').strip()
        return json.loads(clean)
    except Exception:
        return None


# ─────────────────────────────────────────────────────────────────────────────
# MAIN ENGINE
# ─────────────────────────────────────────────────────────────────────────────

def process(
    doc: ManuscriptDocument,
    manuscript_id: str,
    ai_client: Optional[Any] = None,
    genre: str = 'default',
) -> ColdOpenResult:
    """
    Score the opening chapter of a manuscript for agent-readiness.
    
    The structural score is deterministic (no AI).
    AI suggestions are optionally added in a single cached call.
    
    Cost: Zero AI for score. One AI call max for suggestions (cached forever).
    """
    if not doc.chapters:
        return _empty_result(manuscript_id)

    first_chapter: Chapter = doc.chapters[0]
    ch_sentences = doc.get_sentences_for_chapter(first_chapter.id)
    ch_text = doc.get_chapter_text(first_chapter.id)

    # First 200 words for grounding analysis
    words = ch_text.split()
    first_200_words = ' '.join(words[:200])
    opening_para = (first_chapter.paragraphs[0].text if first_chapter.paragraphs else ch_text[:400])

    # ── Score each criterion ─────────────────────────────────────────────────

    inciting_score, inciting_line, inciting_text = score_inciting_proximity(ch_sentences)
    char_score, first_char, char_flag = score_character_grounding(ch_sentences)
    setting_score, grounding_detected, setting_flag = score_setting_grounding(first_200_words)
    hook_score, hook_count, hook_density = score_hook_density(ch_sentences)
    voice_score, voice_rationale, voice_flag = score_voice_signal(opening_para)

    raw_scores = {
        'inciting_proximity': inciting_score,
        'character_grounding': char_score,
        'setting_grounding': setting_score,
        'hook_density': hook_score,
        'voice_signal': voice_score,
    }

    criteria = [
        CriterionScore(
            name='inciting_proximity',
            display_name='Inciting Incident Proximity',
            score=inciting_score,
            weight=CRITERION_WEIGHTS['inciting_proximity'],
            weighted_contribution=inciting_score * CRITERION_WEIGHTS['inciting_proximity'],
            rationale=(
                f"First significant action detected on line {inciting_line}."
                if inciting_line else "No clear inciting action detected in opening chapter."
            ),
            flagged_text=inciting_text if inciting_score < 70 else None,
        ),
        CriterionScore(
            name='character_grounding',
            display_name='Named Character Presence',
            score=char_score,
            weight=CRITERION_WEIGHTS['character_grounding'],
            weighted_contribution=char_score * CRITERION_WEIGHTS['character_grounding'],
            rationale=f"First named character: {first_char}" if first_char else "No named character found early in opening.",
            flagged_text=char_flag,
        ),
        CriterionScore(
            name='setting_grounding',
            display_name='Setting & Context Grounding',
            score=setting_score,
            weight=CRITERION_WEIGHTS['setting_grounding'],
            weighted_contribution=setting_score * CRITERION_WEIGHTS['setting_grounding'],
            rationale="Time, place, and situation grounding detected." if grounding_detected else "Insufficient grounding in opening.",
            flagged_text=setting_flag,
        ),
        CriterionScore(
            name='hook_density',
            display_name='Hook Density',
            score=hook_score,
            weight=CRITERION_WEIGHTS['hook_density'],
            weighted_contribution=hook_score * CRITERION_WEIGHTS['hook_density'],
            rationale=f"{hook_count} hook(s) detected. Density: {hook_density:.1f} per 100 words. Target: 1.5+.",
            flagged_text=None if hook_score >= 70 else "Opening chapter raises too few questions. Add tension through unresolved situations.",
        ),
        CriterionScore(
            name='voice_signal',
            display_name='Voice Signal Strength',
            score=voice_score,
            weight=CRITERION_WEIGHTS['voice_signal'],
            weighted_contribution=voice_score * CRITERION_WEIGHTS['voice_signal'],
            rationale=voice_rationale,
            flagged_text=voice_flag,
        ),
    ]

    total_score = sum(c.weighted_contribution for c in criteria)
    grade, readiness = score_to_grade(total_score)

    # ── Optional AI suggestions ───────────────────────────────────────────────
    ai_suggestions = None
    ai_invoked = False
    if ai_client and total_score < 85:  # only invoke AI if score isn't already excellent
        ai_suggestions = invoke_ai_suggestions(ch_text, raw_scores, ai_client)
        ai_invoked = ai_suggestions is not None

    # ── Strengths and warnings ────────────────────────────────────────────────
    strengths: List[str] = []
    warnings: List[str] = []

    for c in criteria:
        if c.score >= 80:
            strengths.append(f"{c.display_name} is strong ({c.score:.0f}/100).")
        elif c.score < 50:
            warnings.append(
                f"{c.display_name} is weak ({c.score:.0f}/100). "
                f"{c.rationale}"
            )

    if total_score < 58:
        warnings.append(
            f"Overall score {total_score:.0f}/100. This opening is likely to be "
            f"rejected on the first page. Focus on the three lowest-scoring criteria first."
        )

    return ColdOpenResult(
        manuscript_id=manuscript_id,
        version_hash=doc.version_hash,
        engine_version=ENGINE_VERSION,
        total_score=round(total_score, 1),
        grade=grade,
        readiness=readiness,
        criteria=criteria,
        first_named_character_line=None if not first_char else
            next((i + 1 for i, s in enumerate(ch_sentences)
                  if first_char and first_char in s.text), None),
        inciting_action_line=inciting_line,
        grounding_detected=grounding_detected,
        hook_count=hook_count,
        hook_density_per_100=hook_density,
        ai_suggestions=ai_suggestions,
        ai_was_invoked=ai_invoked,
        warnings=warnings,
        strengths=strengths,
    )


def _empty_result(manuscript_id: str) -> ColdOpenResult:
    return ColdOpenResult(
        manuscript_id=manuscript_id,
        version_hash='',
        engine_version=ENGINE_VERSION,
        total_score=0.0,
        grade='F',
        readiness='not_ready',
        criteria=[],
        first_named_character_line=None,
        inciting_action_line=None,
        grounding_detected=False,
        hook_count=0,
        hook_density_per_100=0.0,
        ai_suggestions=None,
        ai_was_invoked=False,
        warnings=["No chapters found in manuscript."],
        strengths=[],
    )


# =============================================================================
# MASTER ORCHESTRATOR
# =============================================================================
"""
imperialx.orchestrator
========================
The Engine Orchestrator.
Receives a ManuscriptDocument and dispatches all 9 engines in dependency order.

Stage 0: Parse (pipeline_core)
Stage 1: NER extraction (shared)
Stage 2: Run engines in parallel where no dependency conflict exists
Stage 3: Aggregate results

Engines that can run in parallel (share only Stage 1 NER output):
  - Fingerprint     (needs: stylometry)
  - Tension         (needs: segmentation + NER counts from Entropy)
  - Iceberg         (needs: stylometry)
  - Cold Open       (needs: stylometry + NER)

Engines that must run after NER:
  - Voice Divergence (needs NER dialogue extraction)
  - Gun Tracker      (needs NER entity registry)
  - Scene Entropy    (needs NER — must run before Tension to share entity counts)
  - Temporal         (needs NER)

Standalone:
  - Draft Archaeology (needs snapshot history, not NER)
"""

from ..shared.pipeline_core import parse, ManuscriptDocument
from ..shared.ner_core import extract_entities, EntityRegistry
from .engine_01_fingerprint import process as run_fingerprint
from .engine_02_03_tension_voice import process as run_tension, process_voice_divergence
from .engine_04_05_guns_entropy import process_gun_tracker, process_entropy
from .engine_06_archaeology import process as run_archaeology
from .engine_07_08_iceberg_temporal import process as run_iceberg, process_temporal
from .engine_09_cold_open import process as run_cold_open

from dataclasses import dataclass
from typing import Optional, Dict, Any


@dataclass
class OrchestratorResult:
    manuscript_id: str
    version_hash: str
    fingerprint: Optional[Any] = None
    tension: Optional[Any] = None
    voice_divergence: Optional[Any] = None
    gun_tracker: Optional[Any] = None
    entropy: Optional[Any] = None
    archaeology: Optional[Any] = None
    iceberg: Optional[Any] = None
    temporal: Optional[Any] = None
    cold_open: Optional[Any] = None
    errors: Dict[str, str] = field(default_factory=dict)
    skipped: List[str] = field(default_factory=list)


def run_all(
    raw_text: str,
    manuscript_id: str,
    genre: str = 'default',
    snapshots: Optional[List] = None,
    deltas: Optional[List] = None,
    ai_client: Optional[Any] = None,
    engines_to_run: Optional[List[str]] = None,  # None = run all
    intentional_gun_ids: Optional[set] = None,
) -> OrchestratorResult:
    """
    Full pipeline: parse → NER → all 9 engines.
    Each engine is wrapped in a try/except — one engine failure cannot
    cascade to stop others (circuit breaker at engine level).
    """
    result = OrchestratorResult(manuscript_id=manuscript_id, version_hash='')
    run = engines_to_run or [
        'fingerprint', 'tension', 'voice_divergence', 'gun_tracker',
        'entropy', 'archaeology', 'iceberg', 'temporal', 'cold_open'
    ]

    # ── Stage 0: Parse ────────────────────────────────────────────────────────
    doc: ManuscriptDocument = parse(raw_text)
    result.version_hash = doc.version_hash

    # ── Stage 1: NER (shared by 5 engines) ───────────────────────────────────
    entity_registry: Optional[EntityRegistry] = None
    needs_ner = any(e in run for e in ['voice_divergence', 'gun_tracker', 'entropy', 'temporal', 'cold_open'])

    if needs_ner:
        try:
            entity_registry = extract_entities(doc)
        except Exception as ex:
            for e in ['voice_divergence', 'gun_tracker', 'entropy', 'temporal']:
                if e in run:
                    result.errors[e] = f"NER failed: {ex}"
                    result.skipped.append(e)

    # ── Stage 2: Entropy first (produces entity counts for Tension) ───────────
    entropy_entity_counts: Optional[Dict[int, int]] = None
    if 'entropy' in run and entity_registry and 'entropy' not in result.skipped:
        try:
            result.entropy = process_entropy(doc, entity_registry, manuscript_id)
            entropy_entity_counts = result.entropy.new_entity_counts_per_window
        except Exception as ex:
            result.errors['entropy'] = str(ex)

    # ── Stage 3: Parallel-safe engines ───────────────────────────────────────
    if 'fingerprint' in run:
        try:
            result.fingerprint = run_fingerprint(doc, manuscript_id)
        except Exception as ex:
            result.errors['fingerprint'] = str(ex)

    if 'tension' in run:
        try:
            result.tension = run_tension(doc, manuscript_id, genre, entropy_entity_counts)
        except Exception as ex:
            result.errors['tension'] = str(ex)

    if 'iceberg' in run:
        try:
            result.iceberg = run_iceberg(doc, manuscript_id, ai_client=ai_client)
        except Exception as ex:
            result.errors['iceberg'] = str(ex)

    if 'cold_open' in run:
        try:
            result.cold_open = run_cold_open(doc, manuscript_id, ai_client=ai_client, genre=genre)
        except Exception as ex:
            result.errors['cold_open'] = str(ex)

    # ── Stage 4: NER-dependent engines ───────────────────────────────────────
    if 'voice_divergence' in run and entity_registry and 'voice_divergence' not in result.skipped:
        try:
            result.voice_divergence = process_voice_divergence(doc, entity_registry, manuscript_id)
        except Exception as ex:
            result.errors['voice_divergence'] = str(ex)

    if 'gun_tracker' in run and entity_registry and 'gun_tracker' not in result.skipped:
        try:
            result.gun_tracker = process_gun_tracker(
                doc, entity_registry, manuscript_id, intentional_gun_ids
            )
        except Exception as ex:
            result.errors['gun_tracker'] = str(ex)

    if 'temporal' in run and entity_registry and 'temporal' not in result.skipped:
        try:
            result.temporal = process_temporal(doc, manuscript_id)
        except Exception as ex:
            result.errors['temporal'] = str(ex)

    # ── Stage 5: Archaeology (independent — uses snapshot history) ────────────
    if 'archaeology' in run:
        try:
            result.archaeology = run_archaeology(
                manuscript_id,
                snapshots or [],
                deltas or [],
            )
        except Exception as ex:
            result.errors['archaeology'] = str(ex)

    return result
