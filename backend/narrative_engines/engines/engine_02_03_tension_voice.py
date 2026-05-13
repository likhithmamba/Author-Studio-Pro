"""
imperialx.engines.tension_waveform
====================================
Engine 02: Narrative Tension Waveform
No AI. Algorithmic scoring on 5 structural signals.

Input:  ManuscriptDocument
Output: TensionResult — per-window and per-chapter tension scores + waveform data
"""

from __future__ import annotations

import re
import math
from dataclasses import dataclass, field
from typing import List, Dict, Optional, Tuple

from ..shared.pipeline_core import ManuscriptDocument, Sentence, Window


ENGINE_ID = "tension_waveform"
ENGINE_VERSION = "1.0.0"


# ─────────────────────────────────────────────────────────────────────────────
# SCORING WEIGHTS (stored as config — tunable without code changes)
# ─────────────────────────────────────────────────────────────────────────────

DEFAULT_WEIGHTS = {
    'sentence_compression': 0.30,   # short sentences = higher tension
    'adverb_inverse':       0.20,   # low adverbs = higher tension (telling = tension killer)
    'dialogue_interruption': 0.20,  # fragmented dialogue = higher tension
    'punctuation_density':  0.15,   # em-dashes, ellipsis, ! = higher tension
    'entity_velocity':      0.15,   # new entities = plot moving = tension
}

# Genre calibration offsets (applied as multipliers on sentence_compression)
GENRE_CALIBRATION = {
    'thriller':    {'sentence_compression': 1.2, 'dialogue_interruption': 1.1},
    'literary':    {'sentence_compression': 0.7, 'adverb_inverse': 0.8},
    'romance':     {'dialogue_interruption': 1.2, 'punctuation_density': 1.1},
    'fantasy':     {'entity_velocity': 1.2},
    'mystery':     {'sentence_compression': 1.1, 'entity_velocity': 1.1},
    'horror':      {'sentence_compression': 1.3, 'punctuation_density': 1.2},
    'default':     {k: 1.0 for k in DEFAULT_WEIGHTS},
}

ADVERB_PATTERN = re.compile(
    r'\b\w+ly\b', re.IGNORECASE
)

DIALOGUE_INTERRUPTION_PATTERN = re.compile(
    r'[""]\s*[,.]?\s*'
    r'(?:said|asked|replied|whispered|shouted|muttered|cried|answered)\b',
    re.IGNORECASE
)

HIGH_ENERGY_PUNCT = re.compile(r'(?:--|\.\.\.|\!|\?)')


# ─────────────────────────────────────────────────────────────────────────────
# OUTPUT CONTRACT
# ─────────────────────────────────────────────────────────────────────────────

@dataclass
class WindowTension:
    window_id: int
    chapter_id: int
    word_start: int
    word_end: int
    tension_score: float            # 0–100
    component_scores: Dict[str, float]
    zone: str                       # 'peak' | 'rising' | 'stable' | 'flatline'
    text_preview: str               # first 120 chars of window for UI jump


@dataclass
class ChapterTension:
    chapter_id: int
    chapter_title: Optional[str]
    avg_tension: float
    max_tension: float
    min_tension: float
    flatline_percentage: float      # % of windows in this chapter scoring < 25
    tension_arc: List[float]        # ordered window scores for sparkline


@dataclass
class TensionResult:
    manuscript_id: str
    version_hash: str
    engine_version: str

    windows: List[WindowTension]
    chapters: List[ChapterTension]

    # Manuscript-level arc
    overall_arc: List[float]        # one value per chapter, 0–100
    intended_arc_compliance: Optional[float]    # if writer provides intended arc

    # Notable moments
    peak_tension_window_id: int
    lowest_tension_window_id: int
    dead_zones: List[Tuple[int, int]]   # (chapter_id, window_id) of flatline windows

    # Structural flags
    climax_detected: bool           # peak tension in final 25% of manuscript?
    three_act_quality: str          # 'strong' | 'moderate' | 'weak'
    warnings: List[str]


# ─────────────────────────────────────────────────────────────────────────────
# SIGNAL COMPUTATIONS
# ─────────────────────────────────────────────────────────────────────────────

def score_sentence_compression(sentences: List[Sentence]) -> float:
    """
    Short sentences → high tension. Long sentences → lower tension.
    Score = inverse of normalised mean sentence length.
    Calibrated: mean < 8 words = max tension, mean > 25 = near zero.
    """
    if not sentences:
        return 50.0
    mean_len = sum(s.word_count for s in sentences) / len(sentences)
    # Map 5–30 word range to 100–0 score
    score = max(0.0, min(100.0, (30.0 - mean_len) / 25.0 * 100.0))
    return round(score, 2)


def score_adverb_inverse(window_text: str, word_count: int) -> float:
    """
    Low adverb density = strong prose = higher tension score.
    High adverb density signals weak "telling" prose — tension collapses.
    Score = 100 - (adverb_density_per_100 * 10), clamped to 0–100.
    """
    if word_count == 0:
        return 50.0
    adverb_count = len(ADVERB_PATTERN.findall(window_text))
    adverb_density = (adverb_count / word_count) * 100  # per 100 words
    score = max(0.0, min(100.0, 100.0 - adverb_density * 10.0))
    return round(score, 2)


def score_dialogue_interruption(window_text: str, sentence_count: int) -> float:
    """
    Fragmented back-and-forth dialogue raises tension.
    Score = interruption_count / sentence_count, normalised to 0–100.
    """
    if sentence_count == 0:
        return 0.0
    count = len(DIALOGUE_INTERRUPTION_PATTERN.findall(window_text))
    rate = count / sentence_count
    score = min(100.0, rate * 200.0)  # 0.5 interruptions/sentence = 100
    return round(score, 2)


def score_punctuation_density(window_text: str, word_count: int) -> float:
    """
    Em-dashes, ellipses, exclamations signal narrative energy.
    Score normalised against a reference density of 15 per 1000 words = 100.
    """
    if word_count == 0:
        return 0.0
    count = len(HIGH_ENERGY_PUNCT.findall(window_text))
    density = (count / word_count) * 1000
    score = min(100.0, density / 15.0 * 100.0)
    return round(score, 2)


def score_entity_velocity(new_entity_count: int, window_word_count: int) -> float:
    """
    New named entities introduced per window = plot is moving.
    Reference: 3 new entities per 500 words = high velocity.
    """
    if window_word_count == 0:
        return 0.0
    velocity = (new_entity_count / window_word_count) * 500
    score = min(100.0, velocity / 3.0 * 100.0)
    return round(score, 2)


def classify_zone(score: float) -> str:
    if score >= 75:
        return 'peak'
    elif score >= 55:
        return 'rising'
    elif score >= 35:
        return 'stable'
    else:
        return 'flatline'


def detect_three_act_quality(chapter_tensions: List[ChapterTension]) -> Tuple[bool, str]:
    """
    Evaluate three-act structure from tension arc.
    Three-act = rising tension in Act 1, dip in Act 2 midpoint, 
    peak in Act 3, resolution drop.
    """
    if len(chapter_tensions) < 3:
        return False, 'insufficient_chapters'

    n = len(chapter_tensions)
    act1 = chapter_tensions[:n // 3]
    act2 = chapter_tensions[n // 3: 2 * n // 3]
    act3 = chapter_tensions[2 * n // 3:]

    act1_avg = sum(c.avg_tension for c in act1) / len(act1) if act1 else 0
    act2_avg = sum(c.avg_tension for c in act2) / len(act2) if act2 else 0
    act3_avg = sum(c.avg_tension for c in act3) / len(act3) if act3 else 0

    climax_in_last_quarter = any(
        c.avg_tension >= 70
        for c in chapter_tensions[3 * n // 4:]
    )

    if climax_in_last_quarter and act3_avg > act1_avg:
        quality = 'strong'
    elif act3_avg > act1_avg:
        quality = 'moderate'
    else:
        quality = 'weak'

    return climax_in_last_quarter, quality


# ─────────────────────────────────────────────────────────────────────────────
# MAIN ENGINE
# ─────────────────────────────────────────────────────────────────────────────

def process(
    doc: ManuscriptDocument,
    manuscript_id: str,
    genre: str = 'default',
    entity_new_counts: Optional[Dict[int, int]] = None,  # window_id → new entity count
) -> TensionResult:
    """
    Compute Narrative Tension Waveform for a ManuscriptDocument.
    
    entity_new_counts is optionally provided by the Scene Entropy engine
    when both run together — avoids duplicate NER.
    """
    weights = dict(DEFAULT_WEIGHTS)
    calibration = GENRE_CALIBRATION.get(genre, GENRE_CALIBRATION['default'])
    for k in weights:
        weights[k] *= calibration.get(k, 1.0)

    # Normalise weights to sum to 1.0
    weight_sum = sum(weights.values())
    weights = {k: v / weight_sum for k, v in weights.items()}

    window_tensions: List[WindowTension] = []

    for win in doc.windows:
        # Collect sentences in this window
        win_sentence_ids = set(win.sentence_ids)
        win_sentences = [s for s in doc.sentences if s.id in win_sentence_ids]

        # New entity count for this window (default 0 if not provided)
        new_entities = entity_new_counts.get(win.id, 0) if entity_new_counts else 0

        s1 = score_sentence_compression(win_sentences)
        s2 = score_adverb_inverse(win.text, win.word_count)
        s3 = score_dialogue_interruption(win.text, len(win_sentences))
        s4 = score_punctuation_density(win.text, win.word_count)
        s5 = score_entity_velocity(new_entities, win.word_count)

        tension = (
            s1 * weights['sentence_compression'] +
            s2 * weights['adverb_inverse'] +
            s3 * weights['dialogue_interruption'] +
            s4 * weights['punctuation_density'] +
            s5 * weights['entity_velocity']
        )

        window_tensions.append(WindowTension(
            window_id=win.id,
            chapter_id=win.chapter_id,
            word_start=win.word_start,
            word_end=win.word_end,
            tension_score=round(tension, 2),
            component_scores={
                'sentence_compression': s1,
                'adverb_inverse': s2,
                'dialogue_interruption': s3,
                'punctuation_density': s4,
                'entity_velocity': s5,
            },
            zone=classify_zone(tension),
            text_preview=win.text[:120],
        ))

    # ── Chapter-level aggregation ────────────────────────────────────────────
    chapter_tensions: List[ChapterTension] = []
    for chapter in doc.chapters:
        ch_windows = [w for w in window_tensions if w.chapter_id == chapter.id]
        if not ch_windows:
            continue
        scores = [w.tension_score for w in ch_windows]
        flatline_count = sum(1 for s in scores if s < 25)

        chapter_tensions.append(ChapterTension(
            chapter_id=chapter.id,
            chapter_title=chapter.title,
            avg_tension=round(sum(scores) / len(scores), 2),
            max_tension=round(max(scores), 2),
            min_tension=round(min(scores), 2),
            flatline_percentage=round(flatline_count / len(scores) * 100, 1),
            tension_arc=scores,
        ))

    # ── Manuscript-level metrics ─────────────────────────────────────────────
    overall_arc = [ct.avg_tension for ct in chapter_tensions]

    peak_win = max(window_tensions, key=lambda w: w.tension_score, default=None)
    low_win  = min(window_tensions, key=lambda w: w.tension_score, default=None)

    dead_zones = [
        (w.chapter_id, w.window_id)
        for w in window_tensions
        if w.zone == 'flatline'
    ]

    climax_detected, three_act_quality = detect_three_act_quality(chapter_tensions)

    # ── Warnings ─────────────────────────────────────────────────────────────
    warnings: List[str] = []
    if dead_zones:
        dead_chapters = sorted(set(ch for ch, _ in dead_zones))
        warnings.append(
            f"{len(dead_zones)} flatline window(s) detected across "
            f"chapter(s) {dead_chapters}. These passages have near-zero tension signals."
        )
    if not climax_detected:
        warnings.append(
            "No clear climax detected in the final 25% of your manuscript. "
            "The tension peak occurs too early in the story arc."
        )
    if three_act_quality == 'weak':
        warnings.append(
            "Three-act structure quality is weak — the final act does not build "
            "measurably higher tension than the opening. Check your pacing arc."
        )

    return TensionResult(
        manuscript_id=manuscript_id,
        version_hash=doc.version_hash,
        engine_version=ENGINE_VERSION,
        windows=window_tensions,
        chapters=chapter_tensions,
        overall_arc=overall_arc,
        intended_arc_compliance=None,
        peak_tension_window_id=peak_win.window_id if peak_win else -1,
        lowest_tension_window_id=low_win.window_id if low_win else -1,
        dead_zones=dead_zones,
        climax_detected=climax_detected,
        three_act_quality=three_act_quality,
        warnings=warnings,
    )


# =============================================================================
# ENGINE 03 — CHARACTER VOICE DIVERGENCE METER
# =============================================================================
"""
imperialx.engines.voice_divergence
=====================================
Engine 03: Character Voice Divergence Meter
No AI. Reuses stylometry engine from Fingerprint Builder.

Input:  ManuscriptDocument + EntityRegistry
Output: VoiceDivergenceResult — per-character profiles + divergence matrix

The divergence matrix shows how distinctly each character speaks from every other.
Low divergence between two main characters = editorial red flag.
"""

from ..shared.ner_core import EntityRegistry
from ..shared.stylometry import compute_profile, compute_divergence, StylometricProfile


ENGINE_ID_VD = "voice_divergence"
ENGINE_VERSION_VD = "1.0.0"

MIN_DIALOGUE_WORDS = 150  # minimum words needed to build a meaningful voice profile


# ─────────────────────────────────────────────────────────────────────────────
# OUTPUT CONTRACT
# ─────────────────────────────────────────────────────────────────────────────

@dataclass
class CharacterVoiceProfile:
    character_name: str
    dialogue_word_count: int
    dialogue_sentence_count: int
    profile: StylometricProfile
    sample_sentences: List[str]     # 3 representative samples for UI display
    voice_summary: str              # human-readable one-line description

    @property
    def has_sufficient_data(self) -> bool:
        return self.dialogue_word_count >= MIN_DIALOGUE_WORDS


@dataclass
class DivergencePair:
    char_a: str
    char_b: str
    overall_divergence: float       # 0–100 (100 = maximally different voices)
    per_metric: Dict[str, float]    # per-axis divergence scores
    risk_level: str                 # 'safe' | 'warning' | 'critical'
    weakest_axis: str               # the metric where they overlap most


@dataclass
class VoiceDivergenceResult:
    manuscript_id: str
    version_hash: str
    engine_version: str

    character_profiles: List[CharacterVoiceProfile]
    divergence_matrix: List[DivergencePair]     # all pairs, sorted by risk

    # Summary
    total_characters_analysed: int
    avg_overall_divergence: float   # 0–100 manuscript-wide
    most_similar_pair: Optional[DivergencePair]
    most_distinct_pair: Optional[DivergencePair]

    warnings: List[str]
    skipped_characters: List[str]   # characters with insufficient dialogue data


# ─────────────────────────────────────────────────────────────────────────────
# VOICE SUMMARY GENERATOR
# ─────────────────────────────────────────────────────────────────────────────

def generate_voice_summary(profile: StylometricProfile, name: str) -> str:
    """Generate a one-line human-readable voice description from the profile."""
    traits = []

    if profile.mean_sentence_length < 8:
        traits.append("terse, clipped speech")
    elif profile.mean_sentence_length > 20:
        traits.append("long, flowing sentences")
    else:
        traits.append("moderate sentence length")

    if profile.latinate_ratio > 0.25:
        traits.append("sophisticated vocabulary")
    elif profile.avg_word_length < 4.5:
        traits.append("plain, direct word choice")

    if profile.question_ratio > 0.25:
        traits.append("inquisitive tone")
    if profile.exclamation_ratio > 0.15:
        traits.append("emotional expressiveness")
    if profile.contraction_rate > 5:
        traits.append("informal register")
    elif profile.contraction_rate < 1:
        traits.append("formal register")

    summary = f"{name} speaks with {' and '.join(traits[:3])}."
    return summary


# ─────────────────────────────────────────────────────────────────────────────
# MAIN ENGINE
# ─────────────────────────────────────────────────────────────────────────────

def process_voice_divergence(
    doc: ManuscriptDocument,
    entity_registry: EntityRegistry,
    manuscript_id: str,
) -> VoiceDivergenceResult:
    """
    Compute Character Voice Divergence for all characters with sufficient dialogue.
    Reuses the stylometry engine — ~80% shared code with Fingerprint Builder.
    
    Cost: Zero AI. < 300ms for typical manuscript.
    """
    character_profiles: List[CharacterVoiceProfile] = []
    skipped: List[str] = []

    # Build a profile for each character using their attributed dialogue
    for char_name, dialogue_sentences in entity_registry.dialogue_by_character.items():
        if not dialogue_sentences:
            skipped.append(char_name)
            continue

        # Collect dialogue text
        dialogue_text = ' '.join(s.text for s in dialogue_sentences)
        dialogue_tokens = [
            t for t in doc.tokens
            if t.sentence_id in {s.id for s in dialogue_sentences} and t.is_word
        ]

        if len(dialogue_tokens) < MIN_DIALOGUE_WORDS // 5:
            skipped.append(char_name)
            continue

        profile = compute_profile(dialogue_tokens, dialogue_sentences, dialogue_text, label=char_name)

        # Sample sentences — pick shortest, median, longest for variety
        sorted_by_len = sorted(dialogue_sentences, key=lambda s: s.word_count)
        n = len(sorted_by_len)
        samples = []
        if n >= 1: samples.append(sorted_by_len[0].text[:200])
        if n >= 3: samples.append(sorted_by_len[n // 2].text[:200])
        if n >= 2: samples.append(sorted_by_len[-1].text[:200])

        voice_summary = generate_voice_summary(profile, char_name)

        character_profiles.append(CharacterVoiceProfile(
            character_name=char_name,
            dialogue_word_count=profile.total_words,
            dialogue_sentence_count=profile.sentence_count,
            profile=profile,
            sample_sentences=samples,
            voice_summary=voice_summary,
        ))

    # ── Build divergence matrix ──────────────────────────────────────────────
    divergence_matrix: List[DivergencePair] = []
    valid_profiles = [p for p in character_profiles if p.has_sufficient_data]

    for i in range(len(valid_profiles)):
        for j in range(i + 1, len(valid_profiles)):
            a = valid_profiles[i]
            b = valid_profiles[j]
            overlap = compute_divergence(a.profile, b.profile)

            overall_div = 100.0 - overlap['overall']  # invert: overlap → divergence
            weakest = min(
                {k: v for k, v in overlap.items() if k != 'overall'},
                key=overlap.get
            )

            if overall_div < 25:
                risk = 'critical'
            elif overall_div < 45:
                risk = 'warning'
            else:
                risk = 'safe'

            divergence_matrix.append(DivergencePair(
                char_a=a.character_name,
                char_b=b.character_name,
                overall_divergence=round(overall_div, 1),
                per_metric={k: 100.0 - v for k, v in overlap.items()},
                risk_level=risk,
                weakest_axis=weakest,
            ))

    # Sort by divergence (ascending — most similar pairs first)
    divergence_matrix.sort(key=lambda p: p.overall_divergence)

    avg_div = (
        sum(p.overall_divergence for p in divergence_matrix) / len(divergence_matrix)
        if divergence_matrix else 0.0
    )

    most_similar = divergence_matrix[0] if divergence_matrix else None
    most_distinct = divergence_matrix[-1] if divergence_matrix else None

    # ── Warnings ─────────────────────────────────────────────────────────────
    warnings: List[str] = []
    critical_pairs = [p for p in divergence_matrix if p.risk_level == 'critical']
    warning_pairs = [p for p in divergence_matrix if p.risk_level == 'warning']

    for pair in critical_pairs:
        warnings.append(
            f"CRITICAL: {pair.char_a} and {pair.char_b} share {100 - pair.overall_divergence:.0f}% "
            f"voice overlap — readers cannot distinguish them by dialogue alone. "
            f"The most collapsed metric is '{pair.weakest_axis}'. "
            f"One character should speak shorter/longer, more/less formally, or "
            f"with a distinct verbal tic."
        )
    for pair in warning_pairs:
        warnings.append(
            f"WARNING: {pair.char_a} and {pair.char_b} have low voice divergence "
            f"({pair.overall_divergence:.0f}/100). Weakest metric: '{pair.weakest_axis}'."
        )

    return VoiceDivergenceResult(
        manuscript_id=manuscript_id,
        version_hash=doc.version_hash,
        engine_version=ENGINE_VERSION_VD,
        character_profiles=character_profiles,
        divergence_matrix=divergence_matrix,
        total_characters_analysed=len(valid_profiles),
        avg_overall_divergence=round(avg_div, 1),
        most_similar_pair=most_similar,
        most_distinct_pair=most_distinct,
        warnings=warnings,
        skipped_characters=skipped,
    )
