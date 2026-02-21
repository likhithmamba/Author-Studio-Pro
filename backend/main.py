# ─────────────────────────────────────────────────────────────────────────────
# Author Studio Pro — FastAPI Backend  (v2 — corrected against actual source)
# ─────────────────────────────────────────────────────────────────────────────
# Run:  uvicorn main:app --reload --port 8000
# ─────────────────────────────────────────────────────────────────────────────

import os, sys, io, re, json, time, uuid, tempfile, zipfile, secrets, logging
from pathlib import Path
from typing import Optional, List
from datetime import datetime
from functools import lru_cache

from fastapi import (
    FastAPI, File, UploadFile, Form, HTTPException,
    Depends, Request, BackgroundTasks, status,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from dotenv import load_dotenv

load_dotenv()

# ─── Python path: point at the author_studio folder ───────────────────────────
STUDIO_PATH = (
    Path(__file__).parent.parent
    / "raw claude novel editor pro"
    / "author_studio"
)
sys.path.insert(0, str(STUDIO_PATH))

# ─── Logging ──────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("author-studio-api")

# ─── Rate limiter ────────────────────────────────────────────────────────────
limiter = Limiter(key_func=get_remote_address)

# ─── App ──────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="Author Studio Pro API",
    description="Professional manuscript formatting, analysis, and query generation.",
    version="2.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ─── CORS ─────────────────────────────────────────────────────────────────────
ALLOWED_ORIGINS = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:5173,http://localhost:5174"
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

# ─── Security headers ─────────────────────────────────────────────────────────
@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response

# ─── Request logging ──────────────────────────────────────────────────────────
@app.middleware("http")
async def log_requests(request: Request, call_next):
    rid = str(uuid.uuid4())[:8]
    t0 = time.time()
    logger.info(f"[{rid}] {request.method} {request.url.path}")
    try:
        response = await call_next(request)
        logger.info(f"[{rid}] ← {response.status_code} ({(time.time()-t0)*1000:.1f}ms)")
        return response
    except Exception as exc:
        logger.error(f"[{rid}] error: {exc}")
        raise

# ─── API key auth ─────────────────────────────────────────────────────────────
bearer = HTTPBearer(auto_error=False)

def require_api_key(
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
):
    configured = os.getenv("API_KEY", "")
    if configured:
        if not credentials or not secrets.compare_digest(
            credentials.credentials, configured
        ):
            raise HTTPException(status_code=401, detail="Invalid or missing API key")
    return credentials

# ─── File limits ──────────────────────────────────────────────────────────────
MAX_MB   = int(os.getenv("MAX_FILE_SIZE_MB", "25"))
MAX_BYTES = MAX_MB * 1024 * 1024
DOCX_MAGIC = b"PK\x03\x04"   # ZIP/docx magic bytes

def validate_upload(file: UploadFile):
    if not file.filename.lower().endswith(".docx"):
        raise HTTPException(400, "Only .docx files are accepted")

def check_magic(data: bytes):
    if data[:4] != DOCX_MAGIC:
        raise HTTPException(400, "File is not a valid .docx (bad magic bytes)")

# ─── Text sanitiser ───────────────────────────────────────────────────────────
def san(text: str, maxlen: int = 2000) -> str:
    if not text:
        return ""
    text = re.sub(r"<[^>]+>", "", text)   # strip HTML
    text = text.replace("\x00", "")        # strip null bytes
    text = re.sub(r"[ \t]+", " ", text).strip()
    return text[:maxlen]

# ─── Temp-file helpers ────────────────────────────────────────────────────────
def save_tmp(data: bytes) -> str:
    with tempfile.NamedTemporaryFile(delete=False, suffix=".docx") as f:
        f.write(data)
        return f.name

def rm(path: str):
    try:
        if path and os.path.exists(path):
            os.unlink(path)
    except Exception:
        pass

# ─── Lazy module loader (cached after first call) ─────────────────────────────
@lru_cache(maxsize=1)
def _mods():
    """Import all author_studio modules. Raises 503 on failure."""
    try:
        from formatter       import NovelFormatter, count_words_in_docx, extract_raw_paragraphs
        from parser          import ManuscriptParser
        from analyzer        import ManuscriptAnalyzer
        from genre_db        import GENRES, get_word_count_assessment
        from templates       import TEMPLATES
        from query_builder   import QueryPackageData, build_full_package
        from ai_analyst      import run_ai_analysis
        from ai_query_writer import run_ai_query_generation
        return dict(
            NovelFormatter=NovelFormatter,
            count_words_in_docx=count_words_in_docx,
            extract_raw_paragraphs=extract_raw_paragraphs,
            ManuscriptParser=ManuscriptParser,
            ManuscriptAnalyzer=ManuscriptAnalyzer,
            GENRES=GENRES,
            get_word_count_assessment=get_word_count_assessment,
            TEMPLATES=TEMPLATES,
            QueryPackageData=QueryPackageData,
            build_full_package=build_full_package,
            run_ai_analysis=run_ai_analysis,
            run_ai_query_generation=run_ai_query_generation,
        )
    except ImportError as e:
        logger.error(f"Module import failed: {e}")
        raise HTTPException(503, f"Backend modules unavailable: {e}")


# ═══════════════════════════════════════════════════════════════════════════════
# SHARED PIPELINE  — parse an uploaded .docx
# ═══════════════════════════════════════════════════════════════════════════════

async def _parse_upload(
    file: UploadFile,
    api_key: str = "",      # empty = no AI in parser
    ai_model: str = "mistralai/mistral-7b-instruct:free",
) -> tuple:
    """
    Read, validate, and parse the uploaded .docx.
    Returns (input_path, word_count, parsed_paragraphs, learned_patterns).
    Caller must delete input_path.
    """
    m = _mods()
    validate_upload(file)
    data = await file.read()

    if len(data) > MAX_BYTES:
        raise HTTPException(413, f"File too large. Maximum is {MAX_MB} MB.")
    check_magic(data)

    input_path = save_tmp(data)
    word_count = m["count_words_in_docx"](input_path)
    raw_paras  = m["extract_raw_paragraphs"](input_path)

    # Pass api_key=None when not using AI (ManuscriptParser accepts Optional[str])
    parser = m["ManuscriptParser"](
        api_key=api_key if api_key else None,
        model=ai_model,
    )
    parsed, learned = parser.parse(raw_paras)
    return input_path, word_count, parsed, learned


# ═══════════════════════════════════════════════════════════════════════════════
# HEALTH & META
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/api/health", tags=["Meta"])
async def health():
    return {"status": "ok", "version": "2.0.0",
            "timestamp": datetime.utcnow().isoformat() + "Z"}


@app.get("/api/templates", tags=["Meta"])
@limiter.limit("60/minute")
async def list_templates(request: Request):
    """All available formatting templates with full specs."""
    TEMPLATES = _mods()["TEMPLATES"]
    return [
        {
            "id": k,
            "name": t.name,
            "description": t.description,
            "best_for": t.best_for,
            "authority": t.authority,
            "font": f"{t.font_name} {t.font_size_pt}pt",
            "spacing": t.line_spacing,
            "page_size": t.page_size,
            "margins": {
                "top":    t.margin_top_in,
                "bottom": t.margin_bottom_in,
                "left":   t.margin_left_in,
                "right":  t.margin_right_in,
            },
        }
        for k, t in TEMPLATES.items()
    ]


@app.get("/api/genres", tags=["Meta"])
@limiter.limit("60/minute")
async def list_genres(request: Request):
    """All genres with full market intelligence."""
    GENRES = _mods()["GENRES"]
    return [
        {
            "id": k,
            "name": g.name,
            "category": g.category,
            "wc_min": g.wc_min,
            "wc_sweet": g.wc_sweet,
            "wc_max": g.wc_max,
            "wc_debut_max": g.wc_debut_max,
            "market_note": g.market_note,
            "agent_note": g.agent_note,
            "debut_note": g.debut_note,
            "comp_note": g.comp_note,
            "publishers": g.publishers,
            "chapter_count_typical": g.chapter_count_typical,
            "pov_conventions": g.pov_conventions,
            "opening_hook_standard": g.opening_hook_standard,
            "rejection_flags": g.rejection_flags,
        }
        for k, g in GENRES.items()
    ]


@app.get("/api/market/{genre_id}", tags=["Market"])
@limiter.limit("30/minute")
async def get_market(request: Request, genre_id: str):
    """Full market intelligence for one genre."""
    GENRES = _mods()["GENRES"]
    if genre_id not in GENRES:
        raise HTTPException(404, f"Genre '{genre_id}' not found")
    g = GENRES[genre_id]
    return {
        "id": genre_id, "name": g.name, "category": g.category,
        "wc_min": g.wc_min, "wc_sweet": g.wc_sweet, "wc_max": g.wc_max,
        "wc_debut_max": g.wc_debut_max, "market_note": g.market_note,
        "agent_note": g.agent_note, "debut_note": g.debut_note,
        "comp_note": g.comp_note, "publishers": g.publishers,
        "chapter_count_typical": g.chapter_count_typical,
        "pov_conventions": g.pov_conventions,
        "opening_hook_standard": g.opening_hook_standard,
        "rejection_flags": g.rejection_flags,
    }


@app.get("/api/genre/{genre_id}/word-count", tags=["Market"])
@limiter.limit("60/minute")
async def word_count_assessment(request: Request, genre_id: str, word_count: int):
    """Word count viability assessment against genre benchmarks."""
    m = _mods()
    if genre_id not in m["GENRES"]:
        raise HTTPException(404, f"Genre '{genre_id}' not found")
    return m["get_word_count_assessment"](genre_id, word_count)


# ═══════════════════════════════════════════════════════════════════════════════
# FORMAT
# ═══════════════════════════════════════════════════════════════════════════════

@app.post("/api/format", tags=["Format"])
@limiter.limit("10/minute")
async def format_manuscript(
    request: Request,
    bg: BackgroundTasks,
    file:         UploadFile = File(...),
    author:       str = Form(...),
    title:        str = Form(...),
    template_key: str = Form(default="us_standard"),
    overrides:    str = Form(default="{}"),
    api_key:      str = Form(default=""),  # OpenRouter key for AI parse assist
    ai_model:     str = Form(default="mistralai/mistral-7b-instruct:free"),
    _auth=Depends(require_api_key),
):
    """
    Upload a .docx manuscript → download a perfectly formatted .docx.
    The ai_key/ai_model fields are optional — provide them to use AI-assisted
    chapter/scene-break pattern detection in the parser.
    """
    import copy
    m = _mods()

    author = san(author, 200)
    title  = san(title, 300)
    if not author or not title:
        raise HTTPException(400, "author and title are required")

    try:
        ov = json.loads(overrides) if overrides else {}
    except json.JSONDecodeError:
        ov = {}

    TEMPLATES = m["TEMPLATES"]
    if template_key not in TEMPLATES:
        raise HTTPException(400, f"Unknown template '{template_key}'")

    inp = out = None
    try:
        # Parse the manuscript (AI-assisted if api_key provided)
        inp, word_count, parsed, _ = await _parse_upload(
            file, api_key=api_key, ai_model=ai_model
        )

        # Apply overrides to template
        tpl = copy.deepcopy(TEMPLATES[template_key])
        if ov.get("font"):    tpl.font_name    = ov["font"]
        if ov.get("size"):    tpl.font_size_pt = int(ov["size"])
        if ov.get("spacing"): tpl.line_spacing  = ov["spacing"]
        if ov.get("page"):    tpl.page_size     = ov["page"]

        # Build formatted doc
        with tempfile.NamedTemporaryFile(delete=False, suffix=".docx") as f:
            out = f.name

        # NovelFormatter(template, author, title, word_count)
        fmt = m["NovelFormatter"](tpl, author=author, title=title, word_count=word_count)
        # .build(paragraphs, output_path) → (output_path, warnings)
        _, warnings = fmt.build(parsed, out)

        safe_title = re.sub(r"[^\w\s-]", "", title).strip().replace(" ", "_")[:50]
        filename   = f"{safe_title}_{template_key}_formatted.docx"

        with open(out, "rb") as f:
            content = f.read()

        bg.add_task(rm, inp)
        bg.add_task(rm, out)

        return StreamingResponse(
            io.BytesIO(content),
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"',
                "X-Word-Count":        str(word_count),
                "X-Warnings":          json.dumps(warnings[:10]),
                "X-Template-Applied":  template_key,
            },
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Format error")
        bg.add_task(rm, inp)
        bg.add_task(rm, out)
        raise HTTPException(500, f"Formatting failed: {str(e)[:300]}")


# ═══════════════════════════════════════════════════════════════════════════════
# ANALYSE
# ═══════════════════════════════════════════════════════════════════════════════

@app.post("/api/analyse", tags=["Analyse"])
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
        raise HTTPException(500, f"Analysis failed: {str(e)[:300]}")


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
# QUERY — Manual mode
# ═══════════════════════════════════════════════════════════════════════════════

@app.post("/api/query/manual", tags=["Query"])
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
        raise HTTPException(500, f"Query generation failed: {str(e)[:300]}")


# ═══════════════════════════════════════════════════════════════════════════════
# QUERY — AI mode (reads the actual manuscript)
# ═══════════════════════════════════════════════════════════════════════════════

@app.post("/api/query/ai", tags=["Query"])
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
        raise HTTPException(500, f"AI query generation failed: {str(e)[:300]}")


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


# ═══════════════════════════════════════════════════════════════════════════════
# STARTUP / SHUTDOWN
# ═══════════════════════════════════════════════════════════════════════════════

@app.on_event("startup")
async def _startup():
    logger.info(f"Author Studio Pro API v2.0 starting")
    logger.info(f"Studio path: {STUDIO_PATH}")
    logger.info(f"Allowed origins: {ALLOWED_ORIGINS}")


@app.on_event("shutdown")
async def _shutdown():
    logger.info("Author Studio Pro API shutting down")


# ─── Entry ────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=os.getenv("HOST", "0.0.0.0"),
        port=int(os.getenv("PORT", "8000")),
        reload=os.getenv("RELOAD", "true").lower() == "true",
        log_level="info",
    )
