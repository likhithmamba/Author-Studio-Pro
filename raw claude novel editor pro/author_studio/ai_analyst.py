"""
ai_analyst.py
=============
AI-powered narrative manuscript analysis.

This module bridges the gap between statistical metrics and genuine editorial
intelligence. It reads strategic sections of the actual manuscript text and
produces the kind of narrative commentary that professional development editors
provide in manuscript assessment letters.

TOKEN STRATEGY — STRATEGIC SAMPLING
-------------------------------------
Reading a 51,000-word manuscript in full would cost ~75,000 input tokens per
call — expensive on any tier, impossible on free tiers.

Professional editors do not read with equal attention across a manuscript.
They concentrate on high-signal sections:

  1. OPENING (first chapter / first 1,500 words)
     — Where agents and readers make the continue/stop decision.
     — The most important section for query success.
     — Analysed for: hook quality, voice, immediate characterisation,
       inciting incident placement, prose rhythm.

  2. MIDPOINT (chapter at 45–55% through the manuscript)
     — Where structural problems concentrate (sagging middle).
     — Analysed for: tension maintenance, pacing, scene purpose.

  3. CLIMAX APPROACH (last two chapters / final ~1,500 words)
     — Where payoff and resolution quality is assessed.
     — Analysed for: stakes delivery, emotional resolution, thematic closure.

Total tokens per call: ~9,000–13,000 input, ~800–1,200 output.
Three calls maximum per full analysis. Cost on Mistral 7B free tier: $0.
"""

import re
import json
import time
import requests
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass, field

from parser import ParsedParagraph, PARA_BODY, PARA_CHAPTER


OPENROUTER_URL   = "https://openrouter.ai/api/v1/chat/completions"
REQUEST_TIMEOUT  = 60
WORDS_PER_SAMPLE = 1_500   # Target word count per sampled section


# ── Data Model ────────────────────────────────────────────────────────────────

@dataclass
class NarrativeSection:
    label:   str    # "Opening", "Midpoint", "Climax"
    excerpt: str    # Actual manuscript text
    chapter: str    # Chapter name this section comes from
    position_pct: float  # 0–100, where in the manuscript this falls


@dataclass
class SectionAnalysis:
    section_label:  str
    chapter_name:   str

    # Editorial dimensions — these mirror what a human editor writes
    hook_effectiveness:     Optional[str] = None   # Opening only
    voice_assessment:       str           = ""     # Consistency, distinctiveness, appropriateness
    prose_quality:          str           = ""     # Sentence craft, imagery, rhythm
    pacing_assessment:      str           = ""     # Too fast, too slow, effective?
    character_presence:     str           = ""     # Who is present, how are they rendered
    tension_level:          str           = ""     # Is there forward momentum?
    specific_strength:      str           = ""     # One thing that is working well, with a quote
    specific_concern:       str           = ""     # One concrete issue, with a quote
    editorial_recommendation: str         = ""     # One actionable instruction


@dataclass
class AIManuscriptReport:
    # The three section analyses
    opening_analysis:  Optional[SectionAnalysis] = None
    midpoint_analysis: Optional[SectionAnalysis] = None
    closing_analysis:  Optional[SectionAnalysis] = None

    # Cross-manuscript observations
    voice_consistency:  str = ""   # Is the voice stable across sampled sections?
    arc_assessment:     str = ""   # Does the story appear to have a proper arc?
    overall_verdict:    str = ""   # One honest paragraph summarising the manuscript
    top_3_strengths:    List[str] = field(default_factory=list)
    top_3_priorities:   List[str] = field(default_factory=list)  # Most important fixes

    # Whether AI was available or whether this is placeholder
    ai_powered: bool = False
    model_used: str  = ""


# ── Extractor ─────────────────────────────────────────────────────────────────

class ManuscriptSampler:
    """
    Extracts the three strategic sections from a parsed paragraph list.
    Targets body text only; locates chapter boundaries for context.
    """

    def extract_sections(
        self, parsed: List[ParsedParagraph]
    ) -> Tuple[NarrativeSection, Optional[NarrativeSection], Optional[NarrativeSection]]:

        body = [p for p in parsed if p.ptype == PARA_BODY and len(p.cleaned.strip()) > 40]
        chapters = [(i, p) for i, p in enumerate(parsed) if p.ptype == PARA_CHAPTER]

        total_words = sum(len(p.cleaned.split()) for p in body)
        if total_words == 0:
            raise ValueError("No body text found in manuscript.")

        # ── Opening: first WORDS_PER_SAMPLE words ──
        opening_text, opening_chapter = self._extract_from_start(body, parsed, chapters, 0)
        opening = NarrativeSection(
            label="Opening",
            excerpt=opening_text,
            chapter=opening_chapter,
            position_pct=0.0,
        )

        # ── Midpoint: paragraphs around 50% word mark ──
        midpoint = None
        if total_words > 5_000:
            mid_text, mid_chapter = self._extract_around_word_position(
                body, parsed, chapters, target_pct=0.50
            )
            midpoint = NarrativeSection(
                label="Midpoint",
                excerpt=mid_text,
                chapter=mid_chapter,
                position_pct=50.0,
            )

        # ── Closing: last WORDS_PER_SAMPLE words ──
        closing = None
        if total_words > 8_000:
            closing_text, closing_chapter = self._extract_from_end(body, parsed, chapters)
            closing = NarrativeSection(
                label="Closing",
                excerpt=closing_text,
                chapter=closing_chapter,
                position_pct=100.0,
            )

        return opening, midpoint, closing

    def _extract_from_start(
        self,
        body: List[ParsedParagraph],
        all_paras: List[ParsedParagraph],
        chapters: List,
        offset_words: int = 0,
    ) -> Tuple[str, str]:
        words_collected = 0
        texts = []
        skip = offset_words

        for p in body:
            words = p.cleaned.split()
            if skip > 0:
                skip -= len(words)
                continue
            texts.append(p.cleaned)
            words_collected += len(words)
            if words_collected >= WORDS_PER_SAMPLE:
                break

        chapter_name = chapters[0][1].cleaned if chapters else "Chapter 1"
        return " ".join(texts), chapter_name

    def _extract_around_word_position(
        self,
        body: List[ParsedParagraph],
        all_paras: List[ParsedParagraph],
        chapters: List,
        target_pct: float,
    ) -> Tuple[str, str]:
        total = sum(len(p.cleaned.split()) for p in body)
        target_word = int(total * target_pct)

        running = 0
        start_idx = 0
        for i, p in enumerate(body):
            running += len(p.cleaned.split())
            if running >= target_word:
                start_idx = max(0, i - 2)
                break

        texts = []
        words_collected = 0
        for p in body[start_idx:]:
            texts.append(p.cleaned)
            words_collected += len(p.cleaned.split())
            if words_collected >= WORDS_PER_SAMPLE:
                break

        # Find nearest chapter heading
        chapter_name = self._nearest_chapter(all_paras, body[start_idx].index if start_idx < len(body) else 0, chapters)
        return " ".join(texts), chapter_name

    def _extract_from_end(
        self,
        body: List[ParsedParagraph],
        all_paras: List[ParsedParagraph],
        chapters: List,
    ) -> Tuple[str, str]:
        texts = []
        words_collected = 0
        for p in reversed(body):
            texts.insert(0, p.cleaned)
            words_collected += len(p.cleaned.split())
            if words_collected >= WORDS_PER_SAMPLE:
                break

        chapter_name = chapters[-1][1].cleaned if chapters else "Final Chapter"
        return " ".join(texts), chapter_name

    def _nearest_chapter(
        self,
        all_paras: List[ParsedParagraph],
        para_index: int,
        chapters: List,
    ) -> str:
        best = "Unknown Chapter"
        for ch_idx, ch_para in chapters:
            if ch_idx <= para_index:
                best = ch_para.cleaned
            else:
                break
        return best


# ── AI Analyst ────────────────────────────────────────────────────────────────

class AIManuscriptAnalyst:
    """
    Uses an LLM to produce narrative editorial commentary on sampled manuscript sections.

    This is what converts the app from a statistics dashboard into something
    that delivers genuine editorial intelligence comparable to a manuscript
    assessment service.
    """

    SYSTEM_PROMPT = """You are a senior manuscript editor with twenty years of experience 
at major publishing houses. You have assessed thousands of manuscripts across all commercial 
fiction genres. Your job is to provide the kind of honest, specific, constructive editorial 
commentary that appears in professional manuscript assessment letters.

Your assessments must:
- Reference the ACTUAL TEXT provided — quote specific phrases or sentences
- Be honest about weaknesses — do not soften criticism to avoid discomfort
- Be specific — never vague ("the pacing is slow" must become "the scene in which X does Y 
  extends for approximately 300 words without advancing plot or character, which is where 
  the reader's attention drifts")
- Be actionable — every criticism must come with a direction, not just a diagnosis
- Sound like a human professional, not an AI checklist

Respond ONLY with a valid JSON object. No prose outside the JSON. No markdown fences.
"""

    def __init__(self, api_key: str, model: str = "mistralai/mistral-7b-instruct:free"):
        self.api_key = api_key
        self.model   = model

    def analyse_section(
        self,
        section:   NarrativeSection,
        genre:     str = "fiction",
        is_debut:  bool = True,
    ) -> Optional[SectionAnalysis]:
        """
        Sends one section to the AI and returns a structured SectionAnalysis.
        """
        is_opening = section.label == "Opening"

        fields = {
            "voice_assessment":            "Assess the narrative voice. Is it distinctive? Consistent? Appropriate to the genre? Quote one phrase that best demonstrates the voice, positive or negative.",
            "prose_quality":               "Assess sentence craft, imagery, and rhythm. Is the prose earning its place? Quote one sentence that exemplifies either the strength or the weakness of the prose.",
            "pacing_assessment":           "Is this section moving at the right speed? Identify specifically where the pacing is effective or where it loses momentum.",
            "character_presence":          "Which characters appear? How are they rendered on the page? Is their presence vivid and specific, or are they functional?",
            "tension_level":               "Is there forward momentum? Does the reader have a reason to continue? What creates or undermines the tension here?",
            "specific_strength":           "Identify one thing that is genuinely working well. Quote the specific passage and explain why it works.",
            "specific_concern":            "Identify the single most important issue in this section. Quote the specific passage and explain the editorial problem.",
            "editorial_recommendation":    "Give one concrete, actionable instruction the author should act on before submitting this manuscript.",
        }

        if is_opening:
            fields["hook_effectiveness"] = (
                "Assess the opening hook. Does the first page earn the reader's continued attention? "
                "Quote the actual opening line and assess it honestly. What does it do well or badly?"
            )

        json_shape = json.dumps({k: "string" for k in fields}, indent=2)

        user_prompt = f"""You are assessing the {section.label} of a {genre} manuscript.
This section comes from: {section.chapter}

MANUSCRIPT EXCERPT:
---
{section.excerpt[:4000]}
---

Provide your editorial assessment as a JSON object with exactly these fields:
{json_shape}

Remember: quote actual text from the excerpt. Be specific. Be honest."""

        result = self._call_api(user_prompt)
        if not result:
            return None

        analysis = SectionAnalysis(
            section_label=section.label,
            chapter_name=section.chapter,
        )

        for field_name in fields:
            if field_name in result:
                setattr(analysis, field_name, result[field_name])

        return analysis

    def synthesise_cross_manuscript(
        self,
        opening:  Optional[SectionAnalysis],
        midpoint: Optional[SectionAnalysis],
        closing:  Optional[SectionAnalysis],
        genre:    str = "fiction",
    ) -> Dict:
        """
        Makes one final API call to produce the cross-manuscript synthesis:
        voice consistency, arc assessment, overall verdict, and top priorities.
        """
        sections_text = ""
        if opening:
            sections_text += f"\nOPENING ({opening.chapter}):\n"
            sections_text += f"Voice: {opening.voice_assessment}\n"
            sections_text += f"Strength: {opening.specific_strength}\n"
            sections_text += f"Concern: {opening.specific_concern}\n"
        if midpoint:
            sections_text += f"\nMIDPOINT ({midpoint.chapter}):\n"
            sections_text += f"Pacing: {midpoint.pacing_assessment}\n"
            sections_text += f"Tension: {midpoint.tension_level}\n"
            sections_text += f"Concern: {midpoint.specific_concern}\n"
        if closing:
            sections_text += f"\nCLOSING ({closing.chapter}):\n"
            sections_text += f"Tension: {closing.tension_level}\n"
            sections_text += f"Strength: {closing.specific_strength}\n"
            sections_text += f"Concern: {closing.specific_concern}\n"

        user_prompt = f"""Based on these editorial notes from three sections of a {genre} manuscript, 
provide a cross-manuscript synthesis as a JSON object with exactly these fields:

- "voice_consistency": Is the narrative voice stable and consistent across all three sections, 
  or does it shift? Be specific about where it holds and where it breaks.
- "arc_assessment": Based on the opening, midpoint, and closing, does this manuscript appear to 
  have a functional story arc? What is present and what may be missing?
- "overall_verdict": A single honest paragraph (4–6 sentences) summarising the manuscript's 
  current submission readiness. This should read like the final paragraph of a manuscript 
  assessment letter — direct, professional, encouraging where warranted.
- "top_3_strengths": Array of 3 strings — the three strongest assets this manuscript has.
- "top_3_priorities": Array of 3 strings — the three most important revisions the author 
  must make before submitting to agents. Each must be specific and actionable.

SECTION NOTES:
{sections_text}

Respond ONLY with valid JSON. No prose outside the JSON."""

        result = self._call_api(user_prompt)
        return result or {}

    def _call_api(self, user_prompt: str) -> Optional[Dict]:
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://author-studio-pro.local",
            "X-Title": "Author Studio Pro",
        }
        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": self.SYSTEM_PROMPT},
                {"role": "user",   "content": user_prompt},
            ],
            "max_tokens": 900,
            "temperature": 0.3,
        }
        try:
            resp = requests.post(OPENROUTER_URL, headers=headers,
                                 json=payload, timeout=REQUEST_TIMEOUT)
            resp.raise_for_status()
            raw = resp.json()["choices"][0]["message"]["content"].strip()
            raw = re.sub(r"^```(?:json)?\s*", "", raw)
            raw = re.sub(r"\s*```$", "", raw).strip()
            return json.loads(raw)
        except Exception as e:
            print(f"[AIAnalyst] API call failed: {e}")
            return None


# ── Orchestrator ──────────────────────────────────────────────────────────────

def run_ai_analysis(
    parsed:   List[ParsedParagraph],
    api_key:  str,
    model:    str,
    genre:    str = "fiction",
) -> AIManuscriptReport:
    """
    Full orchestration: sample → analyse each section → synthesise.
    Makes at most 4 API calls regardless of manuscript length.
    Returns AIManuscriptReport.
    """
    sampler  = ManuscriptSampler()
    analyst  = AIManuscriptAnalyst(api_key=api_key, model=model)

    opening_section, midpoint_section, closing_section = sampler.extract_sections(parsed)

    # Analyse each section (3 API calls maximum)
    opening_analysis  = analyst.analyse_section(opening_section,  genre=genre)
    time.sleep(0.5)

    midpoint_analysis = None
    if midpoint_section:
        midpoint_analysis = analyst.analyse_section(midpoint_section, genre=genre)
        time.sleep(0.5)

    closing_analysis = None
    if closing_section:
        closing_analysis = analyst.analyse_section(closing_section, genre=genre)
        time.sleep(0.5)

    # Synthesise cross-manuscript (1 API call)
    synthesis = analyst.synthesise_cross_manuscript(
        opening_analysis, midpoint_analysis, closing_analysis, genre=genre
    )

    report = AIManuscriptReport(
        opening_analysis=opening_analysis,
        midpoint_analysis=midpoint_analysis,
        closing_analysis=closing_analysis,
        voice_consistency=synthesis.get("voice_consistency", ""),
        arc_assessment=synthesis.get("arc_assessment", ""),
        overall_verdict=synthesis.get("overall_verdict", ""),
        top_3_strengths=synthesis.get("top_3_strengths", []),
        top_3_priorities=synthesis.get("top_3_priorities", []),
        ai_powered=True,
        model_used=model,
    )

    return report
