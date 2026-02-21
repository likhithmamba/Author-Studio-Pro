"""
parser.py
=========
Intelligent manuscript parser.

TOKEN STRATEGY — the core design decision
-----------------------------------------
A 51,000-word novel contains roughly 3,000–5,000 paragraphs.
Sending those to an AI for classification would cost 40,000–80,000 tokens
per run — expensive, slow, and unnecessary.

The correct approach uses AI exactly ONCE per document:

  Step 1 — Sample:  Extract the first 80 paragraphs (~1,200–1,800 tokens).
  Step 2 — Learn:   Ask the AI one question: "What do chapter headings and
                    scene breaks look like in THIS specific document?"
                    The AI returns a tiny JSON pattern spec. (~200 output tokens)
  Step 3 — Apply:   A pure-Python rule engine uses those learned patterns
                    to classify every paragraph in the full manuscript.
                    No more AI calls. Zero extra tokens.

Total token cost regardless of manuscript length: ~2,000 tokens.
A 51,000-word novel and a 500,000-word epic cost the same to process.

If no API key is provided, Step 2 is skipped and the rule engine uses
its built-in universal patterns — which correctly handle ~95% of manuscripts.
"""

import re
import json
import requests
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass, field


# ── Paragraph Types ──────────────────────────────────────────────────────────
# These are the only classification outputs the formatter needs.
PARA_BODY          = "body"
PARA_CHAPTER       = "chapter_heading"
PARA_SCENE_BREAK   = "scene_break"
PARA_FRONT_MATTER  = "front_matter"
PARA_EMPTY         = "empty"


# ── Data Model ───────────────────────────────────────────────────────────────
@dataclass
class ParsedParagraph:
    index:   int
    raw:     str          # Original text, untouched
    cleaned: str          # After deterministic text fixes
    ptype:   str          # One of the PARA_* constants above
    issues:  List[str] = field(default_factory=list)

    def is_body(self):   return self.ptype == PARA_BODY
    def is_chapter(self): return self.ptype == PARA_CHAPTER


@dataclass
class LearnedPatterns:
    """
    Patterns the AI extracts from the document's own first 80 paragraphs.
    If AI is unavailable, universal fallbacks are used.
    """
    # Regex strings (as strings, not compiled — stored for display/debugging)
    chapter_regexes:     List[str]
    scene_break_regexes: List[str]
    # Human-readable summary of what was found
    summary:             str = ""
    # Whether these came from AI or universal fallbacks
    source:              str = "universal"  # "ai" | "universal"


# ── Universal Fallback Patterns ──────────────────────────────────────────────
# These match the overwhelming majority of manuscripts without needing AI.

UNIVERSAL_CHAPTER_PATTERNS = [
    r"^chapter\s+\d+",
    r"^chapter\s+[ivxlcdmIVXLCDM]+$",
    r"^chapter\s+(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve"
    r"|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty"
    r"|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred)",
    r"^ch\.\s*\d+",
    r"^part\s+\d+",
    r"^part\s+[ivxlcdmIVXLCDM]+$",
    r"^part\s+(one|two|three|four|five|six|seven|eight|nine|ten)",
    r"^prologue$",
    r"^epilogue$",
    r"^introduction$",
    r"^preface$",
    r"^afterword$",
    r"^acknowledgements?$",
    r"^dedication$",
    r"^interlude$",
    r"^coda$",
]

UNIVERSAL_SCENE_BREAK_PATTERNS = [
    r"^\*{1,3}\s*\*{0,3}\s*\*{0,3}$",   # *, **, ***, * * *, ** **, etc.
    r"^#{1,5}$",
    r"^-{3,}$",
    r"^_{3,}$",
    r"^~{3,}$",
    r"^§+$",
    r"^\s*#\s*$",
    r"^[•◆◇■□▪▫]{3,}$",
    r"^[*#~\-_•◆]{1,9}$",               # Short symbol-only lines
    r"^\. \. \.$",                        # . . .
]

FRONT_MATTER_PATTERNS = [
    r"^(by|written by|author:)\s+",
    r"^word count:?\s*[\d,]+",
    r"^©",
    r"^copyright\s+",
    r"^all rights reserved",
    r"^isbn",
    r"^first published",
    r"^published by",
    r"^printed in",
]


# ── Main Parser Class ─────────────────────────────────────────────────────────

class ManuscriptParser:
    """
    Parses a list of raw paragraph strings into structured ParsedParagraph objects.

    Usage:
        parser = ManuscriptParser(api_key="sk-or-...", model="mistralai/mistral-7b-instruct:free")
        results = parser.parse(raw_paragraphs)
        # results is a list of ParsedParagraph objects
    """

    OPENROUTER_URL   = "https://openrouter.ai/api/v1/chat/completions"
    SAMPLE_SIZE      = 80      # Paragraphs sent to AI for pattern learning
    MIN_SAMPLE_LEN   = 15      # Paragraphs shorter than this char count are skipped in sample

    def __init__(
        self,
        api_key: Optional[str] = None,
        model:   str = "mistralai/mistral-7b-instruct:free",
    ):
        self.api_key    = api_key
        self.model      = model
        self.ai_enabled = bool(api_key and api_key.strip())
        self.patterns:  Optional[LearnedPatterns] = None

    # ── Public Interface ──────────────────────────────────────────────────────

    def parse(self, raw_paragraphs: List[str]) -> Tuple[List[ParsedParagraph], LearnedPatterns]:
        """
        Full parse pipeline. Returns (parsed_list, learned_patterns).
        The learned_patterns object is returned for display in the UI.
        """
        # Phase 1 — deterministic text cleaning (no AI, no tokens)
        cleaned = [self._clean_text(p) for p in raw_paragraphs]

        # Phase 2 — learn patterns (ONE AI call or universal fallback)
        patterns = self._learn_patterns(cleaned)
        self.patterns = patterns

        # Phase 3 — classify every paragraph with the rule engine
        parsed = [
            self._classify(cleaned[i], raw_paragraphs[i], i, patterns)
            for i in range(len(cleaned))
        ]

        return parsed, patterns

    # ── Phase 1: Deterministic Text Cleaning ─────────────────────────────────

    def _clean_text(self, text: str) -> str:
        """
        Applies safe, deterministic text corrections.
        These are high-confidence fixes — no AI needed.
        Preserves all content; only fixes mechanical issues.
        """
        if not text or not text.strip():
            return ""

        # Collapse multiple spaces
        text = re.sub(r"  +", " ", text)

        # Strip carriage returns left over from Windows
        text = text.replace("\r", "")

        # Collapse internal newlines (paragraph-in-paragraph artifact)
        text = re.sub(r"\n+", " ", text)

        # Double hyphen → em-dash (but not triple, which is already em-dash territory)
        text = re.sub(r"(?<!\-)--(?!\-)", "\u2014", text)
        text = text.replace("---", "\u2014")

        # Curly apostrophes in contractions
        text = re.sub(r"(?<=\w)'(?=\w)", "\u2019", text)

        # Opening double quotes (preceded by space, open paren, or start of string)
        text = re.sub(r'(?:^|(?<=\s)|(?<=\())\"(?=\S)', "\u201C", text)

        # Closing double quotes (followed by space, punctuation, or end of string)
        text = re.sub(r'(?<=\S)\"(?=\s|[.,!?;:)\-]|$)', "\u201D", text)

        return text.strip()

    # ── Phase 2: Pattern Learning (ONE AI call, ~2000 tokens total) ───────────

    def _learn_patterns(self, cleaned_paragraphs: List[str]) -> LearnedPatterns:
        """
        Extracts a representative sample and asks the AI ONE question:
        what do chapter headings and scene breaks look like in THIS document?

        If AI is unavailable, returns universal patterns immediately.
        """
        if not self.ai_enabled:
            return LearnedPatterns(
                chapter_regexes=UNIVERSAL_CHAPTER_PATTERNS,
                scene_break_regexes=UNIVERSAL_SCENE_BREAK_PATTERNS,
                summary="Using universal pattern library (no API key provided).",
                source="universal",
            )

        # Build sample: take non-trivial paragraphs from beginning, middle, end
        sample = self._build_representative_sample(cleaned_paragraphs)

        if not sample:
            return self._universal_patterns()

        patterns = self._call_ai_for_patterns(sample)
        return patterns if patterns else self._universal_patterns()

    def _build_representative_sample(self, paragraphs: List[str]) -> List[str]:
        """
        Picks up to SAMPLE_SIZE paragraphs spread across the document.
        Skips empty and very short paragraphs to maximise signal per token.
        Focuses on the beginning (where chapter 1 and patterns first appear).
        """
        n = len(paragraphs)
        if n == 0:
            return []

        # Candidate indices: first 40, then spread middle/end
        candidates = list(range(min(40, n)))
        if n > 40:
            mid_start = n // 3
            candidates += list(range(mid_start, min(mid_start + 20, n)))
        if n > 80:
            late_start = (2 * n) // 3
            candidates += list(range(late_start, min(late_start + 20, n)))

        sample = []
        seen = set()
        for idx in candidates:
            if idx in seen:
                continue
            seen.add(idx)
            p = paragraphs[idx].strip()
            if len(p) >= self.MIN_SAMPLE_LEN:
                # Truncate very long paragraphs — we need structure clues, not full prose
                sample.append(p[:200] + "…" if len(p) > 200 else p)
            if len(sample) >= self.SAMPLE_SIZE:
                break

        return sample

    def _call_ai_for_patterns(self, sample: List[str]) -> Optional[LearnedPatterns]:
        """
        The ONE AI call this system makes per document.
        Sends ~80 short paragraph excerpts.
        Receives a compact JSON spec of the document's chapter/scene-break patterns.
        """
        numbered = "\n".join(f"[{i+1}] {p}" for i, p in enumerate(sample))

        system_prompt = (
            "You are a manuscript structure analyst. "
            "You will be shown sample paragraphs from a novel manuscript. "
            "Your ONLY task is to identify the patterns used for chapter headings "
            "and scene breaks in THIS specific document. "
            "Respond ONLY with a valid JSON object. No prose. No markdown fences. "
            "JSON shape:\n"
            "{\n"
            '  "chapter_patterns": ["regex1", "regex2"],\n'
            '  "scene_break_patterns": ["regex1", "regex2"],\n'
            '  "summary": "one sentence describing what you found"\n'
            "}\n"
            "Rules for regexes:\n"
            "- Use Python re syntax\n"
            "- All patterns must be case-insensitive anchored (use ^ and $)\n"
            "- Be specific to THIS document's style, not generic\n"
            "- If you find nothing unusual, return empty lists []\n"
            "- Maximum 6 patterns per category"
        )

        user_prompt = (
            "Analyse these manuscript paragraphs and identify chapter heading "
            "and scene break patterns. Return only the JSON:\n\n"
            f"{numbered}"
        )

        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user",   "content": user_prompt},
            ],
            "max_tokens": 400,      # Patterns fit in 400 tokens easily
            "temperature": 0.05,    # Near-zero: we need deterministic structure analysis
        }
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://novel-formatter-pro.local",
            "X-Title": "Novel Formatter Pro",
        }

        try:
            resp = requests.post(
                self.OPENROUTER_URL, headers=headers, json=payload, timeout=30
            )
            resp.raise_for_status()
            raw = resp.json()["choices"][0]["message"]["content"].strip()

            # Strip markdown fences if the model added them
            raw = re.sub(r"^```(?:json)?\s*", "", raw)
            raw = re.sub(r"\s*```$", "", raw).strip()

            data = json.loads(raw)

            # Merge AI patterns with universal fallbacks for robustness
            ai_chapter_patterns = data.get("chapter_patterns", [])
            ai_scene_patterns   = data.get("scene_break_patterns", [])

            merged_chapter = list(dict.fromkeys(
                ai_chapter_patterns + UNIVERSAL_CHAPTER_PATTERNS
            ))
            merged_scene = list(dict.fromkeys(
                ai_scene_patterns + UNIVERSAL_SCENE_BREAK_PATTERNS
            ))

            return LearnedPatterns(
                chapter_regexes=merged_chapter,
                scene_break_regexes=merged_scene,
                summary=data.get("summary", "AI pattern learning completed."),
                source="ai",
            )

        except requests.exceptions.Timeout:
            print("[Parser] AI call timed out — falling back to universal patterns.")
            return None
        except (requests.exceptions.RequestException, json.JSONDecodeError, KeyError) as e:
            print(f"[Parser] AI call failed ({e}) — falling back to universal patterns.")
            return None

    def _universal_patterns(self) -> LearnedPatterns:
        return LearnedPatterns(
            chapter_regexes=UNIVERSAL_CHAPTER_PATTERNS,
            scene_break_regexes=UNIVERSAL_SCENE_BREAK_PATTERNS,
            summary="Using universal pattern library.",
            source="universal",
        )

    # ── Phase 3: Classification Rule Engine ──────────────────────────────────

    def _classify(
        self,
        cleaned: str,
        raw:     str,
        index:   int,
        patterns: LearnedPatterns,
    ) -> ParsedParagraph:
        """
        Classifies a single paragraph using the learned patterns.
        Pure Python — zero API calls here.
        """
        issues: List[str] = []
        stripped = cleaned.strip()

        # ── Empty ──
        if not stripped:
            return ParsedParagraph(index=index, raw=raw, cleaned="",
                                   ptype=PARA_EMPTY, issues=[])

        # ── Front matter ──
        for pat in FRONT_MATTER_PATTERNS:
            if re.match(pat, stripped, re.IGNORECASE):
                return ParsedParagraph(index=index, raw=raw, cleaned=stripped,
                                       ptype=PARA_FRONT_MATTER, issues=[])

        # ── Scene break ──
        for pat in patterns.scene_break_regexes:
            try:
                if re.match(pat, stripped, re.IGNORECASE):
                    return ParsedParagraph(index=index, raw=raw, cleaned=stripped,
                                           ptype=PARA_SCENE_BREAK, issues=[])
            except re.error:
                continue  # Skip malformed AI-generated regex safely

        # ── Chapter heading ──
        for pat in patterns.chapter_regexes:
            try:
                if re.match(pat, stripped, re.IGNORECASE):
                    if len(stripped) > 80:
                        # A heading this long is suspicious — flag it
                        issues.append(
                            f"Long potential chapter heading ({len(stripped)} chars) — verify manually."
                        )
                    # Normalise: title-case if it was all-caps in the original
                    display = stripped.title() if stripped.isupper() and len(stripped) < 60 else stripped
                    return ParsedParagraph(index=index, raw=raw, cleaned=display,
                                           ptype=PARA_CHAPTER, issues=issues)
            except re.error:
                continue

        # ── Body text quality checks ──
        if "  " in raw:
            issues.append("Double spaces collapsed.")
        if "--" in raw and "\u2014" in cleaned:
            issues.append("Double hyphens converted to em-dashes.")

        return ParsedParagraph(index=index, raw=raw, cleaned=cleaned,
                               ptype=PARA_BODY, issues=issues)

    # ── Statistics helper ─────────────────────────────────────────────────────

    @staticmethod
    def summarise(parsed: List[ParsedParagraph]) -> Dict:
        chapters    = [p for p in parsed if p.ptype == PARA_CHAPTER]
        scene_breaks = [p for p in parsed if p.ptype == PARA_SCENE_BREAK]
        body        = [p for p in parsed if p.ptype == PARA_BODY]
        all_issues  = [issue for p in parsed for issue in p.issues]

        return {
            "total_paragraphs":  len(parsed),
            "body_paragraphs":   len(body),
            "chapter_count":     len(chapters),
            "scene_break_count": len(scene_breaks),
            "issues_count":      len(all_issues),
            "chapter_titles":    [p.cleaned for p in chapters],
            "issues_sample":     list(dict.fromkeys(all_issues))[:20],
        }
