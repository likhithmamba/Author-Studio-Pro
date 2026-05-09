import os
import io
import re
import json
import logging
import zipfile
import tempfile
from typing import Optional, List

from fastapi import APIRouter, Request, HTTPException, UploadFile, File, Form, BackgroundTasks, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from rate_limiter import limiter
from api_utils import (
    require_api_key, san, rm, _mods, _parse_upload
)
from routers.auth_routes import require_premium_tier

logger = logging.getLogger("ai_routes")
router = APIRouter()

def _sec(s) -> Optional[dict]:
    """Serialize a SectionAnalysis dataclass to dict."""
    if not s:
        return None
    return {
        "section_label":           s.section_label,
        "chapter_name":            s.chapter_name,
        "hook_effectiveness":      s.hook_effectiveness,
        "voice_assessment":        s.voice_assessment,
        "prose_quality":           s.prose_quality,
        "pacing_assessment":       s.pacing_assessment,
        "character_presence":      s.character_presence,
        "tension_level":           s.tension_level,
        "specific_strength":       s.specific_strength,
        "specific_concern":        s.specific_concern,
        "editorial_recommendation": s.editorial_recommendation,
    }


# ═══════════════════════════════════════════════════════════════════════════════
# ANALYSE
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/api/analyse", tags=["Analyse"])
@limiter.limit("5/minute")
async def analyse_manuscript(
    request: Request,
    bg: BackgroundTasks,
    file:     UploadFile = File(...),
    genre:    str = Form(default="literary_fiction"),
    use_ai:   str = Form(default="false"),     # "true"/"false" strings from FormData
    api_key:  str = Form(default=""),          # OpenRouter key
    ai_model: str = Form(default="mistralai/mistral-7b-instruct:free"),
    _user: dict = Depends(require_premium_tier),
):
    """
    Structural analysis (readability, style, pacing) + optional AI editorial
    commentary. Set use_ai=true and provide api_key for AI mode.
    """
    m = _mods()
    GENRES = m["GENRES"]
    use_ai_bool = use_ai.lower() in ("true", "1", "yes")
    if genre not in GENRES:
        genre = "literary_fiction"
    genre_name = GENRES[genre].name

    inp = None
    try:
        inp, word_count, parsed, learned = await _parse_upload(
            file,
            api_key=api_key if use_ai_bool else "",
            ai_model=ai_model,
        )

        # ── Structural analysis (no API calls) ──────────────────────────────
        analyzer = m["ManuscriptAnalyzer"]()
        report   = analyzer.analyse(parsed)

        # NOTE: ManuscriptReport field is `total_words`, not `word_count`
        r, s, p = report.readability, report.style, report.pacing

        result = {
            "word_count":        word_count,            # from count_words_in_docx
            "total_words":       report.total_words,    # from analyzer (may differ slightly)
            "total_sentences":   report.total_sentences,
            "total_paragraphs":  report.total_paragraphs,
            "total_chapters":    report.total_chapters,
            "unique_words":      report.unique_words,
            "lexical_diversity": report.lexical_diversity,
            "readability": {
                "flesch_ease":       r.flesch_ease,
                "flesch_kincaid":    r.flesch_kincaid,
                "gunning_fog":       r.gunning_fog,
                "avg_sentence_words": r.avg_sentence_words,
                "avg_word_syllables": r.avg_word_syllables,
                "interpretation":    r.interpretation,
            },
            "style": {
                "dialogue_pct":             s.dialogue_pct,
                "adverb_density":           s.adverb_density,
                "passive_voice_pct":        s.passive_voice_pct,
                "avg_paragraph_words":      s.avg_paragraph_words,
                "sentence_length_variance": s.sentence_length_variance,
                "most_frequent_words":      s.most_frequent_words[:15],
                "repeated_phrases":         s.repeated_phrases[:10],
            },
            "pacing": {
                "chapter_word_counts":    p.chapter_word_counts,
                "chapter_avg":            p.chapter_avg,
                "chapter_std_dev":        p.chapter_std_dev,
                "longest_chapter":        p.longest_chapter,
                "shortest_chapter":       p.shortest_chapter,
                "pacing_verdict":         p.pacing_verdict,
                "scene_break_frequency":  p.scene_break_frequency,
            },
            "editorial_flags":   report.editorial_flags,
            "pattern_source":    learned.source,
            "genre":             genre_name,
            "ai_analysis":       None,
        }

        # ── Optional AI section analysis (up to 4 API calls) ────────────────
        if use_ai_bool and api_key:
            try:
                # run_ai_analysis(parsed, api_key, model, genre)
                # genre param = genre name string (already resolved above)
                ai_report = m["run_ai_analysis"](
                    parsed=parsed,
                    api_key=api_key,
                    model=ai_model,
                    genre=genre_name,
                )
                result["ai_analysis"] = {
                    "model_used":       ai_report.model_used,
                    "ai_powered":       ai_report.ai_powered,
                    "overall_verdict":  ai_report.overall_verdict,
                    "voice_consistency": ai_report.voice_consistency,
                    "arc_assessment":   ai_report.arc_assessment,
                    "top_3_strengths":  ai_report.top_3_strengths,
                    "top_3_priorities": ai_report.top_3_priorities,
                    "opening":   _sec(ai_report.opening_analysis),
                    "midpoint":  _sec(ai_report.midpoint_analysis),
                    "closing":   _sec(ai_report.closing_analysis),
                }
            except Exception as e:
                logger.warning(f"AI analysis failed: {e}")
                result["ai_analysis"] = {"error": str(e)[:300]}
        elif use_ai_bool and not api_key:
            result["ai_analysis"] = {"error": "api_key required for AI mode"}

        bg.add_task(rm, inp)
        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Analyse error")
        bg.add_task(rm, inp)
        raise HTTPException(500, "Analysis failed due to an internal error.")


# ═══════════════════════════════════════════════════════════════════════════════
# QUERY — Manual mode
# ═══════════════════════════════════════════════════════════════════════════════

def _build_zip(m, qdata, ai_query_letter="", **kwargs) -> bytes:
    """Call build_full_package and bundle the results into a .zip."""
    with tempfile.TemporaryDirectory() as tmpdir:
        files = m["build_full_package"](qdata, tmpdir, ai_query_letter=ai_query_letter, **kwargs)
        buf = io.BytesIO()
        with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
            for _, path in files.items():
                if path and os.path.exists(path):
                    zf.write(path, os.path.basename(path))
        return buf.getvalue()

@router.post("/api/query/manual", tags=["Query"])
@limiter.limit("10/minute")
async def query_manual(
    request: Request,
    bg: BackgroundTasks,
    data: str = Form(...),
    _auth=Depends(require_api_key),
):
    """
    Build a full submission package from manually supplied story details.
    Returns a .zip containing the generated .docx files.
    """
    m = _mods()
    try:
        p = json.loads(data)
    except json.JSONDecodeError:
        raise HTTPException(400, "Invalid JSON in data field")

    title       = san(p.get("title", ""), 300)
    author_name = san(p.get("author_name", ""), 200)
    if not title or not author_name:
        raise HTTPException(400, "title and author_name are required")

    GENRES    = m["GENRES"]
    genre_id  = p.get("genre", "literary_fiction")
    genre_name = GENRES.get(genre_id, GENRES["literary_fiction"]).name

    try:
        # QueryPackageData.__init__ — all positional/keyword matches the actual source
        qdata = m["QueryPackageData"](
            title=title,
            author_name=author_name,
            genre=genre_name,
            word_count=int(p.get("word_count", 0)),
            series_note=san(p.get("series_note", ""), 300),
            email=san(p.get("email", ""), 200),
            phone=san(p.get("phone", ""), 50),
            address=san(p.get("address", ""), 300),
            website=san(p.get("website", ""), 300),
            bio_credits=san(p.get("bio_credits", ""), 1000),
            bio_platform=san(p.get("bio_platform", ""), 500),
            comp_1_title=san(p.get("comp_1_title", ""), 200),
            comp_1_author=san(p.get("comp_1_author", ""), 200),
            comp_1_year=san(p.get("comp_1_year", ""), 10),
            comp_2_title=san(p.get("comp_2_title", ""), 200),
            comp_2_author=san(p.get("comp_2_author", ""), 200),
            comp_2_year=san(p.get("comp_2_year", ""), 10),
            protagonist=san(p.get("protagonist", ""), 500),
            setting=san(p.get("setting", ""), 500),
            inciting_event=san(p.get("inciting_event", ""), 500),
            central_conflict=san(p.get("central_conflict", ""), 500),
            stakes=san(p.get("stakes", ""), 500),
            theme=san(p.get("theme", ""), 300),
            synopsis_plot=san(p.get("synopsis_plot", ""), 10000),
        )
    except (TypeError, ValueError, KeyError) as e:
        logger.error(f"QueryPackageData instantiation failed: {e}")
        raise HTTPException(400, f"Invalid query data: {e}")

    try:
        zip_bytes = _build_zip(
            m, qdata,
            include_query=bool(p.get("include_query", True)),
            include_synopsis_1=bool(p.get("include_synopsis_1", True)),
            include_synopsis_3=bool(p.get("include_synopsis_3", False)),
            include_back_matter=bool(p.get("include_back_matter", True)),
        )

        safe = re.sub(r"[^\w\s-]", "", title).strip().replace(" ", "_")[:50]
        return StreamingResponse(
            io.BytesIO(zip_bytes),
            media_type="application/zip",
            headers={
                "Content-Disposition": f'attachment; filename="{safe}_submission_package.zip"'
            },
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Query manual error: {str(e)}")
        raise HTTPException(500, f"Query generation failed: {str(e)[:200]}")


# ═══════════════════════════════════════════════════════════════════════════════
# QUERY — AI mode (reads the actual manuscript)
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/api/query/ai", tags=["Query"])
@limiter.limit("3/minute")
async def query_ai(
    request: Request,
    bg: BackgroundTasks,
    file: UploadFile = File(...),
    data: str = Form(...),
    _user: dict = Depends(require_premium_tier),
):
    """
    AI reads the actual manuscript and writes the query letter + synopsis.
    Exactly 3 OpenRouter API calls. Rate limited to 3/min due to AI cost.
    """
    m = _mods()
    try:
        p = json.loads(data)
    except json.JSONDecodeError:
        raise HTTPException(400, "Invalid JSON in data field")

    api_key = san(p.get("api_key", ""), 500)
    if not api_key:
        raise HTTPException(400, "api_key is required for AI mode")

    title       = san(p.get("title", ""), 300)
    author_name = san(p.get("author_name", ""), 200)
    if not title or not author_name:
        raise HTTPException(400, "title and author_name are required")

    GENRES    = m["GENRES"]
    genre_id  = p.get("genre", "literary_fiction")
    genre_name = GENRES.get(genre_id, GENRES["literary_fiction"]).name
    ai_model  = san(p.get("ai_model", "mistralai/mistral-7b-instruct:free"), 200)

    inp = None
    try:
        inp, word_count, parsed, _ = await _parse_upload(
            file, api_key=api_key, ai_model=ai_model
        )
        wc = int(p.get("word_count", 0)) or word_count

        # run_ai_query_generation signature (from ai_query_writer.py):
        # run_ai_query_generation(parsed, api_key, model, author_name, title,
        #   genre, word_count, series_note, email, phone, address, bio_credits,
        #   comp_override_1, comp_override_2)
        generated = m["run_ai_query_generation"](
            parsed=parsed,
            api_key=api_key,
            model=ai_model,
            author_name=author_name,
            title=title,
            genre=genre_name,
            word_count=wc,
            series_note=san(p.get("series_note", ""), 300),
            email=san(p.get("email", ""), 200),
            phone=san(p.get("phone", ""), 50),
            address=san(p.get("address", ""), 300),
            bio_credits=san(p.get("bio_credits", ""), 1000),
            comp_override_1=san(p.get("comp_override_1", ""), 300),
            comp_override_2=san(p.get("comp_override_2", ""), 300),
        )

        # GeneratedQueryContent has: synopsis_draft, query_letter_draft,
        # protagonist_summary, genre_detected, tone_detected, ai_powered, model_used, warnings
        qdata = m["QueryPackageData"](
            title=title,
            author_name=author_name,
            genre=genre_name,
            word_count=wc,
            series_note=san(p.get("series_note", ""), 300),
            email=san(p.get("email", ""), 200),
            phone=san(p.get("phone", ""), 50),
            address=san(p.get("address", ""), 300),
            website=san(p.get("website", ""), 300),
            bio_credits=san(p.get("bio_credits", ""), 1000),
            bio_platform=san(p.get("bio_platform", ""), 500),
            theme=generated.protagonist_summary or "", # Use AI summary as theme
            synopsis_plot=generated.synopsis_draft,
        )

        zip_bytes = _build_zip(
            m, qdata,
            ai_query_letter=generated.query_letter_draft or "",
            include_query=True,
            include_synopsis_1=True,
            include_synopsis_3=False,
            include_back_matter=bool(p.get("include_back_matter", True)),
        )

        safe = re.sub(r"[^\w\s-]", "", title).strip().replace(" ", "_")[:50]
        intelligence = json.dumps({
            "protagonist_summary": (generated.protagonist_summary or "")[:200],
            "genre_detected":   generated.genre_detected,
            "tone_detected":    generated.tone_detected,
            "ai_powered":       generated.ai_powered,
            "model_used":       generated.model_used,
            "warnings":         generated.warnings,
        })

        bg.add_task(rm, inp)
        return StreamingResponse(
            io.BytesIO(zip_bytes),
            media_type="application/zip",
            headers={
                "Content-Disposition": f'attachment; filename="{safe}_AI_submission_package.zip"',
                "X-Story-Intelligence": intelligence,
            },
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"AI query error: {str(e)}")
        raise HTTPException(500, f"AI query generation failed: {str(e)[:200]}")


# ═══════════════════════════════════════════════════════════════════════════════
# QUERY — AI mode (from text/browser state)
# ═══════════════════════════════════════════════════════════════════════════════

class QueryTextRequest(BaseModel):
    raw_text: str
    chapters: list
    total_words: int
    title: str
    author_name: str
    genre: str = "literary_fiction"
    api_key: str = ""
    ai_model: str = "mistralai/mistral-7b-instruct:free"
    
    # Optional fields
    series_note: str = ""
    email: str = ""
    phone: str = ""
    address: str = ""
    bio_credits: str = ""
    comp_override_1: str = ""
    comp_override_2: str = ""

@router.post("/api/query/ai-text", tags=["Query"])
@limiter.limit("5/minute")
async def query_ai_text(request: Request, body: QueryTextRequest, _user: dict = Depends(require_premium_tier)):
    """
    AI query generation directly from text state (used by Strategist Tab / Editor).
    """
    if not body.raw_text or not body.raw_text.strip():
        raise HTTPException(400, "raw_text must be non-empty")
    if len(body.raw_text) > 500_000:
        raise HTTPException(400, "Text too large. Maximum 500,000 characters.")
    if not body.api_key:
        raise HTTPException(400, "api_key is required for AI mode")
    if not body.title or not body.author_name:
        raise HTTPException(400, "title and author_name are required")

    m = _mods()
    GENRES = m["GENRES"]
    genre = body.genre if body.genre in GENRES else "literary_fiction"
    genre_name = GENRES[genre].name

    try:
        from parser import ParsedParagraph, PARA_CHAPTER, PARA_BODY
        parsed = []
        for ch in body.chapters:
            ch_title = ch.get("title", "Chapter")
            paragraphs = ch.get("paragraphs", [])
            parsed.append(ParsedParagraph(
                index=len(parsed), raw=ch_title, cleaned=ch_title,
                ptype=PARA_CHAPTER, issues=[]
            ))
            for para in paragraphs:
                cl = para.strip()
                if cl:
                    parsed.append(ParsedParagraph(
                        index=len(parsed), raw=para, cleaned=cl,
                        ptype=PARA_BODY, issues=[]
                    ))

        if not parsed:
            raise HTTPException(400, "No paragraphs could be parsed from the text.")

        generated = m["run_ai_query_generation"](
            parsed=parsed,
            api_key=san(body.api_key, 500),
            model=san(body.ai_model, 200),
            author_name=san(body.author_name, 200),
            title=san(body.title, 300),
            genre=genre_name,
            word_count=body.total_words,
            series_note=san(body.series_note, 300),
            email=san(body.email, 200),
            phone=san(body.phone, 100),
            address=san(body.address, 300),
            bio_credits=san(body.bio_credits, 2000),
            comp_override_1=san(body.comp_override_1, 200),
            comp_override_2=san(body.comp_override_2, 200),
        )

        zip_bytes = m["QueryLetterBuilder"]().build_submission_package(
            title=san(body.title, 300),
            author_name=san(body.author_name, 200),
            genre=genre_name,
            word_count=body.total_words,
            series_note=san(body.series_note, 300),
            query_letter_text=generated.query_letter_draft or "",
            synopsis_text=generated.synopsis_draft or "",
            email=san(body.email, 200),
            phone=san(body.phone, 100),
            address=san(body.address, 300),
            include_back_matter=True,
        )

        safe = re.sub(r"[^\w\s-]", "", body.title).strip().replace(" ", "_")[:50]
        intelligence = json.dumps({
            "protagonist_summary": (generated.protagonist_summary or "")[:200],
            "genre_detected":   generated.genre_detected,
            "tone_detected":    generated.tone_detected,
            "ai_powered":       generated.ai_powered,
            "model_used":       generated.model_used,
            "warnings":         generated.warnings,
        })

        return StreamingResponse(
            io.BytesIO(zip_bytes),
            media_type="application/zip",
            headers={
                "Content-Disposition": f'attachment; filename="{safe}_AI_submission_package.zip"',
                "X-Story-Intelligence": intelligence,
            },
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"AI text-query error: {str(e)}")
        raise HTTPException(500, f"AI query generation failed: {str(e)[:200]}")

# ═══════════════════════════════════════════════════════════════════════════════
# ANALYSE-TEXT — accepts JSON text (not file upload)
# Browser extracts text via mammoth.js, sends only text to backend.
# ═══════════════════════════════════════════════════════════════════════════════

class AnalyseTextRequest(BaseModel):
    raw_text: str
    chapters: list  # [{title, paragraphs, word_count}, ...]
    total_words: int
    genre: str = "literary_fiction"
    use_ai: bool = False
    api_key: str = ""
    ai_model: str = "deepseek/deepseek-chat:free"


@router.post("/api/analyse-text", tags=["Analyse"])
@limiter.limit("5/minute")
async def analyse_text(request: Request, body: AnalyseTextRequest, _user: dict = Depends(require_premium_tier)):
    """
    Analyse pre-extracted text from the browser.
    The .docx binary stays in the browser — only text comes here.
    """
    # Validate
    if not body.raw_text or not body.raw_text.strip():
        raise HTTPException(400, "raw_text must be non-empty")
    if len(body.raw_text) > 500_000:
        raise HTTPException(400, "Text too large. Maximum 500,000 characters.")
    if body.total_words <= 0:
        raise HTTPException(400, "total_words must be > 0")

    m = _mods()
    GENRES = m["GENRES"]
    genre = body.genre if body.genre in GENRES else "literary_fiction"
    genre_name = GENRES[genre].name

    try:
        # Reconstruct ParsedParagraph list from chapters
        from parser import ParsedParagraph, PARA_CHAPTER, PARA_BODY
        parsed = []
        for ch in body.chapters:
            title = ch.get("title", "Chapter")
            paragraphs = ch.get("paragraphs", [])
            # 1. Add chapter heading
            parsed.append(ParsedParagraph(
                index=len(parsed),
                raw=title,
                cleaned=title,
                ptype=PARA_CHAPTER,
                issues=[]
            ))
            # 2. Add chapter paragraphs
            for para in paragraphs:
                if para and para.strip():
                    parsed.append(ParsedParagraph(
                        index=len(parsed),
                        raw=para.strip(),
                        cleaned=para.strip(),
                        ptype=PARA_BODY
                        # issues defaults to []
                    ))

        # Run structural analysis
        try:
            analyzer = m["ManuscriptAnalyzer"]()
            report = analyzer.analyse(parsed)
        except Exception as e:
            logger.exception("Structural analysis error")
            raise HTTPException(500, f"Structural analysis failed: {str(e)[:200]}")

        r, s, p = report.readability, report.style, report.pacing
        result = {
            "total_words":       report.total_words,
            "total_sentences":   report.total_sentences,
            "total_paragraphs":  report.total_paragraphs,
            "total_chapters":    report.total_chapters,
            "unique_words":      report.unique_words,
            "lexical_diversity": report.lexical_diversity,
            "readability": {
                "flesch_ease":       r.flesch_ease,
                "flesch_kincaid":    r.flesch_kincaid,
                "gunning_fog":       r.gunning_fog,
                "avg_sentence_words": r.avg_sentence_words,
                "avg_word_syllables": r.avg_word_syllables,
                "interpretation":    r.interpretation,
            },
            "style": {
                "dialogue_pct":             s.dialogue_pct,
                "adverb_density":           s.adverb_density,
                "passive_voice_pct":        s.passive_voice_pct,
                "avg_paragraph_words":      s.avg_paragraph_words,
                "sentence_length_variance": s.sentence_length_variance,
                "most_frequent_words":      s.most_frequent_words[:15],
                "repeated_phrases":         s.repeated_phrases[:10],
            },
            "pacing": {
                "chapter_word_counts":    p.chapter_word_counts,
                "chapter_avg":            p.chapter_avg,
                "chapter_std_dev":        p.chapter_std_dev,
                "longest_chapter":        p.longest_chapter,
                "shortest_chapter":       p.shortest_chapter,
                "pacing_verdict":         p.pacing_verdict,
                "scene_break_frequency":  p.scene_break_frequency,
            },
            "editorial_flags":   report.editorial_flags,
            "genre":             genre_name,
            "ai_analysis":       None,
        }

        # Optional AI analysis
        if body.use_ai and body.api_key:
            try:
                ai_report = m["run_ai_analysis"](
                    parsed=parsed,
                    api_key=body.api_key,
                    model=body.ai_model,
                    genre=genre_name,
                )
                result["ai_analysis"] = {
                    "model_used":       ai_report.model_used,
                    "ai_powered":       ai_report.ai_powered,
                    "overall_verdict":  ai_report.overall_verdict,
                    "voice_consistency": ai_report.voice_consistency,
                    "arc_assessment":   ai_report.arc_assessment,
                    "top_3_strengths":  ai_report.top_3_strengths,
                    "top_3_priorities": ai_report.top_3_priorities,
                    "opening":   _sec(ai_report.opening_analysis),
                    "midpoint":  _sec(ai_report.midpoint_analysis),
                    "closing":   _sec(ai_report.closing_analysis),
                }
            except Exception as e:
                logger.warning(f"AI analysis failed: {e}")
                result["ai_analysis"] = {"error": str(e)[:300]}
        elif body.use_ai and not body.api_key:
            result["ai_analysis"] = {"error": "api_key required for AI mode"}

        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Analyse-text error")
        raise HTTPException(422, f"Could not process the manuscript structure. Try re-uploading the file. Detail: {str(e)[:200]}")

# ═══════════════════════════════════════════════════════════════════════════════
# AI ENGINE - SIGNAL ANALYSIS 
# ═══════════════════════════════════════════════════════════════════════════════

class SignalAnalysisRequest(BaseModel):
    mode: str = "normal"
    track: str = None
    signals: list
    current_phase: str = "setup"
    progression: dict = None
    character_states: dict = None
    conflict_states: dict = None
    api_key: str = ""
    ai_model: str = "mistralai/mistral-7b-instruct:free"

@router.post("/api/ai/analyze-signals", tags=["AI"])
@limiter.limit("10/minute")
async def analyze_signals(request: Request, body: SignalAnalysisRequest, _user: dict = Depends(require_premium_tier)):
    if not body.api_key:
        raise HTTPException(400, "API key required")
        
    # Security: Prevent path traversal by validating mode against an allowlist
    ALLOWED_MODES = {"normal", "depth", "extended"}
    mode = body.mode.lower()
    if mode not in ALLOWED_MODES:
        mode = "normal"

    prompt_file = f"prompt_templates/{mode}.txt"
    if not os.path.exists(prompt_file):
        prompt_file = "prompt_templates/normal.txt"
        
    with open(prompt_file, 'r', encoding='utf-8') as f:
        sys_prompt = f.read()
        
    sys_prompt = sys_prompt.replace("{{signals_json}}", json.dumps(body.signals))
    sys_prompt = sys_prompt.replace("{{primary_signals_json}}", json.dumps(body.signals))
    sys_prompt = sys_prompt.replace("{{secondary_signals_json}}", "[]") 
    sys_prompt = sys_prompt.replace("{{current_phase}}", body.current_phase or "unknown")
    if body.progression:
        sys_prompt = sys_prompt.replace("{{progression_curve_json}}", json.dumps(body.progression))
    if body.character_states:
        sys_prompt = sys_prompt.replace("{{character_states_json}}", json.dumps(body.character_states))
    if body.conflict_states:
        sys_prompt = sys_prompt.replace("{{conflict_states_json}}", json.dumps(body.conflict_states))
        
    full_sso = {
        "signals": body.signals,
        "progression": body.progression,
        "character_states": body.character_states,
        "conflict_states": body.conflict_states
    }
    sys_prompt = sys_prompt.replace("{{full_sso_json}}", json.dumps(full_sso))
    sys_prompt = sys_prompt.replace("{{signal_history_json}}", "[]")
    sys_prompt = sys_prompt.replace("{{character_evolution_json}}", json.dumps(body.character_states))
    sys_prompt = sys_prompt.replace("{{conflict_evolution_json}}", json.dumps(body.conflict_states))

    # V12 — Script Continuity Guard
    try:
        from prompts.script_continuity import build_continuity_guard
        # Assume primary language from track or default to hi
        lang_code = body.track if body.track in ['hi', 'kn', 'ta', 'te'] else 'hi'
        guard = build_continuity_guard(lang_code)
        if guard:
            sys_prompt = guard + "\n" + sys_prompt
    except Exception as e:
        logger.warning(f"Failed to inject Script Continuity Guard: {e}")

    # Inject Indian Fiction Intelligence if track is specified
    if body.track:
        try:
            import sys
            sys.path.append(os.path.join(os.path.dirname(__file__), "..", "prompts"))
            from india_fiction_system import inject_indian_intelligence
            sys_prompt = inject_indian_intelligence(sys_prompt, body.track)
        except Exception as e:
            logger.warning(f"Failed to inject Indian intelligence: {e}")

    try:
        import requests
        headers = {
            "Authorization": f"Bearer {body.api_key}",
            "HTTP-Referer": "http://localhost:5173", 
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": body.ai_model,
            "messages": [
                {"role": "system", "content": sys_prompt},
                {"role": "user", "content": "Please analyze the structural signals and output the JSON insights."}
            ],
            "response_format": {"type": "json_object"}
        }
        
        # V6 — Indic Token Estimator
        try:
            from services.text_analysis.indic_token_estimator import estimate_tokens
            estimated = estimate_tokens(sys_prompt)
            TOKEN_CAPS = {'normal': 5000, 'depth': 8000, 'extended': 12000}
            cap = TOKEN_CAPS.get(mode, 5000)
            if estimated > cap:
                raise HTTPException(status_code=422, detail={
                    'type': 'token_limit_exceeded',
                    'estimated_tokens': estimated,
                    'cap': cap,
                    'detail': f'{mode.upper()} mode cap: {cap}. Estimated: {estimated}.'
                })
        except HTTPException:
            raise
        except Exception as e:
            logger.warning(f"Token estimation failed: {e}")

        timeout = 60
        if mode == "extended":
            timeout = 120
            
        r = requests.post("https://openrouter.ai/api/v1/chat/completions", headers=headers, json=payload, timeout=timeout)
        r.raise_for_status()
        
        j = r.json()
        content = j['choices'][0]['message']['content']
        
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0]
        elif "```" in content:
            content = content.replace("```", "")
            
        return json.loads(content.strip())
        
    except requests.exceptions.Timeout:
        if mode == "extended":
            return {"error": "Timeout", "fallback": "depth required"}
        raise HTTPException(504, "AI Request Timed out")
    except Exception as e:
        logger.exception("Signal Analysis Failed")
        raise HTTPException(500, f"AI Analysis Error: {str(e)[:200]}")


