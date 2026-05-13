"""
imperialx.shared.pipeline_core
================================
Manuscript ingestion, normalisation, tokenisation, and segmentation.
This is the foundation all 9 engines consume. Build it first.
Every stage is a pure function: same input always yields same output.
"""

from __future__ import annotations

import re
import hashlib
import unicodedata
from dataclasses import dataclass, field
from typing import List, Dict, Optional, Tuple, Generator


# ─────────────────────────────────────────────────────────────────────────────
# DATA CONTRACTS
# ─────────────────────────────────────────────────────────────────────────────

@dataclass
class Token:
    text: str           # raw text as it appears
    lower: str          # cleaned, lowercased form
    char_start: int
    char_end: int
    is_word: bool
    is_punct: bool
    sentence_id: int
    paragraph_id: int
    chapter_id: int
    window_id: int = -1

    @property
    def char_count(self) -> int:
        return len(self.lower)


@dataclass
class Sentence:
    id: int
    text: str
    word_count: int
    char_start: int
    char_end: int
    paragraph_id: int
    chapter_id: int
    is_dialogue: bool = False

    @property
    def avg_word_length(self) -> float:
        words = re.findall(r'\b[a-z]+\b', self.text.lower())
        return sum(len(w) for w in words) / len(words) if words else 0.0

    @property
    def punct_count(self) -> Dict[str, int]:
        return {
            'comma': self.text.count(','),
            'emdash': self.text.count('--'),
            'ellipsis': self.text.count('...'),
            'exclamation': self.text.count('!'),
            'question': self.text.count('?'),
            'semicolon': self.text.count(';'),
        }


@dataclass
class Paragraph:
    id: int
    text: str
    sentences: List[Sentence]
    word_count: int
    is_dialogue: bool
    chapter_id: int
    hash: str           # MD5 of paragraph text — used for incremental recompute


@dataclass
class Chapter:
    id: int
    title: Optional[str]
    paragraphs: List[Paragraph]
    word_count: int
    char_start: int
    char_end: int
    paragraph_hashes: List[str] = field(default_factory=list)  # for Archaeology

    @property
    def sentence_count(self) -> int:
        return sum(len(p.sentences) for p in self.paragraphs)

    @property
    def dialogue_ratio(self) -> float:
        dialogue_words = sum(p.word_count for p in self.paragraphs if p.is_dialogue)
        return dialogue_words / self.word_count if self.word_count else 0.0


@dataclass
class Window:
    """500-word sliding window — primary unit for Tension and Entropy scoring."""
    id: int
    word_start: int
    word_end: int
    text: str
    word_count: int
    chapter_id: int
    sentence_ids: List[int] = field(default_factory=list)


@dataclass
class ManuscriptDocument:
    """
    The fully parsed manuscript. All engines receive this as their primary input.
    Constructed once per version_hash — all subsequent calls are cache hits.
    """
    raw_text: str
    normalised_text: str
    version_hash: str           # SHA-256 of normalised text — canonical cache key
    chapters: List[Chapter]
    paragraphs: List[Paragraph]
    sentences: List[Sentence]
    tokens: List[Token]
    windows: List[Window]
    word_count: int
    char_count: int
    metadata: Dict = field(default_factory=dict)

    @property
    def chapter_count(self) -> int:
        return len(self.chapters)

    @property
    def avg_sentence_length(self) -> float:
        lengths = [s.word_count for s in self.sentences if s.word_count > 0]
        return sum(lengths) / len(lengths) if lengths else 0.0

    def get_chapter_text(self, chapter_id: int) -> str:
        for ch in self.chapters:
            if ch.id == chapter_id:
                return '\n\n'.join(p.text for p in ch.paragraphs)
        return ''

    def get_sentences_for_chapter(self, chapter_id: int) -> List[Sentence]:
        return [s for s in self.sentences if s.chapter_id == chapter_id]

    def get_windows_for_chapter(self, chapter_id: int) -> List[Window]:
        return [w for w in self.windows if w.chapter_id == chapter_id]


# ─────────────────────────────────────────────────────────────────────────────
# CONSTANTS
# ─────────────────────────────────────────────────────────────────────────────

ABBREVIATIONS = {
    'mr', 'mrs', 'ms', 'dr', 'prof', 'sr', 'jr', 'vs', 'etc', 'al',
    'e.g', 'i.e', 'vol', 'rev', 'gen', 'sgt', 'cpl', 'pvt', 'fig',
    'jan', 'feb', 'mar', 'apr', 'jun', 'jul', 'aug', 'sep', 'oct',
    'nov', 'dec', 'lt', 'col', 'capt', 'ave', 'blvd', 'st', 'dept',
}

CHAPTER_PATTERNS = re.compile(
    r'^(?:'
    r'chapter\s+(?:\d+|[ivxlcdmIVXLCDM]+|one|two|three|four|five|six|'
    r'seven|eight|nine|ten|eleven|twelve)'
    r'|part\s+(?:\d+|[ivxlcdm]+)'
    r'|prologue|epilogue|interlude|coda'
    r'|\d+\.'
    r')',
    re.IGNORECASE,
)

SCENE_SEPARATOR = re.compile(r'^[*\-=#~]{3,}\s*$')
MARKDOWN_HEADING = re.compile(r'^#{1,3}\s+')


# ─────────────────────────────────────────────────────────────────────────────
# NORMALISER
# ─────────────────────────────────────────────────────────────────────────────

def normalise(text: str) -> str:
    """
    Convert raw manuscript text to canonical UTF-8 form.
    Idempotent — running twice produces the same result.
    """
    text = unicodedata.normalize('NFC', text)

    # Smart quotes → straight
    text = text.replace('\u2018', "'").replace('\u2019', "'")
    text = text.replace('\u201C', '"').replace('\u201D', '"')
    text = text.replace('\u201A', "'").replace('\u201E', '"')

    # Dash normalisation — preserve as double-hyphen (em-dash proxy)
    text = text.replace('\u2014', '--').replace('\u2013', '--')
    text = text.replace('\u2012', '--').replace('\u2015', '--')

    # Ellipsis
    text = text.replace('\u2026', '...')

    # Non-breaking and zero-width spaces
    text = text.replace('\u00A0', ' ').replace('\u200B', '')
    text = text.replace('\uFEFF', '')  # BOM

    # Line endings
    text = text.replace('\r\n', '\n').replace('\r', '\n')

    # Collapse 3+ newlines to 2 (paragraph boundary preserved)
    text = re.sub(r'\n{3,}', '\n\n', text)

    # Trim trailing whitespace per line
    text = '\n'.join(line.rstrip() for line in text.split('\n'))

    return text.strip()


def compute_hash(text: str) -> str:
    """SHA-256 of normalised text — the canonical version fingerprint."""
    return hashlib.sha256(text.encode('utf-8')).hexdigest()


# ─────────────────────────────────────────────────────────────────────────────
# CHAPTER DETECTOR
# ─────────────────────────────────────────────────────────────────────────────

def detect_chapter_boundaries(text: str) -> List[Tuple[int, Optional[str], str]]:
    """
    Returns list of (chapter_id, title_or_None, chapter_content).
    Heuristic: line matching CHAPTER_PATTERNS or MARKDOWN_HEADING is a boundary.
    Falls back to single chapter if no boundaries detected.
    """
    lines = text.split('\n')
    chapters: List[Tuple[int, Optional[str], str]] = []
    current_lines: List[str] = []
    current_title: Optional[str] = None
    chapter_id = 0

    def flush(title: Optional[str], lines_: List[str], cid: int) -> Optional[Tuple]:
        content = '\n'.join(lines_).strip()
        if len(content.split()) >= 10:  # minimum 10 words to be a real chapter
            return (cid, title, content)
        return None

    for line in lines:
        stripped = line.strip()
        is_boundary = (
            (CHAPTER_PATTERNS.match(stripped) and len(stripped) < 120)
            or MARKDOWN_HEADING.match(stripped)
            or (SCENE_SEPARATOR.match(stripped) and current_lines)
        )

        if is_boundary:
            result = flush(current_title, current_lines, chapter_id)
            if result:
                chapters.append(result)
                chapter_id += 1
            current_title = stripped if not SCENE_SEPARATOR.match(stripped) else None
            current_lines = []
        else:
            current_lines.append(line)

    # Final chapter
    result = flush(current_title, current_lines, chapter_id)
    if result:
        chapters.append(result)

    if not chapters:
        chapters = [(0, None, text.strip())]

    return chapters


# ─────────────────────────────────────────────────────────────────────────────
# SENTENCE SPLITTER
# ─────────────────────────────────────────────────────────────────────────────

def split_sentences(
    text: str,
    para_id: int,
    chapter_id: int,
    base_sent_id: int = 0,
) -> List[Sentence]:
    """
    Rule-based sentence splitter.
    Handles abbreviations, decimal numbers, ellipses, and dialogue.
    No ML — deterministic and fast.
    """
    # Protect abbreviations from triggering splits
    protected = text
    for abbr in ABBREVIATIONS:
        protected = re.sub(
            r'(?<!\w)' + re.escape(abbr) + r'\.',
            abbr + '<DOT>',
            protected,
            flags=re.IGNORECASE
        )
    # Protect decimal numbers: 3.14 → 3<DOT>14
    protected = re.sub(r'(\d+)\.(\d+)', r'\1<DOT>\2', protected)
    # Protect ellipsis
    protected = protected.replace('...', '<ELLIPSIS>')

    # Split: end of sentence is [.!?] followed by space + uppercase (or quote)
    raw_sents = re.split(
        r'(?<=[.!?])\s+(?=[A-Z"\u2018\u201C])|(?<=<ELLIPSIS>)\s+(?=[A-Z])',
        protected
    )

    sentences: List[Sentence] = []
    char_cursor = 0

    for i, raw in enumerate(raw_sents):
        restored = raw.replace('<DOT>', '.').replace('<ELLIPSIS>', '...')
        restored = restored.strip()
        if not restored:
            continue

        words = re.findall(r'\b\w+\b', restored)
        if not words:
            continue

        is_dialogue = restored.startswith('"') or restored.startswith("'")

        sent = Sentence(
            id=base_sent_id + i,
            text=restored,
            word_count=len(words),
            char_start=char_cursor,
            char_end=char_cursor + len(restored),
            paragraph_id=para_id,
            chapter_id=chapter_id,
            is_dialogue=is_dialogue,
        )
        sentences.append(sent)

        # Advance cursor — account for the whitespace between sentences
        char_cursor += len(raw) + 1

    return sentences


# ─────────────────────────────────────────────────────────────────────────────
# TOKENISER
# ─────────────────────────────────────────────────────────────────────────────

def tokenize(sentences: List[Sentence]) -> List[Token]:
    """
    Word-level tokeniser.
    Each token carries full positional metadata for all downstream engines.
    """
    tokens: List[Token] = []

    for sent in sentences:
        for match in re.finditer(r'\S+', sent.text):
            raw_token = match.group()
            # Strip leading/trailing punctuation to get the clean word
            clean = re.sub(r'^[^\w]+|[^\w]+$', '', raw_token)
            is_word = bool(clean) and bool(re.search(r'[a-zA-Z0-9]', clean))
            is_punct = not is_word and bool(re.match(r'^[^\w\s]+$', raw_token))

            tok = Token(
                text=raw_token,
                lower=clean.lower() if clean else raw_token.lower(),
                char_start=sent.char_start + match.start(),
                char_end=sent.char_start + match.end(),
                is_word=is_word,
                is_punct=is_punct,
                sentence_id=sent.id,
                paragraph_id=sent.paragraph_id,
                chapter_id=sent.chapter_id,
            )
            tokens.append(tok)

    return tokens


# ─────────────────────────────────────────────────────────────────────────────
# WINDOW BUILDER
# ─────────────────────────────────────────────────────────────────────────────

def build_windows(
    tokens: List[Token],
    sentences: List[Sentence],
    window_size: int = 500,
    overlap: int = 50,
) -> List[Window]:
    """
    Sliding 500-word windows with 50-word overlap.
    Windows are the primary unit for Tension Waveform and Entropy Scanner.
    Uses a generator-style build to avoid holding all windows in memory.
    """
    word_tokens = [t for t in tokens if t.is_word]
    sentence_map: Dict[int, Sentence] = {s.id: s for s in sentences}
    windows: List[Window] = []
    i = 0
    win_id = 0

    while i < len(word_tokens):
        window_tokens = word_tokens[i: i + window_size]
        if not window_tokens:
            break

        # Determine dominant chapter (most common chapter_id in window)
        chapter_ids = [t.chapter_id for t in window_tokens]
        dominant_chapter = max(set(chapter_ids), key=chapter_ids.count)

        sent_ids = list(dict.fromkeys(t.sentence_id for t in window_tokens))

        # Reconstruct window text from token texts
        window_text_parts = []
        prev_sent = -1
        for t in window_tokens:
            if t.sentence_id != prev_sent:
                if window_text_parts:
                    window_text_parts.append(' ')
                prev_sent = t.sentence_id
            window_text_parts.append(t.text)
        window_text = ' '.join(window_text_parts)

        win = Window(
            id=win_id,
            word_start=i,
            word_end=min(i + window_size, len(word_tokens)),
            text=window_text,
            word_count=len(window_tokens),
            chapter_id=dominant_chapter,
            sentence_ids=sent_ids,
        )

        # Tag each token with its window id
        for t in window_tokens:
            if t.window_id == -1:  # only assign if not already in an earlier window
                t.window_id = win_id

        windows.append(win)
        i += window_size - overlap
        win_id += 1

    return windows


# ─────────────────────────────────────────────────────────────────────────────
# PARAGRAPH PARSER
# ─────────────────────────────────────────────────────────────────────────────

def parse_paragraphs(
    chapter_text: str,
    chapter_id: int,
    base_para_id: int,
    base_sent_id: int,
) -> Tuple[List[Paragraph], List[Sentence], int, int]:
    """
    Parse a chapter's text into paragraphs and sentences.
    Returns (paragraphs, sentences, next_para_id, next_sent_id).
    """
    raw_paragraphs = [p.strip() for p in re.split(r'\n\n+', chapter_text) if p.strip()]
    paragraphs: List[Paragraph] = []
    all_sentences: List[Sentence] = []

    para_id = base_para_id
    sent_id = base_sent_id

    for raw_para in raw_paragraphs:
        is_dialogue = raw_para.lstrip().startswith('"') or raw_para.lstrip().startswith("'")
        para_hash = hashlib.md5(raw_para.encode('utf-8')).hexdigest()

        sentences = split_sentences(raw_para, para_id, chapter_id, sent_id)
        word_count = sum(s.word_count for s in sentences)

        para = Paragraph(
            id=para_id,
            text=raw_para,
            sentences=sentences,
            word_count=word_count,
            is_dialogue=is_dialogue,
            chapter_id=chapter_id,
            hash=para_hash,
        )
        paragraphs.append(para)
        all_sentences.extend(sentences)

        para_id += 1
        sent_id += len(sentences)

    return paragraphs, all_sentences, para_id, sent_id


# ─────────────────────────────────────────────────────────────────────────────
# MAIN PARSER
# ─────────────────────────────────────────────────────────────────────────────

def parse(raw_text: str, metadata: Optional[Dict] = None) -> ManuscriptDocument:
    """
    Full manuscript parse pipeline.
    Entry point for all analysis engines.
    
    Complexity: O(n) where n = character count.
    Performance target: < 1 second for 100k word manuscript.
    """
    normalised = normalise(raw_text)
    version_hash = compute_hash(normalised)
    chapter_data = detect_chapter_boundaries(normalised)

    all_chapters: List[Chapter] = []
    all_paragraphs: List[Paragraph] = []
    all_sentences: List[Sentence] = []

    para_id = 0
    sent_id = 0
    char_cursor = 0

    for ch_id, ch_title, ch_content in chapter_data:
        ch_char_start = normalised.find(ch_content, char_cursor)
        ch_char_start = max(ch_char_start, char_cursor)

        paragraphs, sentences, para_id, sent_id = parse_paragraphs(
            ch_content, ch_id, para_id, sent_id
        )

        chapter = Chapter(
            id=ch_id,
            title=ch_title,
            paragraphs=paragraphs,
            word_count=sum(p.word_count for p in paragraphs),
            char_start=ch_char_start,
            char_end=ch_char_start + len(ch_content),
            paragraph_hashes=[p.hash for p in paragraphs],
        )
        all_chapters.append(chapter)
        all_paragraphs.extend(paragraphs)
        all_sentences.extend(sentences)
        char_cursor = ch_char_start + len(ch_content)

    all_tokens = tokenize(all_sentences)
    all_windows = build_windows(all_tokens, all_sentences)
    total_words = sum(1 for t in all_tokens if t.is_word)

    return ManuscriptDocument(
        raw_text=raw_text,
        normalised_text=normalised,
        version_hash=version_hash,
        chapters=all_chapters,
        paragraphs=all_paragraphs,
        sentences=all_sentences,
        tokens=all_tokens,
        windows=all_windows,
        word_count=total_words,
        char_count=len(normalised),
        metadata=metadata or {},
    )
