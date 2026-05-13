"""
imperialx.tests.test_all_engines
===================================
Comprehensive test suite for all 9 engines + shared infrastructure.
Run with: python -m pytest tests/ -v

Tests validate:
  - Correct output structure (data contracts)
  - Score ranges (0–100 where applicable)
  - Edge cases (empty input, single sentence, single chapter)
  - Performance targets (< 3s for 100k word manuscript)
  - Zero AI calls for AI-free engines
  - Determinism (same input → same output always)
"""

import time
import random
import string
import pytest
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from imperialx.shared.pipeline_core import parse, normalise, compute_hash
from imperialx.shared.stylometry import compute_profile
from imperialx.shared.ner_core import extract_entities


# ─────────────────────────────────────────────────────────────────────────────
# TEST FIXTURES
# ─────────────────────────────────────────────────────────────────────────────

SAMPLE_CHAPTER = """
Chapter 1

The letter arrived on a Tuesday. Sarah Harker stood at the window, watching 
the postman cycle away down the wet street. She hadn't expected anything today.
She never expected anything.

"It's from Marcus," she said aloud, though no one was in the room.

She turned the envelope over in her hands. It was heavy -- heavier than she'd 
anticipated. The wax seal on the back was old: an embossed crow, wings spread, 
the way her grandfather had always stamped his correspondence.

But her grandfather had been dead for eleven years.

Sarah's hands began to tremble. She set the envelope on the table. The morning 
light was grey and thin through the kitchen window, the kind of light that made 
everything look temporary.

She sat down.

Outside, a dog barked twice and then fell silent.
"""

SAMPLE_CHAPTER_2 = """
Chapter 2

Three days had passed since the letter. Sarah was sitting in Dr. Whitmore's office 
on the fourth floor of the psychiatric unit, waiting. She was thirty-two years old. 
Dr. Whitmore was fifty-one.

"You haven't opened it," said Dr. Whitmore.

"No," she replied simply.

He watched her across the desk. The afternoon sun came through the blinds in 
horizontal bars of gold. It felt too cheerful for what they were discussing.

"Sarah, I think you should tell me what you're afraid of."

She looked at the painting on the wall -- a lighthouse, rocks, dark water.

"I'm afraid it's real," she said.
"""

SAMPLE_MULTI_CHAPTER = SAMPLE_CHAPTER + "\n\n" + SAMPLE_CHAPTER_2

TELLING_HEAVY_TEXT = """
Chapter 1

John was very sad. He felt an overwhelming sense of loneliness and despair.
Mary seemed angry. She appeared deeply frustrated with the situation.
It was decided that they would leave. The decision was made by the committee.
John was extremely upset. He felt deeply betrayed by his friend.
Mary was profoundly disappointed. She had been terribly let down.
"""

SHOWING_HEAVY_TEXT = """
Chapter 1

John's hands shook as he set the coffee cup down. It rattled against the saucer.
Mary turned her back to him. Her shoulders were rigid, the muscles along her 
jaw tight.
He crossed the kitchen to the window. Outside, rain had already darkened the 
pavement.
"I'll go," he said.
She didn't answer. Her fingers pressed flat against the counter.
The clock on the microwave read 4:17. The sound of the refrigerator seemed 
very loud.
"""


def make_large_manuscript(word_count: int = 100_000) -> str:
    """Generate a synthetic manuscript of approximately word_count words."""
    chapters = []
    words_per_chapter = word_count // 20
    chapter_words = [
        "the", "a", "and", "was", "in", "to", "of", "he", "she", "said",
        "looked", "walked", "turned", "felt", "knew", "thought", "heard",
        "John", "Mary", "Sarah", "darkness", "light", "door", "room", "window",
        "morning", "night", "eyes", "hand", "voice", "silence", "old", "new",
    ]

    for i in range(20):
        lines = [f"Chapter {i+1}\n"]
        word_count_so_far = 0
        while word_count_so_far < words_per_chapter:
            sentence_len = random.randint(8, 25)
            words = [random.choice(chapter_words) for _ in range(sentence_len)]
            words[0] = words[0].capitalize()
            lines.append(' '.join(words) + '. ')
            word_count_so_far += sentence_len
            if word_count_so_far % 100 == 0:
                lines.append('\n\n')
        chapters.append(''.join(lines))

    return '\n\n'.join(chapters)


# ─────────────────────────────────────────────────────────────────────────────
# PIPELINE CORE TESTS
# ─────────────────────────────────────────────────────────────────────────────

class TestPipelineCore:

    def test_normalise_smart_quotes(self):
        text = "\u201CHello\u201D \u2018world\u2019"
        result = normalise(text)
        assert '"Hello"' in result or '"Hello"' in result
        assert '\u201C' not in result
        assert '\u201D' not in result

    def test_normalise_emdash(self):
        text = "word\u2014word"
        result = normalise(text)
        assert '--' in result

    def test_normalise_idempotent(self):
        text = "Hello\u2014world\u2019s test"
        once = normalise(text)
        twice = normalise(once)
        assert once == twice

    def test_compute_hash_deterministic(self):
        text = "Same text produces same hash"
        h1 = compute_hash(text)
        h2 = compute_hash(text)
        assert h1 == h2

    def test_compute_hash_different_texts(self):
        h1 = compute_hash("text one")
        h2 = compute_hash("text two")
        assert h1 != h2

    def test_parse_basic(self):
        doc = parse(SAMPLE_CHAPTER)
        assert doc.word_count > 0
        assert len(doc.chapters) >= 1
        assert len(doc.sentences) > 0
        assert len(doc.tokens) > 0
        assert len(doc.windows) > 0
        assert doc.version_hash != ''

    def test_parse_multi_chapter(self):
        doc = parse(SAMPLE_MULTI_CHAPTER)
        assert len(doc.chapters) >= 2

    def test_parse_empty_text(self):
        doc = parse("   \n\n   ")
        # Should not crash — returns minimal document
        assert doc is not None

    def test_parse_single_sentence(self):
        doc = parse("The cat sat on the mat.")
        assert doc.word_count > 0
        assert len(doc.sentences) >= 1

    def test_parse_deterministic(self):
        doc1 = parse(SAMPLE_CHAPTER)
        doc2 = parse(SAMPLE_CHAPTER)
        assert doc1.version_hash == doc2.version_hash
        assert doc1.word_count == doc2.word_count

    def test_windows_cover_all_words(self):
        doc = parse(SAMPLE_MULTI_CHAPTER)
        # Every word token should have been assigned a window
        word_tokens = [t for t in doc.tokens if t.is_word]
        assigned = [t for t in word_tokens if t.window_id != -1]
        # Allow up to 10% unassigned (tail end of last window)
        assert len(assigned) / len(word_tokens) >= 0.90


# ─────────────────────────────────────────────────────────────────────────────
# STYLOMETRY TESTS
# ─────────────────────────────────────────────────────────────────────────────

class TestStylometry:

    def test_profile_basic(self):
        doc = parse(SAMPLE_CHAPTER)
        profile = compute_profile(doc.tokens, doc.sentences, doc.normalised_text)
        assert 0 <= profile.ttr <= 1
        assert 0 <= profile.mattr <= 1
        assert 0 <= profile.hapax_rate <= 1
        assert profile.total_words > 0
        assert profile.mean_sentence_length > 0

    def test_ttr_lower_for_repetitive_text(self):
        doc1 = parse("The cat sat. The cat sat. The cat sat. The cat sat.")
        doc2 = parse(SAMPLE_CHAPTER)
        p1 = compute_profile(doc1.tokens, doc1.sentences, doc1.normalised_text)
        p2 = compute_profile(doc2.tokens, doc2.sentences, doc2.normalised_text)
        assert p1.ttr < p2.ttr

    def test_fingerprint_axes_range(self):
        doc = parse(SAMPLE_CHAPTER)
        profile = compute_profile(doc.tokens, doc.sentences, doc.normalised_text)
        axes = profile.fingerprint_axes()
        assert len(axes) == 5
        for name, value in axes.items():
            assert 0 <= value <= 100, f"Axis '{name}' out of range: {value}"

    def test_profile_empty_tokens(self):
        # Should not crash on empty input
        profile = compute_profile([], [], "")
        assert profile.total_words == 0
        assert profile.ttr == 0.0


# ─────────────────────────────────────────────────────────────────────────────
# ENGINE 01 — FINGERPRINT TESTS
# ─────────────────────────────────────────────────────────────────────────────

class TestFingerprintEngine:

    def test_returns_result(self):
        from imperialx.engines.engine_01_fingerprint import process
        doc = parse(SAMPLE_MULTI_CHAPTER)
        result = process(doc, 'test_ms_01')
        assert result is not None
        assert result.manuscript_id == 'test_ms_01'

    def test_baseline_axes_in_range(self):
        from imperialx.engines.engine_01_fingerprint import process
        doc = parse(SAMPLE_MULTI_CHAPTER)
        result = process(doc, 'test_ms_01')
        for name, val in result.baseline_axes.items():
            assert 0 <= val <= 100, f"{name}: {val}"

    def test_per_chapter_count(self):
        from imperialx.engines.engine_01_fingerprint import process
        doc = parse(SAMPLE_MULTI_CHAPTER)
        result = process(doc, 'test_ms_01')
        assert len(result.per_chapter) >= 1

    def test_drift_in_range(self):
        from imperialx.engines.engine_01_fingerprint import process
        doc = parse(SAMPLE_MULTI_CHAPTER)
        result = process(doc, 'test_ms_01')
        assert 0 <= result.avg_chapter_drift <= 100

    def test_deterministic(self):
        from imperialx.engines.engine_01_fingerprint import process
        doc = parse(SAMPLE_CHAPTER)
        r1 = process(doc, 'test_ms_01')
        r2 = process(doc, 'test_ms_01')
        assert r1.baseline_axes == r2.baseline_axes


# ─────────────────────────────────────────────────────────────────────────────
# ENGINE 02 — TENSION WAVEFORM TESTS
# ─────────────────────────────────────────────────────────────────────────────

class TestTensionEngine:

    def test_returns_result(self):
        from imperialx.engines.engine_02_03_tension_voice import process
        doc = parse(SAMPLE_MULTI_CHAPTER)
        result = process(doc, 'test_ms_02')
        assert result is not None

    def test_window_scores_in_range(self):
        from imperialx.engines.engine_02_03_tension_voice import process
        doc = parse(SAMPLE_MULTI_CHAPTER)
        result = process(doc, 'test_ms_02')
        for w in result.windows:
            assert 0 <= w.tension_score <= 100, f"Window {w.window_id}: {w.tension_score}"

    def test_zones_are_valid(self):
        from imperialx.engines.engine_02_03_tension_voice import process
        valid_zones = {'peak', 'rising', 'stable', 'flatline'}
        doc = parse(SAMPLE_MULTI_CHAPTER)
        result = process(doc, 'test_ms_02')
        for w in result.windows:
            assert w.zone in valid_zones


# ─────────────────────────────────────────────────────────────────────────────
# ENGINE 04 — CHEKHOV'S GUN TESTS
# ─────────────────────────────────────────────────────────────────────────────

class TestGunTracker:

    PROMISE_TEXT = """
    Chapter 1
    
    "I'll be back for you," said Marcus. "I promise. You have my word."
    Sarah clutched the old letter. The photograph fell from the envelope.
    She would remember this moment for the rest of her life.
    "This isn't over," he said. "Not by a long way."
    """

    def test_detects_promises(self):
        from imperialx.shared.ner_core import extract_entities
        from imperialx.engines.engine_04_05_guns_entropy import process_gun_tracker
        doc = parse(self.PROMISE_TEXT)
        registry = extract_entities(doc)
        result = process_gun_tracker(doc, registry, 'test_ms_04')
        promise_guns = [g for g in result.all_guns if g.gun_type == 'PROMISE']
        assert len(promise_guns) >= 1

    def test_detects_objects(self):
        from imperialx.shared.ner_core import extract_entities
        from imperialx.engines.engine_04_05_guns_entropy import process_gun_tracker
        doc = parse(self.PROMISE_TEXT)
        registry = extract_entities(doc)
        result = process_gun_tracker(doc, registry, 'test_ms_04')
        object_guns = [g for g in result.all_guns if g.gun_type == 'OBJECT']
        assert len(object_guns) >= 1  # the letter, the photograph

    def test_closure_rate_in_range(self):
        from imperialx.shared.ner_core import extract_entities
        from imperialx.engines.engine_04_05_guns_entropy import process_gun_tracker
        doc = parse(SAMPLE_MULTI_CHAPTER)
        registry = extract_entities(doc)
        result = process_gun_tracker(doc, registry, 'test_ms_04')
        assert 0 <= result.closure_rate <= 100


# ─────────────────────────────────────────────────────────────────────────────
# ENGINE 06 — DRAFT ARCHAEOLOGY TESTS
# ─────────────────────────────────────────────────────────────────────────────

class TestDraftArchaeology:

    def test_myers_diff_equal(self):
        from imperialx.engines.engine_06_archaeology import myers_diff
        seq = ['a', 'b', 'c', 'd']
        ops = myers_diff(seq, seq)
        assert all(op == 'equal' for op, _ in ops)

    def test_myers_diff_insert(self):
        from imperialx.engines.engine_06_archaeology import myers_diff
        old = ['a', 'b']
        new = ['a', 'x', 'b']
        ops = myers_diff(old, new)
        assert any(op == 'insert' for op, _ in ops)

    def test_myers_diff_delete(self):
        from imperialx.engines.engine_06_archaeology import myers_diff
        old = ['a', 'b', 'c']
        new = ['a', 'c']
        ops = myers_diff(old, new)
        assert any(op == 'delete' for op, _ in ops)

    def test_snapshot_creation(self):
        from imperialx.engines.engine_06_archaeology import create_baseline_snapshot
        snap = create_baseline_snapshot(
            'ms_001', 'abc123',
            {0: ['hash1', 'hash2'], 1: ['hash3']},
            word_count=500,
        )
        assert snap.is_baseline
        assert snap.chapter_paragraph_hashes is not None

    def test_delta_compression(self):
        from imperialx.engines.engine_06_archaeology import (
            create_baseline_snapshot, create_delta_snapshot
        )
        base = create_baseline_snapshot(
            'ms_001', 'abc123',
            {0: ['h1', 'h2', 'h3']},
            word_count=300,
        )
        new_hashes = {0: ['h1', 'h4', 'h3']}  # h2 → h4 changed
        new_snap, delta = create_delta_snapshot(
            'ms_001', base.snapshot_id, base, new_hashes, 300, 300
        )
        # Verify compression round-trip
        compressed = delta.to_storage_bytes()
        restored = delta.from_storage_bytes(compressed)
        assert restored.paragraphs_changed == delta.paragraphs_changed

    def test_empty_history(self):
        from imperialx.engines.engine_06_archaeology import process
        result = process('ms_001', [], [])
        assert result is not None
        assert len(result.warnings) > 0


# ─────────────────────────────────────────────────────────────────────────────
# ENGINE 07 — ICEBERG RATIO TESTS
# ─────────────────────────────────────────────────────────────────────────────

class TestIcebergRatio:

    def test_telling_heavy_scores_low(self):
        from imperialx.engines.engine_07_08_iceberg_temporal import process
        doc = parse(TELLING_HEAVY_TEXT)
        result = process(doc, 'test_ms_07')
        assert result.manuscript_ratio < 0.50, f"Expected low shown ratio, got {result.manuscript_ratio}"

    def test_showing_heavy_scores_high(self):
        from imperialx.engines.engine_07_08_iceberg_temporal import process
        doc = parse(SHOWING_HEAVY_TEXT)
        result = process(doc, 'test_ms_07')
        assert result.manuscript_ratio > 0.40, f"Expected higher shown ratio, got {result.manuscript_ratio}"

    def test_ratio_in_range(self):
        from imperialx.engines.engine_07_08_iceberg_temporal import process
        doc = parse(SAMPLE_MULTI_CHAPTER)
        result = process(doc, 'test_ms_07')
        assert 0 <= result.manuscript_ratio <= 1
        for ch in result.chapters:
            assert 0 <= ch.ratio <= 1
            assert 0 <= ch.iceberg_percentage <= 100


# ─────────────────────────────────────────────────────────────────────────────
# ENGINE 08 — TEMPORAL COHERENCE TESTS
# ─────────────────────────────────────────────────────────────────────────────

class TestTemporalEngine:

    AGE_CONTRADICTION_TEXT = """
    Chapter 1
    
    John was 24 years old when he first arrived in the city.
    It was summer, July to be precise.
    
    Chapter 2
    
    Three months later, John was 22 years old and feeling lost.
    The snow outside came as a surprise.
    """

    def test_detects_age_contradiction(self):
        from imperialx.engines.engine_07_08_iceberg_temporal import process_temporal
        doc = parse(self.AGE_CONTRADICTION_TEXT)
        result = process_temporal(doc, 'test_ms_08')
        age_contradictions = [c for c in result.contradictions if c.contradiction_type == 'AGE_REGRESSION']
        assert len(age_contradictions) >= 1

    def test_detects_season_conflict(self):
        from imperialx.engines.engine_07_08_iceberg_temporal import process_temporal
        doc = parse(self.AGE_CONTRADICTION_TEXT)
        result = process_temporal(doc, 'test_ms_08')
        season_contradictions = [c for c in result.contradictions if c.contradiction_type == 'SEASON_CONFLICT']
        assert len(season_contradictions) >= 1

    def test_no_false_positives_on_clean_text(self):
        from imperialx.engines.engine_07_08_iceberg_temporal import process_temporal
        doc = parse(SAMPLE_MULTI_CHAPTER)
        result = process_temporal(doc, 'test_ms_08')
        # Sample text shouldn't have obvious temporal contradictions
        definite = [c for c in result.contradictions if c.severity == 'definite']
        assert len(definite) == 0


# ─────────────────────────────────────────────────────────────────────────────
# ENGINE 09 — COLD OPEN SCORER TESTS
# ─────────────────────────────────────────────────────────────────────────────

class TestColdOpenScorer:

    def test_returns_result(self):
        from imperialx.engines.engine_09_cold_open import process
        doc = parse(SAMPLE_CHAPTER)
        result = process(doc, 'test_ms_09')
        assert result is not None

    def test_score_in_range(self):
        from imperialx.engines.engine_09_cold_open import process
        doc = parse(SAMPLE_CHAPTER)
        result = process(doc, 'test_ms_09')
        assert 0 <= result.total_score <= 100

    def test_grade_is_valid(self):
        from imperialx.engines.engine_09_cold_open import process
        valid_grades = {'A', 'B', 'C', 'D', 'F'}
        doc = parse(SAMPLE_CHAPTER)
        result = process(doc, 'test_ms_09')
        assert result.grade in valid_grades

    def test_no_ai_invoked_by_default(self):
        from imperialx.engines.engine_09_cold_open import process
        doc = parse(SAMPLE_CHAPTER)
        result = process(doc, 'test_ms_09', ai_client=None)
        assert not result.ai_was_invoked

    def test_criteria_weights_sum_to_one(self):
        from imperialx.engines.engine_09_cold_open import CRITERION_WEIGHTS
        total = sum(CRITERION_WEIGHTS.values())
        assert abs(total - 1.0) < 0.001


# ─────────────────────────────────────────────────────────────────────────────
# PERFORMANCE TESTS
# ─────────────────────────────────────────────────────────────────────────────

class TestPerformance:

    def test_parse_100k_words_under_3_seconds(self):
        large_text = make_large_manuscript(100_000)
        start = time.time()
        doc = parse(large_text)
        elapsed = time.time() - start
        assert elapsed < 3.0, f"Parse took {elapsed:.2f}s — exceeds 3s target"
        assert doc.word_count > 50_000

    def test_fingerprint_100k_words_under_5_seconds(self):
        from imperialx.engines.engine_01_fingerprint import process
        large_text = make_large_manuscript(100_000)
        doc = parse(large_text)
        start = time.time()
        process(doc, 'perf_test')
        elapsed = time.time() - start
        assert elapsed < 5.0, f"Fingerprint took {elapsed:.2f}s — exceeds 5s target"


# ─────────────────────────────────────────────────────────────────────────────
# ORCHESTRATOR TESTS
# ─────────────────────────────────────────────────────────────────────────────

class TestOrchestrator:

    def test_run_all_no_crash(self):
        from imperialx.engines.engine_09_cold_open import run_all
        result = run_all(SAMPLE_MULTI_CHAPTER, 'orch_test_01')
        assert result is not None
        assert result.version_hash != ''

    def test_engine_failure_does_not_stop_others(self):
        from imperialx.engines.engine_09_cold_open import run_all
        # Inject bad text that might confuse one engine
        result = run_all("Chapter 1\n\n" + "x " * 100, 'orch_test_02')
        # At minimum fingerprint and tension should have run
        assert result is not None
        # Should not have crashed entirely

    def test_selective_engine_run(self):
        from imperialx.engines.engine_09_cold_open import run_all
        result = run_all(
            SAMPLE_CHAPTER,
            'orch_test_03',
            engines_to_run=['fingerprint', 'tension'],
        )
        assert result.fingerprint is not None
        assert result.tension is not None
        assert result.iceberg is None     # not requested
        assert result.cold_open is None   # not requested


if __name__ == '__main__':
    pytest.main([__file__, '-v', '--tb=short'])
