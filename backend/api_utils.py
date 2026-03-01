import os
import re
import tempfile
import logging
import secrets
from functools import lru_cache

from fastapi import UploadFile, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

logger = logging.getLogger("author-studio-api")

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
