"""
analyzer.py
===========
Manuscript health and style analysis engine.

Computes readability scores, pacing metrics, style diagnostics, and
structural analysis using pure Python — no API calls, no tokens consumed.

These are the metrics that professional editorial services charge $200–800
to produce manually. This module generates them instantly.
"""

import re
import math
from typing import List, Dict, Tuple, Optional
from dataclasses import dataclass, field
from collections import Counter

from parser import ParsedParagraph, PARA_BODY, PARA_CHAPTER, PARA_SCENE_BREAK


# ── Result Types ──────────────────────────────────────────────────────────────

@dataclass
class ReadabilityScores:
    flesch_ease:        float   # 0–100. Higher = easier. Target for fiction: 60–80
    flesch_kincaid:     float   # Grade level. Target for commercial fiction: 5–9
    gunning_fog:        float   # Grade level. Target: 8–12
    avg_sentence_words: float
    avg_word_syllables: float
    interpretation:     str     # Human-readable verdict


@dataclass
class StyleMetrics:
    dialogue_pct:           float   # % of body text that is dialogue
    adverb_density:         float   # Adverbs per 1,000 words
    passive_voice_pct:      float   # % of sentences with passive construction
    avg_paragraph_words:    float
    sentence_length_variance: float # Standard deviation of sentence lengths
    most_frequent_words:    List[Tuple[str, int]]   # Top overused content words
    repeated_phrases:       List[Tuple[str, int]]   # Repeated 3-word phrases


@dataclass
class PacingProfile:
    chapter_word_counts:    List[Tuple[str, int]]   # (chapter title, word count)
    chapter_avg:            float
    chapter_std_dev:        float
    longest_chapter:        Tuple[str, int]
    shortest_chapter:       Tuple[str, int]
    pacing_verdict:         str
    scene_break_frequency:  float    # Scene breaks per chapter on average


@dataclass
class ManuscriptReport:
    # Counts
    total_words:         int
    total_sentences:     int
    total_paragraphs:    int
    total_chapters:      int
    unique_words:        int
    lexical_diversity:   float   # unique_words / total_words

    # Scores
    readability:         ReadabilityScores
    style:               StyleMetrics
    pacing:              PacingProfile

    # Issues flagged for author attention
    editorial_flags:     List[str]


# ── Common Words to Exclude from Frequency Analysis ──────────────────────────
_STOP_WORDS = set("""
a about above after again against all am an and any are aren't as at be because
been being below between both but by can't cannot could couldn't did didn't do
does doesn't doing don't down during each few for from further get got had hadn't
has hasn't have haven't having he he'd he'll he's her here here's hers herself
him himself his how how's i i'd i'll i'm i've if in into is isn't it it's its
itself let's me more most mustn't my myself no nor not of off on once only or
other ought our ours ourselves out over own same shan't she she'd she'll she's
should shouldn't so some such than that that's the their theirs them themselves
then there there's these they they'd they'll they're they've this those through
to too under until up very was wasn't we we'd we'll we're we've were weren't what
what's when when's where where's which while who who's whom why why's will with
won't would wouldn't you you'd you'll you're you've your yours yourself yourselves
said had just like back now still even though always never thought felt knew
went came looked turned came went got took made saw told asked seemed felt
""".split())

# ── Passive voice indicators ──────────────────────────────────────────────────
_PASSIVE_MARKERS = re.compile(
    r'\b(was|were|is|are|been|being|be)\s+'
    r'(\w+ed|built|brought|bought|caught|dealt|felt|found|fought|got|'
    r'held|heard|kept|known|led|left|lost|made|meant|met|paid|said|sent|'
    r'set|shown|shut|seen|taken|taught|told|thought|understood|worn|won)\b',
    re.IGNORECASE
)


# ── Main Analyser Class ───────────────────────────────────────────────────────

class ManuscriptAnalyzer:
    """
    Analyses a list of ParsedParagraph objects and produces a ManuscriptReport.

    Usage:
        analyzer = ManuscriptAnalyzer()
        report   = analyzer.analyse(parsed_paragraphs)
    """

    def analyse(self, paragraphs: List[ParsedParagraph]) -> ManuscriptReport:
        body_paras    = [p for p in paragraphs if p.ptype == PARA_BODY and p.cleaned.strip()]
        chapter_paras = [p for p in paragraphs if p.ptype == PARA_CHAPTER]
        scene_paras   = [p for p in paragraphs if p.ptype == PARA_SCENE_BREAK]

        full_body_text = " ".join(p.cleaned for p in body_paras)
        all_sentences  = self._split_sentences(full_body_text)
        all_words      = self._tokenize_words(full_body_text)

        total_words    = len(all_words)
        unique_words   = len(set(w.lower() for w in all_words))
        lexical_div    = unique_words / total_words if total_words else 0

        readability    = self._compute_readability(all_sentences, all_words)
        style          = self._compute_style(body_paras, all_sentences, all_words)
        pacing         = self._compute_pacing(paragraphs, chapter_paras, scene_paras)
        flags          = self._editorial_flags(readability, style, pacing, total_words)

        return ManuscriptReport(
            total_words=total_words,
            total_sentences=len(all_sentences),
            total_paragraphs=len(body_paras),
            total_chapters=len(chapter_paras),
            unique_words=unique_words,
            lexical_diversity=round(lexical_div, 3),
            readability=readability,
            style=style,
            pacing=pacing,
            editorial_flags=flags,
        )

    # ── Readability ───────────────────────────────────────────────────────────

    def _compute_readability(
        self, sentences: List[str], words: List[str]
    ) -> ReadabilityScores:
        if not sentences or not words:
            return ReadabilityScores(0, 0, 0, 0, 0, "Insufficient text for analysis.")

        n_sentences = len(sentences)
        n_words     = len(words)
        n_syllables = sum(self._count_syllables(w) for w in words)
        complex_words = sum(1 for w in words if self._count_syllables(w) >= 3)

        avg_sent_len = n_words / n_sentences
        avg_syllables = n_syllables / n_words

        # Flesch Reading Ease
        flesch = 206.835 - (1.015 * avg_sent_len) - (84.6 * avg_syllables)
        flesch = max(0.0, min(100.0, flesch))

        # Flesch-Kincaid Grade Level
        fk = (0.39 * avg_sent_len) + (11.8 * avg_syllables) - 15.59
        fk = max(0.0, fk)

        # Gunning Fog Index
        fog = 0.4 * (avg_sent_len + 100 * (complex_words / n_words))

        # Interpretation
        if flesch >= 70:
            verdict = "Very readable — accessible to a wide general audience."
        elif flesch >= 60:
            verdict = "Readable — appropriate for commercial fiction."
        elif flesch >= 50:
            verdict = "Moderate difficulty — suitable for literary fiction."
        elif flesch >= 30:
            verdict = "Difficult — may challenge general readers. Consider simplifying."
        else:
            verdict = "Very difficult — academic or specialist level. Likely too complex for fiction."

        return ReadabilityScores(
            flesch_ease=round(flesch, 1),
            flesch_kincaid=round(fk, 1),
            gunning_fog=round(fog, 1),
            avg_sentence_words=round(avg_sent_len, 1),
            avg_word_syllables=round(avg_syllables, 2),
            interpretation=verdict,
        )

    def _count_syllables(self, word: str) -> int:
        """Estimates syllable count using the CMU/vowel-run method."""
        word = word.lower().strip(".,!?;:\"'")
        if not word:
            return 0
        vowels = "aeiouy"
        count = 0
        prev_vowel = False
        for ch in word:
            is_vowel = ch in vowels
            if is_vowel and not prev_vowel:
                count += 1
            prev_vowel = is_vowel
        if word.endswith("e") and count > 1:
            count -= 1
        return max(1, count)

    # ── Style Metrics ─────────────────────────────────────────────────────────

    def _compute_style(
        self,
        body_paras: List[ParsedParagraph],
        sentences: List[str],
        words: List[str],
    ) -> StyleMetrics:

        # Dialogue percentage
        dialogue_chars = sum(
            len(p.cleaned) for p in body_paras
            if p.cleaned.strip().startswith(("\u201C", '"'))
        )
        total_chars = sum(len(p.cleaned) for p in body_paras) or 1
        dialogue_pct = (dialogue_chars / total_chars) * 100

        # Adverb density (words ending in -ly, excluding common non-adverbs)
        _non_adverb_ly = {"only", "early", "family", "likely", "lonely", "lovely",
                          "elderly", "friendly", "lively", "ugly", "silly", "holy"}
        adverbs = [
            w for w in words
            if w.lower().endswith("ly") and w.lower() not in _non_adverb_ly and len(w) > 4
        ]
        adverb_density = (len(adverbs) / len(words) * 1000) if words else 0

        # Passive voice
        passive_count = sum(
            1 for s in sentences if _PASSIVE_MARKERS.search(s)
        )
        passive_pct = (passive_count / len(sentences) * 100) if sentences else 0

        # Paragraph length
        para_lengths = [len(p.cleaned.split()) for p in body_paras if p.cleaned.strip()]
        avg_para = sum(para_lengths) / len(para_lengths) if para_lengths else 0

        # Sentence length variance
        sent_lens = [len(s.split()) for s in sentences if s.strip()]
        if len(sent_lens) > 1:
            mean = sum(sent_lens) / len(sent_lens)
            variance = sum((l - mean) ** 2 for l in sent_lens) / len(sent_lens)
            std_dev = math.sqrt(variance)
        else:
            std_dev = 0

        # Most frequent content words (excluding stop words)
        content_words = [
            w.lower() for w in words
            if w.lower() not in _STOP_WORDS and len(w) > 3 and w.isalpha()
        ]
        word_freq = Counter(content_words).most_common(20)

        # Repeated 3-word phrases
        trigrams = [
            " ".join(words[i:i+3]).lower()
            for i in range(len(words) - 2)
            if all(w.isalpha() for w in words[i:i+3])
        ]
        phrase_freq = [
            (phrase, count)
            for phrase, count in Counter(trigrams).most_common(15)
            if count >= 3 and not all(w in _STOP_WORDS for w in phrase.split())
        ]

        return StyleMetrics(
            dialogue_pct=round(dialogue_pct, 1),
            adverb_density=round(adverb_density, 1),
            passive_voice_pct=round(passive_pct, 1),
            avg_paragraph_words=round(avg_para, 1),
            sentence_length_variance=round(std_dev, 1),
            most_frequent_words=word_freq[:15],
            repeated_phrases=phrase_freq[:10],
        )

    # ── Pacing ────────────────────────────────────────────────────────────────

    def _compute_pacing(
        self,
        all_paras: List[ParsedParagraph],
        chapters: List[ParsedParagraph],
        scene_breaks: List[ParsedParagraph],
    ) -> PacingProfile:
        if not chapters:
            # No chapters — treat entire manuscript as one chapter
            total = sum(len(p.cleaned.split()) for p in all_paras if p.ptype == PARA_BODY)
            return PacingProfile(
                chapter_word_counts=[("Full Manuscript", total)],
                chapter_avg=float(total),
                chapter_std_dev=0.0,
                longest_chapter=("Full Manuscript", total),
                shortest_chapter=("Full Manuscript", total),
                pacing_verdict="No chapter headings detected — pacing analysis requires chapters.",
                scene_break_frequency=len(scene_breaks),
            )

        # Assign each paragraph to a chapter
        chapter_wc: List[Tuple[str, int]] = []
        current_title = chapters[0].cleaned if chapters else "Prologue"
        current_count = 0
        chapter_idx   = 0
        chapter_scene_breaks: List[int] = []
        current_breaks = 0

        for para in all_paras:
            if para.ptype == PARA_CHAPTER:
                if chapter_idx > 0:
                    chapter_wc.append((current_title, current_count))
                    chapter_scene_breaks.append(current_breaks)
                current_title = para.cleaned
                current_count = 0
                current_breaks = 0
                chapter_idx += 1
            elif para.ptype == PARA_BODY:
                current_count += len(para.cleaned.split())
            elif para.ptype == PARA_SCENE_BREAK:
                current_breaks += 1

        if current_count > 0 or chapter_idx > 0:
            chapter_wc.append((current_title, current_count))
            chapter_scene_breaks.append(current_breaks)

        if not chapter_wc:
            return PacingProfile([], 0, 0, ("", 0), ("", 0), "Insufficient data.", 0)

        counts    = [wc for _, wc in chapter_wc]
        avg       = sum(counts) / len(counts)
        variance  = sum((c - avg) ** 2 for c in counts) / len(counts)
        std_dev   = math.sqrt(variance)
        longest   = max(chapter_wc, key=lambda x: x[1])
        shortest  = min(chapter_wc, key=lambda x: x[1])

        cv = (std_dev / avg) if avg else 0   # Coefficient of variation
        if cv < 0.20:
            verdict = "Very consistent pacing — chapters are uniform in length."
        elif cv < 0.40:
            verdict = "Good pacing variation — natural rhythm between chapters."
        elif cv < 0.60:
            verdict = "Noticeable pacing variation — some chapters may feel rushed or slow."
        else:
            verdict = (
                f"High pacing variance — {shortest[0]} ({shortest[1]:,} words) is dramatically "
                f"shorter than {longest[0]} ({longest[1]:,} words). Review chapter structure."
            )

        avg_scene_breaks = (
            sum(chapter_scene_breaks) / len(chapter_scene_breaks)
            if chapter_scene_breaks else 0
        )

        return PacingProfile(
            chapter_word_counts=chapter_wc,
            chapter_avg=round(avg, 0),
            chapter_std_dev=round(std_dev, 0),
            longest_chapter=longest,
            shortest_chapter=shortest,
            pacing_verdict=verdict,
            scene_break_frequency=round(avg_scene_breaks, 1),
        )

    # ── Editorial Flags ───────────────────────────────────────────────────────

    def _editorial_flags(
        self,
        r: ReadabilityScores,
        s: StyleMetrics,
        p: PacingProfile,
        word_count: int,
    ) -> List[str]:
        """
        Generates specific, actionable editorial flags — the kind a development
        editor would raise in a manuscript assessment letter.
        """
        flags = []

        if r.flesch_ease < 50:
            flags.append(
                f"Readability is low (Flesch score: {r.flesch_ease}). Sentences may be "
                f"too long or vocabulary too complex for commercial fiction. "
                f"Target 60–80 for broad audience appeal."
            )
        if r.avg_sentence_words > 22:
            flags.append(
                f"Average sentence length is {r.avg_sentence_words} words — above the "
                f"recommended maximum of 20 for commercial fiction. Long sentences "
                f"reduce readability and slow narrative pace."
            )
        if r.avg_sentence_words < 10:
            flags.append(
                f"Average sentence length is only {r.avg_sentence_words} words. "
                f"While short sentences create pace, a consistently low average "
                f"can feel choppy and prevent emotional depth."
            )
        if s.sentence_length_variance < 4:
            flags.append(
                "Sentence length variance is low — your sentences are very uniform in length. "
                "Professional prose varies sentence length rhythmically. "
                "Mix short punchy sentences with longer, more flowing ones."
            )
        if s.adverb_density > 8:
            flags.append(
                f"Adverb density is high ({s.adverb_density:.1f} per 1,000 words). "
                f"The editorial standard is under 5 per 1,000 words. "
                f"Replace adverb+verb combinations with stronger, more specific verbs "
                f"(e.g. 'ran quickly' → 'sprinted')."
            )
        if s.passive_voice_pct > 15:
            flags.append(
                f"Passive voice appears in {s.passive_voice_pct:.1f}% of sentences — "
                f"above the recommended 10% ceiling for commercial fiction. "
                f"Passive constructions reduce immediacy and character agency."
            )
        if s.dialogue_pct < 10 and word_count > 20_000:
            flags.append(
                f"Dialogue accounts for only {s.dialogue_pct:.1f}% of the text. "
                f"Most commercial fiction runs 30–50% dialogue. "
                f"Low dialogue can indicate over-narration or under-dramatisation."
            )
        if s.dialogue_pct > 70:
            flags.append(
                f"Dialogue accounts for {s.dialogue_pct:.1f}% of the text — unusually high. "
                f"Consider whether scenes are dramatised at the expense of interiority, "
                f"setting, and narrative texture."
            )
        if p.chapter_std_dev > p.chapter_avg * 0.5 and len(p.chapter_word_counts) > 3:
            flags.append(
                f"Chapter length varies dramatically (shortest: {p.shortest_chapter[1]:,} words, "
                f"longest: {p.longest_chapter[1]:,} words). Significant imbalance can disrupt "
                f"pacing and signal structural issues."
            )
        if p.chapter_avg > 6_000:
            flags.append(
                f"Average chapter length is {p.chapter_avg:,.0f} words — on the long side "
                f"for commercial fiction (ideal: 2,500–4,500). Consider whether some "
                f"chapters would benefit from scene breaks or splitting."
            )
        if p.chapter_avg < 1_000 and len(p.chapter_word_counts) > 5:
            flags.append(
                f"Average chapter length is only {p.chapter_avg:,.0f} words. Very short chapters "
                f"can feel fragmented. Unless this is a deliberate stylistic choice "
                f"(as in thriller/crime fiction), consider consolidating."
            )
        if s.repeated_phrases:
            top = s.repeated_phrases[0]
            flags.append(
                f"Repeated phrase detected: \"{top[0]}\" appears {top[1]} times. "
                f"Repetitive phrasing is a common oversight and is always caught by "
                f"editors. Review and vary."
            )

        return flags

    # ── Utilities ─────────────────────────────────────────────────────────────

    def _split_sentences(self, text: str) -> List[str]:
        """Splits text into sentences using punctuation boundaries."""
        raw = re.split(r"(?<=[.!?])\s+", text)
        return [s.strip() for s in raw if s.strip() and len(s.split()) >= 2]

    def _tokenize_words(self, text: str) -> List[str]:
        """Returns a list of words, stripping punctuation."""
        return re.findall(r"\b[a-zA-Z']+\b", text)
