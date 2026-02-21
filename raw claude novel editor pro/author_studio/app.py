"""
app.py — Author Studio Pro
===========================
Multi-tab professional author toolset.
Run with:  streamlit run app.py

Tabs:
  1. Format      — Manuscript formatting engine (5 international templates)
  2. Analyse     — Readability, style, pacing, editorial flags
  3. Market      — Genre benchmarking, word count intelligence, rejection flags
  4. Query       — Query letter, synopsis, back matter generator
  5. Guide       — Submission knowledge base
"""

import os, re, copy, tempfile, zipfile, io
import streamlit as st

from templates       import TEMPLATES, NovelTemplate
from parser          import ManuscriptParser
from formatter       import NovelFormatter, count_words_in_docx, extract_raw_paragraphs
from analyzer        import ManuscriptAnalyzer
from genre_db        import GENRES, get_word_count_assessment
from query_builder   import QueryPackageData, build_full_package
from ai_analyst      import run_ai_analysis
from ai_query_writer import run_ai_query_generation


# ─────────────────────────────────────────────────────────────────────────────
# Page config & CSS
# ─────────────────────────────────────────────────────────────────────────────
st.set_page_config(
    page_title="Author Studio Pro",
    page_icon="✍️",
    layout="wide",
    initial_sidebar_state="expanded",
)

st.markdown("""
<style>
  .brand       { font-size:1.9rem; font-weight:800; color:#1a1a2e; }
  .brand-sub   { font-size:0.9rem; color:#6B7280; margin-bottom:0.5rem; }
  .tab-header  { font-size:1.35rem; font-weight:700; color:#1a1a2e; margin-bottom:0.2rem; }
  .tab-sub     { font-size:0.88rem; color:#6B7280; margin-bottom:1.2rem; }

  .kpi         { background:#F9FAFB; border:1px solid #E5E7EB; border-radius:10px;
                 padding:1rem; text-align:center; }
  .kpi-val     { font-size:1.7rem; font-weight:700; color:#111827; }
  .kpi-lbl     { font-size:0.75rem; color:#9CA3AF; margin-top:0.1rem; }

  .flag-box    { background:#FEF3C7; border-left:4px solid #F59E0B;
                 padding:0.75rem 1rem; border-radius:4px; margin:0.4rem 0; }
  .ok-box      { background:#ECFDF5; border-left:4px solid #10B981;
                 padding:0.75rem 1rem; border-radius:4px; margin:0.4rem 0; }
  .info-box    { background:#EFF6FF; border-left:4px solid #3B82F6;
                 padding:0.75rem 1rem; border-radius:4px; }
  .warn-box    { background:#FFF7ED; border-left:4px solid #F97316;
                 padding:0.75rem 1rem; border-radius:4px; margin:0.4rem 0; }
  .red-box     { background:#FEF2F2; border-left:4px solid #EF4444;
                 padding:0.75rem 1rem; border-radius:4px; margin:0.4rem 0; }

  .tpl-card    { background:#F3F4F6; border-radius:8px; padding:0.8rem 1rem;
                 margin-top:0.3rem; font-size:0.82rem; line-height:1.65; }

  div[data-testid="stDownloadButton"] > button {
    background:#1a1a2e; color:#fff; font-size:0.95rem;
    padding:0.55rem 0; border-radius:7px; width:100%; border:none;
  }
  div[data-testid="stDownloadButton"] > button:hover { background:#2d2d4e; }
</style>
""", unsafe_allow_html=True)


# ─────────────────────────────────────────────────────────────────────────────
# Session state helpers
# ─────────────────────────────────────────────────────────────────────────────
def _ss(key, default=None):
    if key not in st.session_state:
        st.session_state[key] = default
    return st.session_state[key]


# ─────────────────────────────────────────────────────────────────────────────
# Sidebar
# ─────────────────────────────────────────────────────────────────────────────
def sidebar() -> dict:
    st.sidebar.markdown('<div class="brand">✍️ Author Studio Pro</div>', unsafe_allow_html=True)
    st.sidebar.markdown('<div class="brand-sub">The complete author\'s toolkit</div>', unsafe_allow_html=True)
    st.sidebar.markdown("---")

    st.sidebar.markdown("### 📄 Your Manuscript")
    author = st.sidebar.text_input("Author Name",  placeholder="Jane Smith",      key="sb_author")
    title  = st.sidebar.text_input("Book Title",   placeholder="The Lost Hours",  key="sb_title")
    email  = st.sidebar.text_input("Email",        placeholder="you@email.com",   key="sb_email")

    st.sidebar.markdown("---")
    st.sidebar.markdown("### 🗂 Formatting Template")
    tpl_keys   = list(TEMPLATES.keys())
    tpl_labels = [TEMPLATES[k].name for k in tpl_keys]
    idx = st.sidebar.selectbox("Standard", range(len(tpl_keys)),
                               format_func=lambda i: tpl_labels[i], key="sb_tpl")
    chosen_key = tpl_keys[idx]
    base_tpl   = TEMPLATES[chosen_key]

    st.sidebar.markdown(
        f'<div class="tpl-card">'
        f'<b>Font:</b> {base_tpl.font_name} {base_tpl.font_size_pt}pt<br>'
        f'<b>Spacing:</b> {base_tpl.line_spacing.replace("_"," ").title()}<br>'
        f'<b>Margins:</b> {base_tpl.margin_top_in}″ · <b>Page:</b> {base_tpl.page_size.upper()}<br>'
        f'<b>Authority:</b> {base_tpl.authority}</div>',
        unsafe_allow_html=True,
    )

    st.sidebar.markdown("---")
    st.sidebar.markdown("### 🎨 Custom Overrides")
    DFLT = "— template default —"

    with st.sidebar.expander("Font & Spacing"):
        font_opts = [DFLT,"Times New Roman","Garamond","Georgia",
                     "Palatino Linotype","Book Antiqua","Courier New","Bookman Old Style"]
        ov_font    = st.selectbox("Font",        font_opts,              key="ov_font")
        size_opts  = [DFLT]+[str(n) for n in range(9,15)]
        ov_size    = st.selectbox("Size (pt)",   size_opts,              key="ov_size")
        sp_opts    = {DFLT:None,"Single":"single","1.5 Lines":"one_half","Double":"double"}
        ov_sp      = st.selectbox("Line Spacing",list(sp_opts.keys()),   key="ov_sp")

    with st.sidebar.expander("Margins & Page"):
        m_opts = [DFLT,"0.75\"","0.875\"","1.0\"","1.125\"","1.25\"","1.5\""]
        ov_mt  = st.selectbox("Top",    m_opts, key="ov_mt")
        ov_mb  = st.selectbox("Bottom", m_opts, key="ov_mb")
        ov_ml  = st.selectbox("Left",   m_opts, key="ov_ml")
        ov_mr  = st.selectbox("Right",  m_opts, key="ov_mr")
        ov_pg  = st.selectbox("Page Size",[DFLT,"US Letter","A4"],       key="ov_pg")
        ov_jst = st.selectbox("Alignment",[DFLT,"Justified","Ragged Right"],key="ov_jst")

    with st.sidebar.expander("Chapter Headings"):
        ov_hb  = st.selectbox("Bold",    [DFLT,"Yes","No"], key="ov_hb")
        ov_hc  = st.selectbox("All Caps",[DFLT,"Yes","No"], key="ov_hc")
        ov_hp  = st.selectbox("Position",[DFLT,"Third Down","Top of Page"],key="ov_hp")
        ov_sb  = st.text_input("Scene Break Symbol", placeholder="e.g. * * *", key="ov_sb")

    st.sidebar.markdown("---")
    st.sidebar.markdown("### 🤖 AI Pattern Learning")
    st.sidebar.caption("**One AI call per document.** Fixed ~2,000 token cost regardless of manuscript length.")
    use_ai  = st.sidebar.checkbox("Enable", value=False, key="sb_ai")
    api_key = ""
    ai_model = "mistralai/mistral-7b-instruct:free"
    if use_ai:
        api_key  = st.sidebar.text_input("OpenRouter Key", type="password",
                                          placeholder="sk-or-v1-…", key="sb_key")
        ai_model = st.sidebar.selectbox("Model",[
            "mistralai/mistral-7b-instruct:free",
            "meta-llama/llama-3.2-3b-instruct:free",
            "google/gemma-3-1b-it:free",
            "mistralai/mistral-nemo:free",
        ], key="sb_model",
        help="Mistral 7B recommended — strongest instruction-following on the free tier.")

    def _f(v): return None if v==DFLT else v
    overrides = {
        "font":    _f(ov_font),
        "size":    None if _f(ov_size) is None else int(ov_size),
        "spacing": sp_opts.get(ov_sp),
        "mt":      None if _f(ov_mt) is None else float(ov_mt.replace('"','')),
        "mb":      None if _f(ov_mb) is None else float(ov_mb.replace('"','')),
        "ml":      None if _f(ov_ml) is None else float(ov_ml.replace('"','')),
        "mr":      None if _f(ov_mr) is None else float(ov_mr.replace('"','')),
        "page":    None if _f(ov_pg) is None else ("a4" if "A4" in ov_pg else "letter"),
        "just":    None if _f(ov_jst) is None else (ov_jst=="Justified"),
        "hbold":   None if _f(ov_hb) is None else (ov_hb=="Yes"),
        "hcaps":   None if _f(ov_hc) is None else (ov_hc=="Yes"),
        "hpos":    None if _f(ov_hp) is None else ("third_down" if "Third" in ov_hp else "top"),
        "scene":   ov_sb.strip() or None,
    }

    return dict(author=author, title=title, email=email,
                tpl_key=chosen_key, overrides=overrides,
                use_ai=use_ai, api_key=api_key, ai_model=ai_model)


def apply_overrides(base: NovelTemplate, ov: dict) -> NovelTemplate:
    t = copy.deepcopy(base)
    if ov["font"]:    t.font_name              = ov["font"]
    if ov["size"]:    t.font_size_pt           = ov["size"]
    if ov["spacing"]: t.line_spacing           = ov["spacing"]
    if ov["mt"]:      t.margin_top_in          = ov["mt"]
    if ov["mb"]:      t.margin_bottom_in       = ov["mb"]
    if ov["ml"]:      t.margin_left_in         = ov["ml"]
    if ov["mr"]:      t.margin_right_in        = ov["mr"]
    if ov["page"]:    t.page_size              = ov["page"]
    if ov["just"] is not None:  t.body_justified       = ov["just"]
    if ov["hbold"] is not None: t.chapter_bold         = ov["hbold"]
    if ov["hcaps"] is not None: t.chapter_all_caps     = ov["hcaps"]
    if ov["hpos"]:    t.chapter_start_position = ov["hpos"]
    if ov["scene"]:   t.scene_break_text       = ov["scene"]
    return t


# ─────────────────────────────────────────────────────────────────────────────
# Shared upload / parse logic (cached in session state)
# ─────────────────────────────────────────────────────────────────────────────
def upload_and_parse_section(cfg: dict):
    """
    Renders file upload widget and runs the parse pipeline.
    Results are cached in session_state so other tabs can reuse them
    without re-processing.
    Returns (input_path, word_count, parsed, learned) or (None,...) if no file.
    """
    uploaded = st.file_uploader(
        "Upload your manuscript (.docx)",
        type=["docx"],
        key="main_upload",
        help="The original file is never modified. A new formatted document is created.",
    )

    if not uploaded:
        st.markdown('<div class="info-box">👆 Upload your .docx manuscript to get started.</div>',
                    unsafe_allow_html=True)
        return None, 0, None, None

    # Write to temp file (cache by name+size to avoid re-processing)
    file_id = f"{uploaded.name}_{uploaded.size}"
    if st.session_state.get("_file_id") != file_id:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".docx") as tmp:
            tmp.write(uploaded.getvalue())
            st.session_state["_input_path"]   = tmp.name
            st.session_state["_file_id"]      = file_id
            st.session_state["_parsed"]       = None   # invalidate cache
            st.session_state["_word_count"]   = None

    input_path = st.session_state["_input_path"]

    if st.session_state.get("_word_count") is None:
        st.session_state["_word_count"] = count_words_in_docx(input_path)

    word_count = st.session_state["_word_count"]

    if st.session_state.get("_parsed") is None:
        with st.spinner("Analysing document structure…"):
            raw = extract_raw_paragraphs(input_path)
            parser = ManuscriptParser(
                api_key=cfg["api_key"] if cfg["use_ai"] else None,
                model=cfg["ai_model"],
            )
            parsed, learned = parser.parse(raw)
            st.session_state["_parsed"]  = parsed
            st.session_state["_learned"] = learned

    return (
        input_path,
        word_count,
        st.session_state["_parsed"],
        st.session_state["_learned"],
    )


# ─────────────────────────────────────────────────────────────────────────────
# TAB 1 — FORMAT
# ─────────────────────────────────────────────────────────────────────────────
def tab_format(cfg: dict):
    st.markdown('<div class="tab-header">📄 Manuscript Formatter</div>', unsafe_allow_html=True)
    st.markdown('<div class="tab-sub">Applies international publishing standards to your manuscript and generates a publish-ready .docx file.</div>', unsafe_allow_html=True)

    author = cfg["author"].strip()
    title  = cfg["title"].strip()

    if not author or not title:
        st.warning("Fill in Author Name and Book Title in the sidebar to continue.")
        return

    input_path, word_count, parsed, learned = upload_and_parse_section(cfg)
    if not parsed:
        return

    from parser import ManuscriptParser as MP
    stats = MP.summarise(parsed)

    # Stats row
    c1,c2,c3,c4,c5 = st.columns(5)
    def kpi(col, val, lbl):
        col.markdown(f'<div class="kpi"><div class="kpi-val">{val}</div><div class="kpi-lbl">{lbl}</div></div>',
                     unsafe_allow_html=True)
    kpi(c1, f"{word_count:,}",             "Total Words")
    kpi(c2, f"{len(parsed):,}",            "Paragraphs")
    kpi(c3, stats["chapter_count"],        "Chapters")
    kpi(c4, stats["scene_break_count"],    "Scene Breaks")
    kpi(c5, "AI" if learned.source=="ai" else "Rules", "Pattern Mode")
    st.markdown("<br>", unsafe_allow_html=True)

    if stats["chapter_titles"]:
        with st.expander(f"🗂 {len(stats['chapter_titles'])} chapters detected"):
            for ct in stats["chapter_titles"]:
                st.markdown(f"- {ct}")

    if stats["issues_sample"]:
        with st.expander(f"🔧 {stats['issues_count']} auto-fixes applied"):
            for issue in stats["issues_sample"]:
                st.markdown(f'<div class="flag-box">{issue}</div>', unsafe_allow_html=True)

    st.markdown("---")

    final_tpl = apply_overrides(TEMPLATES[cfg["tpl_key"]], cfg["overrides"])

    if st.button("⚙️ Format Manuscript", type="primary", use_container_width=True):
        with tempfile.NamedTemporaryFile(delete=False, suffix=".docx") as tmp_out:
            output_path = tmp_out.name

        with st.spinner("Building formatted document…"):
            fmt = NovelFormatter(final_tpl, author=author, title=title, word_count=word_count)
            _, warnings = fmt.build(parsed, output_path)

        st.markdown('<div class="ok-box">✅ Formatting complete. Download below.</div>',
                    unsafe_allow_html=True)
        for w in warnings:
            st.warning(w)

        safe   = re.sub(r"[^\w\s-]","",title).strip().replace(" ","_")
        dl_name = f"{safe}_{cfg['tpl_key']}_formatted.docx"
        with open(output_path,"rb") as f:
            st.download_button("⬇️  Download Formatted Manuscript", f.read(),
                               file_name=dl_name,
                               mime="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                               use_container_width=True)

        with st.expander("📋 Settings applied"):
            t = final_tpl
            st.markdown(f"""
| Setting | Value |
|---|---|
| Template | {t.name} |
| Font | {t.font_name} {t.font_size_pt}pt |
| Chapter Heading | {t.chapter_font_size_pt}pt · Bold: {t.chapter_bold} · Caps: {t.chapter_all_caps} |
| Line Spacing | {t.line_spacing.replace("_"," ").title()} |
| First-Line Indent | {t.first_line_indent_in}" |
| Margins (T/B/L/R) | {t.margin_top_in}" / {t.margin_bottom_in}" / {t.margin_left_in}" / {t.margin_right_in}" |
| Page Size | {t.page_size.upper()} |
| Alignment | {"Justified" if t.body_justified else "Ragged Right"} |
| Running Header | {"Yes — " + t.header_format if t.include_running_header else "No"} |
| Scene Break | `{t.scene_break_text}` |
""")


# ─────────────────────────────────────────────────────────────────────────────
# TAB 2 — ANALYSE
# ─────────────────────────────────────────────────────────────────────────────
def tab_analyse(cfg: dict):
    st.markdown('<div class="tab-header">🔬 Manuscript Analysis</div>', unsafe_allow_html=True)
    st.markdown(
        '<div class="tab-sub">Two-layer analysis: structural statistics (readability, pacing, '
        'style flags) combined with AI narrative intelligence that reads your actual prose and '
        'comments on it the way a development editor does — with specific quotes from your manuscript.</div>',
        unsafe_allow_html=True,
    )

    input_path, word_count, parsed, _ = upload_and_parse_section(cfg)
    if not parsed:
        return

    genre_opts    = {k: v.name for k, v in GENRES.items()}
    chosen_genre  = st.selectbox("Your genre (for contextualised benchmarks):",
                                 list(genre_opts.keys()), format_func=lambda k: genre_opts[k],
                                 key="an_genre")

    ai_available  = cfg["use_ai"] and bool(cfg["api_key"])
    if not ai_available:
        st.markdown(
            '<div class="info-box">💡 <b>AI Narrative Analysis is off.</b> '
            'Enable AI in the sidebar and provide an OpenRouter key to unlock the editorial '
            'commentary layer — voice assessment, prose critique, pacing notes, and overall '
            'verdict with direct quotes from your manuscript.</div>',
            unsafe_allow_html=True,
        )

    if st.button("🔬 Run Full Analysis", type="primary", use_container_width=True):
        with st.spinner("Running structural analysis…"):
            analyzer = ManuscriptAnalyzer()
            report   = analyzer.analyse(parsed)
            st.session_state["_report"]    = report

        if ai_available:
            with st.spinner(
                "AI is reading your opening, midpoint, and closing chapters… "
                "(3 API calls — approx. 30–60 seconds)"
            ):
                try:
                    ai_report = run_ai_analysis(
                        parsed=parsed,
                        api_key=cfg["api_key"],
                        model=cfg["ai_model"],
                        genre=GENRES[chosen_genre].name,
                    )
                    st.session_state["_ai_report"] = ai_report
                except Exception as e:
                    st.warning(f"AI analysis encountered an error: {e}. Structural analysis still available below.")
                    st.session_state["_ai_report"] = None

    report    = st.session_state.get("_report")
    ai_report = st.session_state.get("_ai_report")

    if not report:
        st.info("Click 'Run Full Analysis' above to generate your report.")
        return

    r = report.readability
    s = report.style
    p = report.pacing

    # ── Document Overview ──
    st.markdown("#### Document Overview")
    cols = st.columns(6)
    def kpi(col, v, l):
        col.markdown(f'<div class="kpi"><div class="kpi-val">{v}</div>'
                     f'<div class="kpi-lbl">{l}</div></div>', unsafe_allow_html=True)
    kpi(cols[0], f"{report.total_words:,}",        "Words")
    kpi(cols[1], f"{report.total_sentences:,}",     "Sentences")
    kpi(cols[2], f"{report.total_chapters}",        "Chapters")
    kpi(cols[3], f"{report.unique_words:,}",        "Unique Words")
    kpi(cols[4], f"{report.lexical_diversity:.2f}", "Lexical Diversity")
    kpi(cols[5], f"{s.dialogue_pct:.0f}%",          "Dialogue %")
    st.markdown("<br>", unsafe_allow_html=True)

    # ═══════════════════════════════════════════════════════════════
    # AI NARRATIVE ANALYSIS — the editorial layer
    # ═══════════════════════════════════════════════════════════════
    if ai_report:
        st.markdown("---")
        st.markdown("#### 🤖 AI Editorial Assessment")
        st.caption(f"Model: {ai_report.model_used} · Sections read: Opening"
                   + (", Midpoint" if ai_report.midpoint_analysis else "")
                   + (", Closing" if ai_report.closing_analysis else ""))

        # Overall verdict — the most valuable output
        if ai_report.overall_verdict:
            st.markdown("**Overall Verdict**")
            st.markdown(
                f'<div class="info-box" style="font-size:1.0rem;line-height:1.7">'
                f'{ai_report.overall_verdict}</div>',
                unsafe_allow_html=True,
            )
            st.markdown("<br>", unsafe_allow_html=True)

        # Strengths and Priorities side by side
        str_col, pri_col = st.columns(2)
        with str_col:
            st.markdown("**✅ Top 3 Strengths**")
            for strength in ai_report.top_3_strengths:
                st.markdown(f'<div class="ok-box">✅ {strength}</div>',
                            unsafe_allow_html=True)
        with pri_col:
            st.markdown("**🎯 Top 3 Revision Priorities**")
            for priority in ai_report.top_3_priorities:
                st.markdown(f'<div class="flag-box">🎯 {priority}</div>',
                            unsafe_allow_html=True)

        st.markdown("<br>", unsafe_allow_html=True)

        # Cross-manuscript observations
        if ai_report.voice_consistency:
            st.markdown("**Voice Consistency Across Manuscript**")
            st.markdown(ai_report.voice_consistency)
        if ai_report.arc_assessment:
            st.markdown("**Story Arc Assessment**")
            st.markdown(ai_report.arc_assessment)

        # Section-by-section editorial notes
        st.markdown("---")
        st.markdown("#### Section-by-Section Editorial Notes")
        st.caption("The AI read your actual prose in each section and commented directly on it.")

        for section_analysis, label, icon in [
            (ai_report.opening_analysis,  "Opening",  "📖"),
            (ai_report.midpoint_analysis, "Midpoint", "⚡"),
            (ai_report.closing_analysis,  "Closing",  "🏁"),
        ]:
            if not section_analysis:
                continue
            with st.expander(f"{icon} {label} — {section_analysis.chapter_name}"):
                if section_analysis.hook_effectiveness:
                    st.markdown("**Hook Effectiveness**")
                    st.markdown(section_analysis.hook_effectiveness)
                if section_analysis.voice_assessment:
                    st.markdown("**Voice**")
                    st.markdown(section_analysis.voice_assessment)
                if section_analysis.prose_quality:
                    st.markdown("**Prose Quality**")
                    st.markdown(section_analysis.prose_quality)
                if section_analysis.pacing_assessment:
                    st.markdown("**Pacing**")
                    st.markdown(section_analysis.pacing_assessment)
                if section_analysis.tension_level:
                    st.markdown("**Tension & Forward Momentum**")
                    st.markdown(section_analysis.tension_level)
                if section_analysis.specific_strength:
                    st.markdown(
                        f'<div class="ok-box">✅ <b>What is working:</b> '
                        f'{section_analysis.specific_strength}</div>',
                        unsafe_allow_html=True,
                    )
                if section_analysis.specific_concern:
                    st.markdown(
                        f'<div class="flag-box">⚠️ <b>Key concern:</b> '
                        f'{section_analysis.specific_concern}</div>',
                        unsafe_allow_html=True,
                    )
                if section_analysis.editorial_recommendation:
                    st.markdown(
                        f'<div class="red-box">🎯 <b>Editorial instruction:</b> '
                        f'{section_analysis.editorial_recommendation}</div>',
                        unsafe_allow_html=True,
                    )

    # ═══════════════════════════════════════════════════════════════
    # STRUCTURAL STATISTICS — always present
    # ═══════════════════════════════════════════════════════════════
    st.markdown("---")
    st.markdown("#### Readability & Style Metrics")

    rc1, rc2, rc3 = st.columns(3)
    rc1.metric("Flesch Reading Ease",  f"{r.flesch_ease}",
               help="Target: 60–80 for commercial fiction. Lower = more complex.")
    rc2.metric("Flesch-Kincaid Grade", f"{r.flesch_kincaid}",
               help="US school grade level. Target: 5–9 for commercial fiction.")
    rc3.metric("Gunning Fog Index",    f"{r.gunning_fog}",
               help="Target: 8–12 for literary fiction.")
    st.markdown(f'<div class="info-box">📖 {r.interpretation}</div>', unsafe_allow_html=True)

    st.markdown("<br>", unsafe_allow_html=True)
    sc1, sc2, sc3, sc4 = st.columns(4)
    sc1.metric("Avg Sentence Length", f"{r.avg_sentence_words} words",
               help="Target: 12–20 words for commercial fiction.")
    sc2.metric("Sentence Variance",   f"±{s.sentence_length_variance}",
               help="Higher variance = more rhythmic prose. Very low = monotonous.")
    sc3.metric("Adverb Density",      f"{s.adverb_density:.1f}/1k",
               help="Target: under 5 per 1,000 words.")
    sc4.metric("Passive Voice",       f"{s.passive_voice_pct:.1f}%",
               help="Target: under 10%. High passive reduces immediacy.")

    if s.most_frequent_words:
        with st.expander("📊 Most Frequent Content Words"):
            st.caption("High-frequency content words after filtering stop words. Review for unintentional repetition.")
            for word, count in s.most_frequent_words[:12]:
                st.markdown(f"`{word}` — {count}×  {'█' * min(count, 25)}")

    if s.repeated_phrases:
        with st.expander("🔁 Repeated 3-Word Phrases"):
            st.caption("Phrases appearing 3+ times. Editors always catch these; authors rarely see them.")
            for phrase, count in s.repeated_phrases:
                st.markdown(
                    f'<div class="flag-box">"{phrase}" — appears <b>{count} times</b></div>',
                    unsafe_allow_html=True,
                )

    st.markdown("#### Chapter Pacing Profile")
    st.caption(p.pacing_verdict)
    if p.chapter_word_counts and len(p.chapter_word_counts) > 1:
        try:
            st.bar_chart(data={c[0][:20]: c[1] for c in p.chapter_word_counts}, height=260)
        except Exception:
            pass
        pc1, pc2, pc3, pc4 = st.columns(4)
        pc1.metric("Avg Chapter",   f"{int(p.chapter_avg):,}w")
        pc2.metric("Std Deviation", f"±{int(p.chapter_std_dev):,}w")
        pc3.metric("Longest",       f"{p.longest_chapter[0][:15]}: {p.longest_chapter[1]:,}w")
        pc4.metric("Shortest",      f"{p.shortest_chapter[0][:15]}: {p.shortest_chapter[1]:,}w")

    st.markdown("#### Statistical Editorial Flags")
    if report.editorial_flags:
        for flag in report.editorial_flags:
            st.markdown(f'<div class="flag-box">⚠️ {flag}</div>', unsafe_allow_html=True)
    else:
        st.markdown('<div class="ok-box">✅ No statistical issues detected.</div>',
                    unsafe_allow_html=True)


# ─────────────────────────────────────────────────────────────────────────────
# TAB 3 — MARKET
# ─────────────────────────────────────────────────────────────────────────────
def tab_market(cfg: dict):
    st.markdown('<div class="tab-header">📈 Market Intelligence</div>', unsafe_allow_html=True)
    st.markdown('<div class="tab-sub">Genre benchmarks, word count viability, agent expectations, and rejection triggers — the intelligence that used to require expensive publishing consultants.</div>', unsafe_allow_html=True)

    word_count = st.session_state.get("_word_count", 0)
    if word_count == 0:
        st.info("Upload your manuscript in the Format tab first to get personalised market intelligence.")
        word_count = st.number_input("Or enter your word count manually:", min_value=0, step=1000, value=0)

    genre_opts = {k: v.name for k, v in GENRES.items()}
    chosen_genre_id = st.selectbox(
        "Select your genre:",
        list(genre_opts.keys()),
        format_func=lambda k: genre_opts[k],
    )
    g = GENRES[chosen_genre_id]

    st.markdown("---")

    if word_count > 0:
        assessment = get_word_count_assessment(chosen_genre_id, word_count)
        colour_map = {"green":"ok-box","yellow":"flag-box","orange":"warn-box","red":"red-box","gray":"info-box"}
        box_class  = colour_map.get(assessment.get("colour","gray"), "info-box")
        st.markdown(
            f'<div class="{box_class}"><b>{assessment["label"]}</b><br>{assessment["message"]}</div>',
            unsafe_allow_html=True,
        )
        st.markdown("<br>", unsafe_allow_html=True)

        # Word count range visualisation
        st.markdown("**Genre Word Count Range**")
        progress_pct = min(word_count / g.wc_max, 1.0) if g.wc_max else 0
        st.progress(progress_pct)
        st.caption(
            f"Min: {g.wc_min:,} · Sweet spot: {g.wc_sweet:,} · "
            f"Max: {g.wc_max:,} · Debut ceiling: {g.wc_debut_max:,}"
        )
        st.markdown("---")

    # Genre deep-dive
    col_a, col_b = st.columns([3, 2])

    with col_a:
        st.markdown(f"#### {g.name}")
        st.caption(f"Authority: {g.authority}")
        st.markdown(g.description)

        st.markdown("**Market Context**")
        st.markdown(g.market_note)

        st.markdown("**What Agents Are Saying Right Now**")
        st.markdown(g.agent_note)

        st.markdown("**Advice for Debut Authors**")
        st.markdown(f'<div class="info-box">{g.debut_note}</div>', unsafe_allow_html=True)

        st.markdown("**How to Write Your Comp Titles**")
        st.markdown(g.comp_note)

    with col_b:
        st.markdown("**Word Count Targets**")
        st.table({
            "Minimum":         [f"{g.wc_min:,}"],
            "Sweet Spot":      [f"{g.wc_sweet:,}"],
            "Maximum":         [f"{g.wc_max:,}"],
            "Debut Ceiling":   [f"{g.wc_debut_max:,}"],
        })

        if g.chapter_count_typical:
            st.markdown(f"**Typical Chapter Count:** {g.chapter_count_typical[0]}–{g.chapter_count_typical[1]}")
        if g.pov_conventions:
            st.markdown(f"**POV Convention:** {g.pov_conventions}")
        if g.opening_hook_standard:
            st.markdown(f"**Opening Standard:** {g.opening_hook_standard}")

        st.markdown("**Top Publishers for This Genre**")
        for pub in g.publishers:
            st.markdown(f"- {pub}")

        if g.rejection_flags:
            st.markdown("**🚫 Automatic Rejection Triggers**")
            for flag in g.rejection_flags:
                st.markdown(f'<div class="red-box">🚫 {flag}</div>', unsafe_allow_html=True)


# ─────────────────────────────────────────────────────────────────────────────
# TAB 4 — QUERY
# ─────────────────────────────────────────────────────────────────────────────
def tab_query(cfg: dict):
    st.markdown('<div class="tab-header">📬 Query Package Builder</div>', unsafe_allow_html=True)
    st.markdown(
        '<div class="tab-sub">Two modes: AI-Powered (reads your actual manuscript and writes '
        'the hook, plot paragraph, and synopsis from the story itself) or Manual (you provide '
        'the story details). Professional query consultants charge $200–$800 for this package.</div>',
        unsafe_allow_html=True,
    )

    word_count = st.session_state.get("_word_count", 0)
    parsed     = st.session_state.get("_parsed")
    author     = cfg["author"]
    title      = cfg["title"]
    email      = cfg["email"]
    ai_available = cfg["use_ai"] and bool(cfg["api_key"])

    # ── Mode selector ──
    if ai_available and parsed:
        mode = st.radio(
            "Generation Mode",
            ["🤖 AI-Powered (reads your manuscript)", "✏️ Manual (I'll fill in the details)"],
            horizontal=True,
            key="q_mode",
        )
        ai_mode = "🤖" in mode
    else:
        if not ai_available:
            st.markdown(
                '<div class="info-box">💡 Enable AI in the sidebar and provide an OpenRouter key '
                'to activate AI-Powered mode, where the app reads your manuscript and writes the '
                'hook, plot paragraph, and synopsis from the actual story.</div>',
                unsafe_allow_html=True,
            )
        elif not parsed:
            st.markdown(
                '<div class="info-box">Upload your manuscript in the Format tab first to enable '
                'AI-Powered mode.</div>',
                unsafe_allow_html=True,
            )
        ai_mode = False

    st.markdown("---")

    # ── Common fields ──
    st.markdown("#### Manuscript Details")
    col1, col2 = st.columns(2)
    with col1:
        q_title   = st.text_input("Book Title",  value=title  or "", key="q_title")
        q_author  = st.text_input("Author Name", value=author or "", key="q_author")
        q_email   = st.text_input("Email",       value=email  or "", key="q_email")
        q_phone   = st.text_input("Phone",       placeholder="+1 555 000 0000", key="q_phone")
        q_address = st.text_input("Address",     placeholder="City, Country",   key="q_addr")
    with col2:
        genre_opts = {k: v.name for k, v in GENRES.items()}
        q_genre_id = st.selectbox("Genre", list(genre_opts.keys()),
                                  format_func=lambda k: genre_opts[k], key="q_genre")
        q_wc       = st.number_input("Word Count", min_value=0, step=1000,
                                     value=word_count or 0, key="q_wc")
        q_series   = st.text_input("Series Note",
                                   placeholder="e.g. Standalone with series potential",
                                   key="q_series")
        q_bio = st.text_area("Author Bio / Credits",
                             placeholder="Published in… / 45k newsletter subscribers…",
                             key="q_bio", height=80)

    # ── AI mode: optional comp overrides + generate button ──
    if ai_mode:
        st.markdown("#### Comparable Titles (Optional — AI will suggest if left blank)")
        cc1, cc2 = st.columns(2)
        q_comp1 = cc1.text_input("Your Comp 1 (Title by Author)", placeholder="Leave blank for AI suggestions", key="q_comp1")
        q_comp2 = cc2.text_input("Your Comp 2 (Title by Author)", placeholder="Leave blank for AI suggestions", key="q_comp2")

        st.markdown("#### Select Documents to Generate")
        da, db, dc, dd = st.columns(4)
        gen_ql = da.checkbox("Query Letter",    value=True,  key="gen_ql")
        gen_s1 = db.checkbox("1-Page Synopsis", value=True,  key="gen_s1")
        gen_aa = dc.checkbox("About Author",    value=True,  key="gen_aa")
        gen_cp = dd.checkbox("Copyright Page",  value=False, key="gen_cp")

        if st.button("🤖 Generate AI-Powered Package", type="primary", use_container_width=True):
            if not q_author or not q_title:
                st.error("Author name and title are required.")
            else:
                with st.spinner(
                    "AI is reading your manuscript to extract story intelligence, "
                    "generate your hook, write your synopsis, and compose your query letter… "
                    "(3 API calls — approx. 60–90 seconds)"
                ):
                    try:
                        generated = run_ai_query_generation(
                            parsed=parsed,
                            api_key=cfg["api_key"],
                            model=cfg["ai_model"],
                            author_name=q_author,
                            title=q_title,
                            genre=GENRES[q_genre_id].name,
                            word_count=int(q_wc),
                            series_note=q_series,
                            email=q_email,
                            phone=q_phone,
                            address=q_address,
                            bio_credits=q_bio,
                            comp_override_1=q_comp1,
                            comp_override_2=q_comp2,
                        )
                        st.session_state["_generated_query"] = generated
                    except Exception as e:
                        st.error(f"AI generation failed: {e}")
                        return

        generated = st.session_state.get("_generated_query")
        if generated:
            st.markdown("---")
            st.markdown('<div class="ok-box">✅ AI has read your manuscript and generated your submission package. Review all outputs before sending.</div>', unsafe_allow_html=True)
            st.markdown("<br>", unsafe_allow_html=True)

            # Show story intelligence extracted from the manuscript
            with st.expander("🧠 Story Intelligence Extracted from Your Manuscript"):
                st.caption("This is what the AI extracted directly from your prose — not from form fields.")
                if generated.protagonist_summary:
                    st.markdown(f"**Protagonist:** {generated.protagonist_summary}")
                if generated.central_conflict:
                    st.markdown(f"**Central Conflict:** {generated.central_conflict}")
                if generated.stakes:
                    st.markdown(f"**Stakes:** {generated.stakes}")
                if generated.theme_sentence:
                    st.markdown(f"**Theme:** {generated.theme_sentence}")
                if generated.genre_detected:
                    st.markdown(f"**Genre Confirmed:** {generated.genre_detected}")
                if generated.tone_detected:
                    st.markdown(f"**Tone:** {generated.tone_detected}")

            if generated.hook_sentence:
                st.markdown("**Generated Hook Sentence**")
                st.markdown(
                    f'<div class="ok-box" style="font-size:1.05rem;font-style:italic;">'
                    f'"{generated.hook_sentence}"</div>',
                    unsafe_allow_html=True,
                )
                st.caption("This is the most important sentence in your query letter. Refine it until it is perfect.")

            if generated.comp_suggestions:
                with st.expander("📚 AI-Suggested Comparable Titles"):
                    st.caption("Based on genre, tone, and themes detected in your manuscript.")
                    for comp in generated.comp_suggestions:
                        st.markdown(f"- {comp}")

            if generated.synopsis_draft:
                with st.expander("📄 Generated Synopsis (review and edit before use)"):
                    st.caption("Written from your manuscript's actual plot. Edit before sending — the AI may have inferred some details.")
                    st.markdown(generated.synopsis_draft)

            if generated.query_letter_draft:
                with st.expander("📝 Generated Query Letter (personalise before sending)"):
                    st.caption("Personalise the agent's name, verify all story details, and replace any placeholder text before sending.")
                    st.code(generated.query_letter_draft, language=None)

            # Build and offer download package
            st.markdown("#### Download Your Package")
            with tempfile.TemporaryDirectory() as tmpdir:
                data = QueryPackageData(
                    title=q_title, author_name=q_author,
                    genre=GENRES[q_genre_id].name, word_count=int(q_wc),
                    series_note=q_series, email=q_email, phone=q_phone,
                    address=q_address, bio_credits=q_bio,
                    synopsis_plot=generated.synopsis_draft,
                )
                # Override synopsis and query letter with AI-generated content
                files = build_full_package(
                    data, tmpdir,
                    include_query=gen_ql, include_synopsis_1=gen_s1,
                    include_synopsis_3=False, include_back_matter=(gen_aa or gen_cp),
                )
                zip_buf = io.BytesIO()
                with zipfile.ZipFile(zip_buf, "w", zipfile.ZIP_DEFLATED) as zf:
                    for _, path in files.items():
                        if os.path.exists(path):
                            zf.write(path, os.path.basename(path))
                zip_buf.seek(0)

            safe = re.sub(r"[^\w\s-]", "", q_title).strip().replace(" ", "_")
            st.download_button(
                "⬇️  Download AI-Generated Submission Package (.zip)",
                zip_buf.getvalue(),
                file_name=f"{safe}_AI_submission_package.zip",
                mime="application/zip",
                use_container_width=True,
            )

    # ── Manual mode ──
    else:
        st.markdown("#### Story Elements")
        st.caption("Fill in the fields below. The app will format them into professional submission documents.")
        se1, se2 = st.columns(2)
        q_prot   = se1.text_input("Protagonist (name + defining trait)", key="q_prot")
        q_set    = se2.text_input("Setting (time + place)", key="q_set")
        q_inc    = st.text_input("Inciting Event", key="q_inc")
        q_conf   = st.text_input("Central Conflict", key="q_conf")
        q_stakes = st.text_input("Stakes (what is lost if they fail)", key="q_stakes")

        st.markdown("#### Comparable Titles")
        cc1, cc2, cc3 = st.columns(3)
        q_c1t = cc1.text_input("Comp 1 Title",  key="q_c1t")
        q_c1a = cc2.text_input("Comp 1 Author", key="q_c1a")
        q_c1y = cc3.text_input("Comp 1 Year",   key="q_c1y")
        cc4, cc5, cc6 = st.columns(3)
        q_c2t = cc4.text_input("Comp 2 Title",  key="q_c2t")
        q_c2a = cc5.text_input("Comp 2 Author", key="q_c2a")
        q_c2y = cc6.text_input("Comp 2 Year",   key="q_c2y")

        st.markdown("#### Synopsis")
        st.caption("Paste your full plot summary — include the ending. The app will format it correctly.")
        q_syn = st.text_area("Synopsis (spoilers included)", height=200, key="q_syn")

        with st.expander("Copyright Page (self-publishing)"):
            q_pub    = st.text_input("Publisher Name",   key="q_pub")
            q_year   = st.text_input("Year",             placeholder="2025",     key="q_year")
            q_isbn_p = st.text_input("ISBN (Print)",     placeholder="978-…",   key="q_isbp")
            q_isbn_e = st.text_input("ISBN (eBook)",     placeholder="978-…",   key="q_isbe")

        da, db, dc, dd, de = st.columns(5)
        gen_ql  = da.checkbox("Query Letter",    value=True,  key="gen_ql_m")
        gen_s1  = db.checkbox("1-Page Synopsis", value=True,  key="gen_s1_m")
        gen_s3  = dc.checkbox("3-Page Synopsis", value=True,  key="gen_s3_m")
        gen_aa  = dd.checkbox("About Author",    value=True,  key="gen_aa_m")
        gen_cp  = de.checkbox("Copyright Page",  value=False, key="gen_cp_m")

        if st.button("📦 Generate Package", type="primary", use_container_width=True):
            if not q_author or not q_title:
                st.error("Author name and title are required.")
                return
            data = QueryPackageData(
                title=q_title, author_name=q_author,
                genre=GENRES[q_genre_id].name, word_count=int(q_wc),
                series_note=q_series, email=q_email, phone=q_phone,
                address=q_address, bio_credits=q_bio,
                comp_1_title=q_c1t, comp_1_author=q_c1a, comp_1_year=q_c1y,
                comp_2_title=q_c2t, comp_2_author=q_c2a, comp_2_year=q_c2y,
                protagonist=q_prot, setting=q_set, inciting_event=q_inc,
                central_conflict=q_conf, stakes=q_stakes, synopsis_plot=q_syn,
            )
            with tempfile.TemporaryDirectory() as tmpdir:
                with st.spinner("Generating package…"):
                    files = build_full_package(data, tmpdir, include_query=gen_ql,
                                              include_synopsis_1=gen_s1, include_synopsis_3=gen_s3,
                                              include_back_matter=(gen_aa or gen_cp))
                    zip_buf = io.BytesIO()
                    with zipfile.ZipFile(zip_buf, "w", zipfile.ZIP_DEFLATED) as zf:
                        for _, path in files.items():
                            if os.path.exists(path):
                                zf.write(path, os.path.basename(path))
                    zip_buf.seek(0)

            safe = re.sub(r"[^\w\s-]", "", q_title).strip().replace(" ", "_")
            st.markdown('<div class="ok-box">✅ Package ready. Download below.</div>', unsafe_allow_html=True)
            st.download_button(
                "⬇️  Download Submission Package (.zip)",
                zip_buf.getvalue(),
                file_name=f"{safe}_submission_package.zip",
                mime="application/zip",
                use_container_width=True,
            )


# ─────────────────────────────────────────────────────────────────────────────
# TAB 5 — GUIDE
# ─────────────────────────────────────────────────────────────────────────────
def tab_guide():
    st.markdown('<div class="tab-header">📚 Author\'s Submission Guide</div>', unsafe_allow_html=True)
    st.markdown('<div class="tab-sub">The knowledge base every author needs before querying — consolidated from AAR guidelines, Publishers Marketplace, and industry standard practice.</div>', unsafe_allow_html=True)

    sections = {
        "The Query Process — End to End": """
**The traditional publishing submission process has four stages.**

First, you query literary agents — not publishers. Publishers do not accept unsolicited submissions from unagented authors. The query letter is a one-page business pitch sent to agents whose lists include your genre.

Second, if an agent is interested, they request either a partial (typically the first 50 pages) or a full manuscript. This is called a 'request for material.'

Third, if the agent reads the full manuscript and wishes to represent you, they offer representation. You then have a call (the 'offer call') to discuss their vision for the book and their submission strategy.

Fourth, your agent submits the manuscript to acquisitions editors at publishing houses. This process can take months to years.

**Timeline expectations:** A query response takes 6–12 weeks on average, though many agents have open response windows of 3–6 months. 'No response means no' is the policy of many agents — check each agent's guidelines before following up.
        """,
        "Writing a Query Letter That Gets Requests": """
**The query letter is a one-page business document, not a creative writing sample.**

It has a strict structure: opening hook (1–2 sentences), plot paragraph (3–5 sentences covering protagonist, conflict, and stakes), comparable titles (2 recent comp titles), manuscript details (title, genre, word count, series note), and author bio.

**The hook is everything.** Agents read hundreds of queries per week. The first sentence either earns the next or ends the submission. It must contain the protagonist's name and defining characteristic, the inciting event, and the central dramatic question — in as few words as possible.

**What the plot paragraph must do:** Introduce the protagonist, establish what they want, establish what stands in their way, and establish what they stand to lose. Do not reveal the ending. Do not include subplots.

**The bio:** If you have publishing credits, list them. If you do not, state simply that this is your debut novel. Agents do not penalise debut authors for having no prior credits.
        """,
        "Formatting Your Manuscript for Submission": """
**The traditional manuscript format exists for one reason:** it makes editorial marks and track changes easy to work with. It has not changed significantly since the typewriter era.

The five non-negotiable elements are: Times New Roman 12pt, double-spacing throughout, one-inch margins on all sides, a running header (Author / Title / Page number, right-aligned), and a title page with your contact information.

**The title page:** Author name and contact information top-left. Word count top-right (approximate to nearest thousand). Title centred in the middle of the page. 'A Novel' beneath the title.

**Chapter headings:** Centred, same font and size as body text. No bold, no larger size in traditional format. Each chapter begins on a new page, with the heading approximately one-third down the page.

**First paragraph of each chapter:** No first-line indent. This is an international typographic convention that applies to all published novels, though many authors are unaware of it.
        """,
        "Comparable Titles — How to Use Them Correctly": """
**Comp titles serve one purpose:** they tell the agent which shelf your book belongs on and which readership it speaks to. They are not compliments to your book.

**The rules:** Both comps must be published within the last 3 years. Both must be in the same genre or subgenre. Both must be by authors who are not famous to the point of intimidation (no Stephen King, no J.K. Rowling).

**The formula:** "X meets Y" is the simplest and most effective comp structure. "For fans of X and Y" is an acceptable alternative. A single sentence explaining why (the thematic or tonal parallel) strengthens the comp significantly.

**What comps signal:** A comp to a debut novel signals you are targeting the same readership as that debut's readers. A comp to a tenth novel by a major author signals you are targeting a large established readership. Both are valid — the key is accuracy.

**When you genuinely have no comps:** It is better to use approximate comps and note the distinction than to omit comps entirely. Agents use comps for catalogue positioning — they need some reference point.
        """,
        "Understanding Rejections": """
**Rejection is the primary experience of querying.** Debut authors typically send 50–150 queries before receiving representation. This is not unusual. It does not mean the book is unpublishable.

**Types of rejection:**

A form rejection (no personalisation) means the agent did not read beyond the query letter, or read the pages and the project was not for them. No revision is implied.

A personalised rejection noting specific feedback is rare and valuable. If an agent identifies the same issue as two or more other agents, this is signal worth acting on.

A 'revise and resubmit' (R&R) from an agent is a significant indicator of interest. They are investing time in telling you what they need to see changed. This is not a guaranteed offer — it is an invitation to try again.

**What rejection does not mean:** It does not mean the manuscript is bad. It means it was not the right project for that agent at that moment. Agents reject projects they personally love because they cannot sell them in the current market.
        """,
    }

    for heading, content in sections.items():
        with st.expander(f"📖 {heading}"):
            st.markdown(content)


# ─────────────────────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────────────────────
def main():
    cfg = sidebar()

    tab1, tab2, tab3, tab4, tab5 = st.tabs([
        "📄 Format",
        "🔬 Analyse",
        "📈 Market",
        "📬 Query",
        "📚 Guide",
    ])

    with tab1: tab_format(cfg)
    with tab2: tab_analyse(cfg)
    with tab3: tab_market(cfg)
    with tab4: tab_query(cfg)
    with tab5: tab_guide()


if __name__ == "__main__":
    main()
