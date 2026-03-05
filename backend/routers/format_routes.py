import io
import re
import json
import logging
import copy
import tempfile
from fastapi import APIRouter, Request, HTTPException, UploadFile, File, Form, BackgroundTasks, Depends
from fastapi.responses import StreamingResponse

from rate_limiter import limiter
from api_utils import (
    require_api_key, san, rm, _mods, _parse_upload
)

logger = logging.getLogger("format_routes")
router = APIRouter()

# ═══════════════════════════════════════════════════════════════════════════════
# META & MARKET
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/api/templates", tags=["Meta"])
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


@router.get("/api/genres", tags=["Meta"])
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


@router.get("/api/market/{genre_id}", tags=["Market"])
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

@router.get("/api/genre/{genre_id}/word-count", tags=["Market"])
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

@router.post("/api/format", tags=["Format"])
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
        raise HTTPException(500, "Formatting failed")
