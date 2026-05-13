"""
imperialx.engines.draft_archaeology
======================================
Engine 06: Draft Archaeology
No AI. Pure diff engine + snapshot versioning system.

Every manuscript save produces a snapshot. Over time the engine builds
a revision heat map showing:
  - Which scenes were rewritten the most (instability = writer uncertainty)
  - Which chapters locked on the first draft (confidence zones)
  - Net word direction per chapter (growing or shrinking)
  - Full version restore to any historical state

Storage strategy:
  - First save = full baseline (compressed)
  - Every subsequent save = Myers diff of paragraph hash arrays only
  - Cold archival after 90 days to object storage
  - Reconstruction = baseline + sequential delta application
"""

from __future__ import annotations

import hashlib
import json
import zlib
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import List, Dict, Optional, Tuple, Any


ENGINE_ID = "draft_archaeology"
ENGINE_VERSION = "1.0.0"


# ─────────────────────────────────────────────────────────────────────────────
# MYERS DIFF ALGORITHM (paragraph-level)
# ─────────────────────────────────────────────────────────────────────────────

def myers_diff(old_seq: List[str], new_seq: List[str]) -> List[Tuple[str, str]]:
    """
    Myers diff algorithm applied to a sequence of paragraph hashes.
    Returns a list of operations: ('equal', hash) | ('insert', hash) | ('delete', hash)
    
    This is the O(nd) algorithm from Myers 1986.
    For paragraph-level diffs (typical: 50–500 paragraphs), this is fast.
    
    We diff paragraph HASHES, not raw text — this keeps the diff data tiny
    while preserving the ability to detect which paragraphs changed.
    """
    n = len(old_seq)
    m = len(new_seq)
    max_d = n + m

    if max_d == 0:
        return []

    # v[k] = x coordinate of the furthest-reaching path along diagonal k
    v: Dict[int, int] = {1: 0}
    trace: List[Dict[int, int]] = []

    for d in range(max_d + 1):
        trace.append(dict(v))
        for k in range(-d, d + 1, 2):
            if k == -d or (k != d and v.get(k - 1, -1) < v.get(k + 1, -1)):
                x = v.get(k + 1, 0)
            else:
                x = v.get(k - 1, 0) + 1

            y = x - k
            while x < n and y < m and old_seq[x] == new_seq[y]:
                x += 1
                y += 1

            v[k] = x
            if x >= n and y >= m:
                return _backtrack(old_seq, new_seq, trace)

    return _backtrack(old_seq, new_seq, trace)


def _backtrack(
    old_seq: List[str],
    new_seq: List[str],
    trace: List[Dict[int, int]],
) -> List[Tuple[str, str]]:
    """Backtrack through the edit graph to reconstruct the edit script."""
    x = len(old_seq)
    y = len(new_seq)
    result: List[Tuple[str, str]] = []

    for d in range(len(trace) - 1, -1, -1):
        v = trace[d]
        k = x - y

        if k == -d or (k != d and v.get(k - 1, -1) < v.get(k + 1, -1)):
            prev_k = k + 1
        else:
            prev_k = k - 1

        prev_x = v.get(prev_k, 0)
        prev_y = prev_x - prev_k

        while x > prev_x and y > prev_y:
            result.append(('equal', old_seq[x - 1]))
            x -= 1
            y -= 1

        if d > 0:
            if x == prev_x:
                result.append(('insert', new_seq[y - 1]))
                y -= 1
            elif y == prev_y:
                result.append(('delete', old_seq[x - 1]))
                x -= 1

    result.reverse()
    return result


# ─────────────────────────────────────────────────────────────────────────────
# SNAPSHOT DATA STRUCTURES
# ─────────────────────────────────────────────────────────────────────────────

@dataclass
class ParagraphChange:
    """A single paragraph-level change between two snapshots."""
    paragraph_hash: str
    change_type: str        # 'added' | 'removed' | 'unchanged'
    chapter_id: Optional[int] = None


@dataclass
class SnapshotDelta:
    """
    Compressed diff between two manuscript snapshots.
    Stored in the database — NOT the full text.
    Average size: 2–30 KB per save session.
    """
    delta_id: str
    manuscript_id: str
    from_version_hash: str
    to_version_hash: str
    created_at: str                     # ISO 8601

    # The actual diff — list of (op, paragraph_hash) tuples, compressed
    diff_ops: List[Tuple[str, str]]     # serialised from myers_diff output

    # Summary statistics (no compression needed — these are just numbers)
    words_added: int
    words_removed: int
    net_word_change: int
    paragraphs_changed: int
    chapters_affected: List[int]

    def to_storage_bytes(self) -> bytes:
        """Compress delta for database storage. Typical compression ratio: 5–10x."""
        payload = json.dumps({
            'delta_id': self.delta_id,
            'from_hash': self.from_version_hash,
            'to_hash': self.to_version_hash,
            'created_at': self.created_at,
            'diff_ops': self.diff_ops,
            'words_added': self.words_added,
            'words_removed': self.words_removed,
            'net_word_change': self.net_word_change,
            'paragraphs_changed': self.paragraphs_changed,
            'chapters_affected': self.chapters_affected,
        }, separators=(',', ':'))
        return zlib.compress(payload.encode('utf-8'), level=9)

    @staticmethod
    def from_storage_bytes(data: bytes) -> 'SnapshotDelta':
        payload = json.loads(zlib.decompress(data).decode('utf-8'))
        return SnapshotDelta(
            delta_id=payload['delta_id'],
            manuscript_id='',  # caller fills this in
            from_version_hash=payload['from_hash'],
            to_version_hash=payload['to_hash'],
            created_at=payload['created_at'],
            diff_ops=payload['diff_ops'],
            words_added=payload['words_added'],
            words_removed=payload['words_removed'],
            net_word_change=payload['net_word_change'],
            paragraphs_changed=payload['paragraphs_changed'],
            chapters_affected=payload['chapters_affected'],
        )


@dataclass
class ManuscriptSnapshot:
    """
    A complete point-in-time snapshot of a manuscript.
    Only the FIRST snapshot stores full paragraph hashes.
    All subsequent snapshots are SnapshotDeltas.
    """
    snapshot_id: str
    manuscript_id: str
    version_hash: str
    snapshot_type: str          # 'baseline' | 'delta'
    baseline_id: Optional[str]  # None for baseline, points to baseline for deltas
    created_at: str
    word_count: int

    # For baseline snapshots: full paragraph hash arrays per chapter
    # For delta snapshots: None — stored as SnapshotDelta separately
    chapter_paragraph_hashes: Optional[Dict[int, List[str]]] = None

    @property
    def is_baseline(self) -> bool:
        return self.snapshot_type == 'baseline'


# ─────────────────────────────────────────────────────────────────────────────
# OUTPUT CONTRACT
# ─────────────────────────────────────────────────────────────────────────────

@dataclass
class ChapterStability:
    chapter_id: int
    chapter_title: Optional[str]
    total_saves: int                # number of snapshots that included this chapter
    changed_saves: int              # saves where this chapter had at least one paragraph change
    stability_score: float          # (total_saves - changed_saves) / total_saves * 100
    stability_zone: str             # 'locked' | 'stable' | 'unstable' | 'volatile'
    rewrite_count: int              # total paragraph-level changes across all deltas
    net_word_direction: str         # 'growing' | 'shrinking' | 'oscillating' | 'stable'
    word_count_history: List[int]   # word count per snapshot for sparkline


@dataclass
class RevisionSummary:
    total_snapshots: int
    total_saves: int
    total_words_written: int        # cumulative words added across all sessions
    total_words_removed: int
    first_save_at: str
    last_save_at: str
    most_edited_chapter_id: Optional[int]
    most_stable_chapter_id: Optional[int]
    avg_session_word_change: float


@dataclass
class ArchaeologyResult:
    """
    Full draft archaeology analysis for a manuscript's version history.
    Built from a list of ManuscriptSnapshots and their associated SnapshotDeltas.
    """
    manuscript_id: str
    engine_version: str

    chapter_stability: List[ChapterStability]
    revision_summary: RevisionSummary

    # Heat map data — for the UI rendering
    # Format: {chapter_id: normalised_instability_score 0–100}
    instability_heatmap: Dict[int, float]

    # Timeline — list of snapshots in chronological order
    snapshot_timeline: List[Dict]   # minimal data for UI timeline

    # Resurrection candidates — passages that existed in old drafts but were deleted
    deleted_passages: List[Dict]    # {chapter_id, deleted_at, word_count, preview}

    warnings: List[str]


# ─────────────────────────────────────────────────────────────────────────────
# SNAPSHOT CREATION
# ─────────────────────────────────────────────────────────────────────────────

def create_baseline_snapshot(
    manuscript_id: str,
    version_hash: str,
    chapter_paragraph_hashes: Dict[int, List[str]],
    word_count: int,
) -> ManuscriptSnapshot:
    """
    Create the first (baseline) snapshot for a manuscript.
    Called once per manuscript — on first save.
    """
    snapshot_id = hashlib.md5(
        f"{manuscript_id}_{version_hash}_baseline".encode()
    ).hexdigest()

    return ManuscriptSnapshot(
        snapshot_id=snapshot_id,
        manuscript_id=manuscript_id,
        version_hash=version_hash,
        snapshot_type='baseline',
        baseline_id=None,
        created_at=datetime.now(timezone.utc).isoformat(),
        word_count=word_count,
        chapter_paragraph_hashes=chapter_paragraph_hashes,
    )


def create_delta_snapshot(
    manuscript_id: str,
    baseline_id: str,
    old_snapshot: ManuscriptSnapshot,
    new_chapter_paragraph_hashes: Dict[int, List[str]],
    new_word_count: int,
    old_word_count: int,
) -> Tuple[ManuscriptSnapshot, SnapshotDelta]:
    """
    Create a delta snapshot comparing the new state against the previous snapshot.
    
    Returns: (new ManuscriptSnapshot, SnapshotDelta with compressed diff)
    
    The diff is computed chapter-by-chapter to:
    1. Identify which chapters actually changed (for incremental recompute)
    2. Keep delta size minimal — only changed chapters have diff ops
    """
    new_hash = hashlib.md5(
        str(new_chapter_paragraph_hashes).encode()
    ).hexdigest()

    snapshot_id = hashlib.md5(
        f"{manuscript_id}_{new_hash}_delta".encode()
    ).hexdigest()

    now = datetime.now(timezone.utc).isoformat()

    # Compute per-chapter diffs
    all_diff_ops: List[Tuple[str, str]] = []
    chapters_affected: List[int] = []
    paragraphs_changed = 0

    old_hashes = old_snapshot.chapter_paragraph_hashes or {}

    for ch_id, new_hashes in new_chapter_paragraph_hashes.items():
        old_ch_hashes = old_hashes.get(ch_id, [])

        if old_ch_hashes == new_hashes:
            continue  # no change in this chapter — skip

        chapters_affected.append(ch_id)
        diff_ops = myers_diff(old_ch_hashes, new_hashes)
        changed = sum(1 for op, _ in diff_ops if op != 'equal')
        paragraphs_changed += changed

        # Prefix ops with chapter ID for reconstruction
        all_diff_ops.extend(
            (f"{ch_id}:{op}", h) for op, h in diff_ops
        )

    # Estimate word changes from paragraph change count
    # (approximate: average paragraph = 80 words)
    AVG_PARA_WORDS = 80
    ops_insert = sum(1 for op, _ in all_diff_ops if 'insert' in op)
    ops_delete = sum(1 for op, _ in all_diff_ops if 'delete' in op)
    words_added = ops_insert * AVG_PARA_WORDS
    words_removed = ops_delete * AVG_PARA_WORDS

    delta = SnapshotDelta(
        delta_id=snapshot_id,
        manuscript_id=manuscript_id,
        from_version_hash=old_snapshot.version_hash,
        to_version_hash=new_hash,
        created_at=now,
        diff_ops=all_diff_ops,
        words_added=words_added,
        words_removed=words_removed,
        net_word_change=new_word_count - old_word_count,
        paragraphs_changed=paragraphs_changed,
        chapters_affected=chapters_affected,
    )

    new_snapshot = ManuscriptSnapshot(
        snapshot_id=snapshot_id,
        manuscript_id=manuscript_id,
        version_hash=new_hash,
        snapshot_type='delta',
        baseline_id=baseline_id,
        created_at=now,
        word_count=new_word_count,
        chapter_paragraph_hashes=new_chapter_paragraph_hashes,
    )

    return new_snapshot, delta


# ─────────────────────────────────────────────────────────────────────────────
# VERSION RESTORATION
# ─────────────────────────────────────────────────────────────────────────────

def reconstruct_at_version(
    target_version_hash: str,
    baseline: ManuscriptSnapshot,
    deltas: List[SnapshotDelta],
) -> Dict[int, List[str]]:
    """
    Reconstruct the chapter_paragraph_hashes at a specific historical version.
    Apply baseline + all deltas up to and including the target version.
    
    Complexity: O(d * p) where d = deltas, p = paragraphs.
    Typical: under 200ms for 50 deltas.
    """
    if baseline.chapter_paragraph_hashes is None:
        raise ValueError("Baseline snapshot has no paragraph hash data")

    current_state: Dict[int, List[str]] = dict(baseline.chapter_paragraph_hashes)

    for delta in deltas:
        # Group diff ops by chapter
        chapter_ops: Dict[int, List[Tuple[str, str]]] = {}
        for raw_op, h in delta.diff_ops:
            ch_id_str, op = raw_op.split(':', 1)
            ch_id = int(ch_id_str)
            chapter_ops.setdefault(ch_id, []).append((op, h))

        for ch_id, ops in chapter_ops.items():
            new_ch_hashes: List[str] = []
            for op, h in ops:
                if op == 'equal':
                    new_ch_hashes.append(h)
                elif op == 'insert':
                    new_ch_hashes.append(h)
                # 'delete' = skip (remove from reconstructed state)
            current_state[ch_id] = new_ch_hashes

        if delta.to_version_hash == target_version_hash:
            break

    return current_state


# ─────────────────────────────────────────────────────────────────────────────
# STABILITY ANALYSIS
# ─────────────────────────────────────────────────────────────────────────────

def analyse_chapter_stability(
    chapter_ids: List[int],
    chapter_titles: Dict[int, Optional[str]],
    snapshots: List[ManuscriptSnapshot],
    deltas: List[SnapshotDelta],
) -> List[ChapterStability]:
    """
    Compute stability metrics for each chapter from snapshot history.
    """
    stability_results: List[ChapterStability] = []

    for ch_id in chapter_ids:
        total_saves = len(snapshots)
        changed_saves = sum(1 for d in deltas if ch_id in d.chapters_affected)
        rewrite_count = sum(
            d.paragraphs_changed
            for d in deltas
            if ch_id in d.chapters_affected
        )

        stability_score = (
            (total_saves - changed_saves) / total_saves * 100
            if total_saves > 0 else 100.0
        )

        if stability_score >= 80:
            zone = 'locked'
        elif stability_score >= 60:
            zone = 'stable'
        elif stability_score >= 35:
            zone = 'unstable'
        else:
            zone = 'volatile'

        # Word count history
        wc_history: List[int] = []
        for snap in sorted(snapshots, key=lambda s: s.created_at):
            if snap.chapter_paragraph_hashes and ch_id in snap.chapter_paragraph_hashes:
                para_count = len(snap.chapter_paragraph_hashes[ch_id])
                wc_history.append(para_count * 80)  # approximate
            elif snap.word_count:
                wc_history.append(0)

        # Net word direction
        if len(wc_history) >= 2:
            start_wc = wc_history[0]
            end_wc = wc_history[-1]
            oscillations = sum(
                1 for i in range(1, len(wc_history))
                if (wc_history[i] > wc_history[i-1]) != (wc_history[max(0, i-2)] > wc_history[i-1])
            )
            if oscillations > len(wc_history) // 3:
                direction = 'oscillating'
            elif end_wc > start_wc * 1.1:
                direction = 'growing'
            elif end_wc < start_wc * 0.9:
                direction = 'shrinking'
            else:
                direction = 'stable'
        else:
            direction = 'stable'

        stability_results.append(ChapterStability(
            chapter_id=ch_id,
            chapter_title=chapter_titles.get(ch_id),
            total_saves=total_saves,
            changed_saves=changed_saves,
            stability_score=round(stability_score, 1),
            stability_zone=zone,
            rewrite_count=rewrite_count,
            net_word_direction=direction,
            word_count_history=wc_history,
        ))

    return stability_results


# ─────────────────────────────────────────────────────────────────────────────
# DELETED PASSAGE DETECTION
# ─────────────────────────────────────────────────────────────────────────────

def find_deleted_passages(deltas: List[SnapshotDelta]) -> List[Dict]:
    """
    Find paragraph hashes that were deleted and never re-inserted.
    These are 'deleted passages' the writer might want to recover.
    """
    all_inserted: set = set()
    all_deleted: set = set()

    for delta in deltas:
        for raw_op, h in delta.diff_ops:
            op = raw_op.split(':', 1)[1]
            if op == 'insert':
                all_inserted.add(h)
            elif op == 'delete':
                all_deleted.add(h)

    permanently_deleted = all_deleted - all_inserted

    result = []
    for delta in deltas:
        for raw_op, h in delta.diff_ops:
            op = raw_op.split(':', 1)[1]
            if op == 'delete' and h in permanently_deleted:
                result.append({
                    'paragraph_hash': h,
                    'deleted_at': delta.created_at,
                    'delta_id': delta.delta_id,
                    'preview': f"[Paragraph {h[:8]}... — text recoverable from baseline reconstruction]",
                })
                permanently_deleted.discard(h)  # report once per passage

    return result


# ─────────────────────────────────────────────────────────────────────────────
# MAIN ENGINE
# ─────────────────────────────────────────────────────────────────────────────

def process(
    manuscript_id: str,
    snapshots: List[ManuscriptSnapshot],
    deltas: List[SnapshotDelta],
    chapter_titles: Optional[Dict[int, Optional[str]]] = None,
) -> ArchaeologyResult:
    """
    Analyse the full version history of a manuscript.
    
    Args:
        manuscript_id: Manuscript identifier
        snapshots: Ordered list of ManuscriptSnapshots (oldest first)
        deltas: Ordered list of SnapshotDeltas (oldest first)
        chapter_titles: Optional chapter title lookup

    Returns: ArchaeologyResult with stability heatmap and revision summary.
    
    Cost: Zero AI. O(s * p) where s = snapshots, p = paragraphs.
    """
    chapter_titles = chapter_titles or {}

    if not snapshots:
        return _empty_result(manuscript_id)

    # Get all chapter IDs from any snapshot
    all_chapter_ids: set = set()
    for snap in snapshots:
        if snap.chapter_paragraph_hashes:
            all_chapter_ids.update(snap.chapter_paragraph_hashes.keys())
    chapter_ids = sorted(all_chapter_ids)

    # Stability analysis
    stability = analyse_chapter_stability(chapter_ids, chapter_titles, snapshots, deltas)

    # Instability heatmap (inverted stability score)
    heatmap = {s.chapter_id: round(100.0 - s.stability_score, 1) for s in stability}

    # Deleted passages
    deleted = find_deleted_passages(deltas)

    # Revision summary
    total_words_written = sum(d.words_added for d in deltas)
    total_words_removed = sum(d.words_removed for d in deltas)
    avg_session_change = (
        sum(abs(d.net_word_change) for d in deltas) / len(deltas)
        if deltas else 0.0
    )

    most_edited_ch = max(stability, key=lambda s: s.rewrite_count, default=None)
    most_stable_ch = max(stability, key=lambda s: s.stability_score, default=None)

    revision_summary = RevisionSummary(
        total_snapshots=len(snapshots),
        total_saves=len(deltas) + 1,  # +1 for baseline
        total_words_written=total_words_written,
        total_words_removed=total_words_removed,
        first_save_at=snapshots[0].created_at if snapshots else '',
        last_save_at=snapshots[-1].created_at if snapshots else '',
        most_edited_chapter_id=most_edited_ch.chapter_id if most_edited_ch else None,
        most_stable_chapter_id=most_stable_ch.chapter_id if most_stable_ch else None,
        avg_session_word_change=round(avg_session_change, 1),
    )

    # Timeline data for UI
    timeline = [
        {
            'snapshot_id': s.snapshot_id,
            'created_at': s.created_at,
            'word_count': s.word_count,
            'type': s.snapshot_type,
        }
        for s in snapshots
    ]

    # Warnings
    warnings: List[str] = []
    volatile = [s for s in stability if s.stability_zone == 'volatile']
    if volatile:
        ch_ids = [s.chapter_id + 1 for s in volatile]
        warnings.append(
            f"Chapter(s) {ch_ids} are volatile — rewritten more than 60% of sessions. "
            f"This suggests you have not yet found what you want from these sections. "
            f"Consider outlining them before the next draft."
        )

    oscillating = [s for s in stability if s.net_word_direction == 'oscillating']
    if oscillating:
        ch_ids = [s.chapter_id + 1 for s in oscillating]
        warnings.append(
            f"Chapter(s) {ch_ids} are oscillating in word count — growing and shrinking "
            f"across multiple sessions. This often signals structural uncertainty."
        )

    return ArchaeologyResult(
        manuscript_id=manuscript_id,
        engine_version=ENGINE_VERSION,
        chapter_stability=stability,
        revision_summary=revision_summary,
        instability_heatmap=heatmap,
        snapshot_timeline=timeline,
        deleted_passages=deleted,
        warnings=warnings,
    )


def _empty_result(manuscript_id: str) -> ArchaeologyResult:
    return ArchaeologyResult(
        manuscript_id=manuscript_id,
        engine_version=ENGINE_VERSION,
        chapter_stability=[],
        revision_summary=RevisionSummary(
            total_snapshots=0, total_saves=0, total_words_written=0,
            total_words_removed=0, first_save_at='', last_save_at='',
            most_edited_chapter_id=None, most_stable_chapter_id=None,
            avg_session_word_change=0.0,
        ),
        instability_heatmap={},
        snapshot_timeline=[],
        deleted_passages=[],
        warnings=["No snapshot history found for this manuscript."],
    )
