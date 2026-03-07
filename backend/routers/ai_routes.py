import os
import io
import re
import json
import logging
import zipfile
import tempfile
from typing import Optional

from fastapi import APIRouter, Request, HTTPException, UploadFile, File, Form, BackgroundTasks, Depends
from fastapi.responses import StreamingResponse

from rate_limiter import limiter
from api_utils import (
    require_api_key, san, rm, _mods, _parse_upload
)

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
    genre:    str = Form(default="literary"),
    use_ai:   str = Form(default="false"),     # "true"/"false" strings from FormData
    api_key:  str = Form(default=""),          # OpenRouter key
    ai_model: str = Form(default="mistralai/mistral-7b-instruct:free"),
    _auth=Depends(require_api_key),
):
    """
    Structural analysis (readability, style, pacing) + optional AI editorial
    commentary. Set use_ai=true and provide api_key for AI mode.
    """
    m = _mods()
    GENRES = m["GENRES"]
    use_ai_bool = use_ai.lower() in ("true", "1", "yes")
    if genre not in GENRES:
        genre = "literary"
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

def _build_zip(m, qdata, **kwargs) -> bytes:
    """Call build_full_package and bundle the results into a .zip."""
    with tempfile.TemporaryDirectory() as tmpdir:
        # build_full_package(data, output_dir, include_query, include_synopsis_1,
        #                    include_synopsis_3, include_back_matter) → Dict[str, str]
        files = m["build_full_package"](qdata, tmpdir, **kwargs)
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
    genre_id  = p.get("genre", "literary")
    genre_name = GENRES.get(genre_id, GENRES["literary"]).name

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
            bio_credits=san(p.get("bio_credits", ""), 1000),
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
            synopsis_plot=san(p.get("synopsis_plot", ""), 10000),
        )

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
        logger.exception("Query manual error")
        raise HTTPException(500, "Query generation failed due to an internal error.")


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
    _auth=Depends(require_api_key),
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
    genre_id  = p.get("genre", "literary")
    genre_name = GENRES.get(genre_id, GENRES["literary"]).name
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
            bio_credits=san(p.get("bio_credits", ""), 1000),
            synopsis_plot=generated.synopsis_draft,
        )

        zip_bytes = _build_zip(
            m, qdata,
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
        logger.exception("AI query error")
        bg.add_task(rm, inp)
        raise HTTPException(500, "AI query generation failed due to an internal error.")
