"""
imperialx.orchestrator
========================
Master Engine Orchestrator.
Receives raw text + context and dispatches all 9 engines in dependency order.

Execution order:
  Stage 0: Parse (pipeline_core)
  Stage 1: NER extraction (shared — consumed by 5 engines)
  Stage 2: Scene Entropy (must run before Tension to share entity counts)
  Stage 3: All remaining engines (parallel-safe given Stage 1+2 outputs)
  Stage 4: Draft Archaeology (independent — uses snapshot history, not NER)

Circuit breaker: every engine is wrapped in try/except.
One engine failure never stops others from running.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import List, Dict, Optional, Any

from .shared.pipeline_core import parse, ManuscriptDocument
from .shared.ner_core import extract_entities, EntityRegistry
from .engines.engine_01_fingerprint import process as run_fingerprint
from .engines.engine_02_03_tension_voice import (
    process as run_tension,
    process_voice_divergence,
)
from .engines.engine_04_05_guns_entropy import (
    process_gun_tracker,
    process_entropy,
)
from .engines.engine_06_archaeology import (
    process as run_archaeology,
    ManuscriptSnapshot,
    SnapshotDelta,
)
from .engines.engine_07_08_iceberg_temporal import (
    process as run_iceberg,
    process_temporal,
)
from .engines.engine_09_cold_open import process as run_cold_open


ALL_ENGINE_IDS = [
    'fingerprint',
    'tension',
    'voice_divergence',
    'gun_tracker',
    'entropy',
    'archaeology',
    'iceberg',
    'temporal',
    'cold_open',
]


@dataclass
class OrchestratorResult:
    manuscript_id: str
    version_hash: str
    fingerprint:      Optional[Any] = None
    tension:          Optional[Any] = None
    voice_divergence: Optional[Any] = None
    gun_tracker:      Optional[Any] = None
    entropy:          Optional[Any] = None
    archaeology:      Optional[Any] = None
    iceberg:          Optional[Any] = None
    temporal:         Optional[Any] = None
    cold_open:        Optional[Any] = None
    errors:           Dict[str, str] = field(default_factory=dict)
    skipped:          List[str]      = field(default_factory=list)

    @property
    def has_errors(self) -> bool:
        return bool(self.errors)

    @property
    def completed_engines(self) -> List[str]:
        return [
            e for e in ALL_ENGINE_IDS
            if getattr(self, e) is not None
        ]

    def summary(self) -> Dict:
        return {
            'manuscript_id':      self.manuscript_id,
            'version_hash':       self.version_hash[:12] + '...',
            'completed':          self.completed_engines,
            'failed':             list(self.errors.keys()),
            'skipped':            self.skipped,
            'total_engines':      len(ALL_ENGINE_IDS),
            'completion_rate':    f"{len(self.completed_engines)}/{len(ALL_ENGINE_IDS)}",
        }


def _safe_run(fn, *args, engine_name: str, result: OrchestratorResult, **kwargs):
    """
    Execute an engine function inside a circuit breaker.
    Returns the engine output or None on failure.
    Logs error to result.errors — never raises.
    """
    try:
        return fn(*args, **kwargs)
    except Exception as ex:
        result.errors[engine_name] = f"{type(ex).__name__}: {ex}"
        return None


def run_all(
    raw_text: str,
    manuscript_id: str,
    genre: str = 'default',
    snapshots: Optional[List[ManuscriptSnapshot]] = None,
    deltas: Optional[List[SnapshotDelta]] = None,
    ai_client: Optional[Any] = None,
    engines_to_run: Optional[List[str]] = None,
    intentional_gun_ids: Optional[set] = None,
    chapter_titles: Optional[Dict[int, Optional[str]]] = None,
) -> OrchestratorResult:
    """
    Full pipeline: parse → NER → all requested engines.

    Args:
        raw_text:              The manuscript text (any encoding normalised internally).
        manuscript_id:         Caller-supplied identifier for caching / logging.
        genre:                 One of: thriller, literary, romance, fantasy, mystery,
                               horror, default. Adjusts tension/entropy weights.
        snapshots:             Ordered ManuscriptSnapshot list for Draft Archaeology.
        deltas:                Ordered SnapshotDelta list for Draft Archaeology.
        ai_client:             Optional client object with a .call(prompt, max_tokens)
                               method. If None, AI-assisted engines run in deterministic
                               mode only.
        engines_to_run:        Subset of engine IDs to run. None = run all.
        intentional_gun_ids:   Set of Gun IDs the writer has flagged as intentional open
                               threads (skipped in Gun Tracker unfired count).
        chapter_titles:        Optional {chapter_id: title} for Archaeology display.

    Returns:
        OrchestratorResult with one attribute per engine, plus errors and skipped lists.
    """
    run = set(engines_to_run or ALL_ENGINE_IDS)
    result = OrchestratorResult(manuscript_id=manuscript_id, version_hash='')

    # ── Stage 0: Parse ────────────────────────────────────────────────────────
    try:
        doc: ManuscriptDocument = parse(raw_text)
        result.version_hash = doc.version_hash
    except Exception as ex:
        # Fatal: cannot continue without a parsed document
        for e in ALL_ENGINE_IDS:
            result.errors[e] = f"Parse failed: {type(ex).__name__}: {ex}"
            result.skipped.extend(list(run))
        return result

    # ── Stage 1: NER (shared by 5 engines) ───────────────────────────────────
    entity_registry: Optional[EntityRegistry] = None
    ner_consumers = {'voice_divergence', 'gun_tracker', 'entropy', 'temporal', 'cold_open'}
    needs_ner = bool(run & ner_consumers)

    if needs_ner:
        try:
            entity_registry = extract_entities(doc)
        except Exception as ex:
            for e in ner_consumers & run:
                result.errors[e] = f"NER failed: {type(ex).__name__}: {ex}"
                result.skipped.append(e)

    # ── Stage 2: Scene Entropy first (shares entity counts with Tension) ──────
    entropy_entity_counts: Optional[Dict[int, int]] = None

    if 'entropy' in run and 'entropy' not in result.skipped and entity_registry:
        result.entropy = _safe_run(
            process_entropy, doc, entity_registry, manuscript_id,
            engine_name='entropy', result=result,
        )
        if result.entropy:
            entropy_entity_counts = result.entropy.new_entity_counts_per_window

    # ── Stage 3A: Stylometry-only engines (no NER dependency) ────────────────
    if 'fingerprint' in run:
        result.fingerprint = _safe_run(
            run_fingerprint, doc, manuscript_id,
            engine_name='fingerprint', result=result,
        )

    if 'tension' in run:
        result.tension = _safe_run(
            run_tension, doc, manuscript_id, genre, entropy_entity_counts,
            engine_name='tension', result=result,
        )

    if 'iceberg' in run:
        result.iceberg = _safe_run(
            run_iceberg, doc, manuscript_id,
            invoke_ai_for_low_confidence=(ai_client is not None),
            ai_client=ai_client,
            engine_name='iceberg', result=result,
        )

    # ── Stage 3B: NER-dependent engines ──────────────────────────────────────
    if 'voice_divergence' in run and 'voice_divergence' not in result.skipped and entity_registry:
        result.voice_divergence = _safe_run(
            process_voice_divergence, doc, entity_registry, manuscript_id,
            engine_name='voice_divergence', result=result,
        )

    if 'gun_tracker' in run and 'gun_tracker' not in result.skipped and entity_registry:
        result.gun_tracker = _safe_run(
            process_gun_tracker, doc, entity_registry, manuscript_id,
            intentional_gun_ids or set(),
            engine_name='gun_tracker', result=result,
        )

    if 'temporal' in run and 'temporal' not in result.skipped:
        result.temporal = _safe_run(
            process_temporal, doc, manuscript_id,
            engine_name='temporal', result=result,
        )

    if 'cold_open' in run and 'cold_open' not in result.skipped:
        result.cold_open = _safe_run(
            run_cold_open, doc, manuscript_id,
            ai_client=ai_client, genre=genre,
            engine_name='cold_open', result=result,
        )

    # ── Stage 4: Draft Archaeology (independent — snapshot history) ───────────
    if 'archaeology' in run:
        result.archaeology = _safe_run(
            run_archaeology,
            manuscript_id,
            snapshots or [],
            deltas or [],
            chapter_titles or {},
            engine_name='archaeology', result=result,
        )

    return result


def run_submission_suite(
    raw_text: str,
    manuscript_id: str,
    genre: str = 'default',
    ai_client: Optional[Any] = None,
) -> OrchestratorResult:
    """
    Pre-submission check: runs only the three engines most relevant to querying.
    Cold Open Scorer + Chekhov's Gun Tracker + Temporal Coherence Engine.
    Fastest possible turnaround — typically < 5 seconds.
    """
    return run_all(
        raw_text=raw_text,
        manuscript_id=manuscript_id,
        genre=genre,
        ai_client=ai_client,
        engines_to_run=['cold_open', 'gun_tracker', 'temporal'],
    )


def run_quick_feedback(
    raw_text: str,
    manuscript_id: str,
    genre: str = 'default',
) -> OrchestratorResult:
    """
    Real-time feedback while writing: Fingerprint + Tension Waveform only.
    No NER required. No AI. Should complete in < 2 seconds.
    """
    return run_all(
        raw_text=raw_text,
        manuscript_id=manuscript_id,
        genre=genre,
        engines_to_run=['fingerprint', 'tension'],
    )
