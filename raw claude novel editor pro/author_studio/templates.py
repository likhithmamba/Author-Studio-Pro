"""
templates.py
============
Defines five internationally recognised manuscript formatting standards.
Each template is a complete specification — every parameter the formatter
needs is encoded here. Nothing is left to guesswork.

Users can select a template and use it as-is, or override individual
settings through the app's customisation panel.
"""

from dataclasses import dataclass, field
from typing import Dict, Optional


@dataclass
class NovelTemplate:
    # ── Identity ────────────────────────────────────────────────────────────
    id:          str
    name:        str
    description: str
    best_for:    str
    authority:   str   # The publishing body / standard this follows

    # ── Body Font ───────────────────────────────────────────────────────────
    font_name:             str
    font_size_pt:          int
    chapter_font_size_pt:  int
    chapter_font_name:     Optional[str] = None  # None → same as body font

    # ── Spacing ─────────────────────────────────────────────────────────────
    line_spacing:           str = "double"  # "single" | "one_half" | "double"
    space_before_para_pt:   int   = 0
    space_after_para_pt:    int   = 0
    paragraph_gap_between:  bool  = False  # If True, blank line replaces indent

    # ── Indentation & Margins (all in inches) ────────────────────────────────
    first_line_indent_in:  float = 0.5
    margin_top_in:         float = 1.0
    margin_bottom_in:      float = 1.0
    margin_left_in:        float = 1.0
    margin_right_in:       float = 1.0

    # ── Chapter Heading Style ────────────────────────────────────────────────
    chapter_bold:               bool  = False
    chapter_italic:             bool  = False
    chapter_centered:           bool  = True
    chapter_all_caps:           bool  = False
    chapter_page_break_before:  bool  = True
    # "top" = heading at top of new page; "third_down" = pushed 1/3 down page
    chapter_start_position:     str   = "third_down"
    # Lines of blank space pushed above heading when using third_down
    chapter_blank_lines_above:  int   = 8

    # ── Page Setup ───────────────────────────────────────────────────────────
    page_size:   str  = "letter"   # "letter" | "a4"

    # ── Running Header ───────────────────────────────────────────────────────
    include_running_header:  bool  = True
    header_align_right:      bool  = True   # False = left, True = right
    # Tokens: {author}, {title}, {page}  (page inserts the PAGE field code)
    header_format:           str   = "{author} / {title} / {page}"

    # ── Scene Break ──────────────────────────────────────────────────────────
    scene_break_text:  str  = "* * *"

    # ── Justification ────────────────────────────────────────────────────────
    body_justified:  bool  = True   # False = ragged right (left-aligned)


# =============================================================================
#  TEMPLATE 1 — Traditional Manuscript  (US / UK Agent Submission)
#  Authority: Association of Authors' Representatives; UK Society of Authors
# =============================================================================
TRADITIONAL = NovelTemplate(
    id="traditional",
    name="Traditional Manuscript",
    description=(
        "The universal standard expected by literary agents and acquisitions editors "
        "at traditional publishers across the US, UK, Canada, and Australia. "
        "Double-spacing and 12pt Times New Roman are non-negotiable requirements "
        "for most agencies. This template meets every specification."
    ),
    best_for="Submitting to literary agents and traditional publishers",
    authority="Association of Authors' Representatives / UK Society of Authors",

    font_name="Times New Roman",
    font_size_pt=12,
    chapter_font_size_pt=12,

    line_spacing="double",
    space_before_para_pt=0,
    space_after_para_pt=0,

    first_line_indent_in=0.5,
    margin_top_in=1.0, margin_bottom_in=1.0,
    margin_left_in=1.0, margin_right_in=1.0,

    chapter_bold=False, chapter_italic=False,
    chapter_centered=True, chapter_all_caps=False,
    chapter_page_break_before=True, chapter_start_position="third_down",
    chapter_blank_lines_above=8,

    page_size="letter",
    include_running_header=True, header_align_right=True,
    header_format="{author} / {title} / {page}",

    scene_break_text="# ",
    body_justified=False,   # Agent submissions use ragged right
)

# =============================================================================
#  TEMPLATE 2 — Modern Trade / Literary Fiction Interior
#  Authority: Chicago Manual of Style (17th Ed.), Penguin Random House style
# =============================================================================
MODERN_LITERARY = NovelTemplate(
    id="modern",
    name="Modern Literary (Trade Publishing Interior)",
    description=(
        "Mirrors the interior page design of novels published by major trade houses "
        "such as Penguin Random House, Macmillan, and HarperCollins. Garamond at 11pt "
        "with 1.5-line spacing gives the refined, readable feel of a finished book."
    ),
    best_for="Literary fiction interior layout; co-publisher deliverables",
    authority="Chicago Manual of Style 17th Edition",

    font_name="Garamond",
    font_size_pt=11,
    chapter_font_size_pt=14,
    chapter_font_name="Garamond",

    line_spacing="one_half",
    space_before_para_pt=0,
    space_after_para_pt=0,

    first_line_indent_in=0.35,
    margin_top_in=1.0, margin_bottom_in=1.0,
    margin_left_in=1.25, margin_right_in=1.25,

    chapter_bold=True, chapter_italic=False,
    chapter_centered=True, chapter_all_caps=False,
    chapter_page_break_before=True, chapter_start_position="third_down",
    chapter_blank_lines_above=9,

    page_size="letter",
    include_running_header=True, header_align_right=True,
    header_format="{title}  ·  {page}",

    scene_break_text="* * *",
    body_justified=True,
)

# =============================================================================
#  TEMPLATE 3 — Self-Publishing: KDP Print / IngramSpark
#  Authority: Amazon KDP formatting guidelines; IngramSpark file requirements
# =============================================================================
KDP_SELF_PUBLISH = NovelTemplate(
    id="kdp",
    name="Self-Publishing (Amazon KDP / IngramSpark)",
    description=(
        "Optimised for Amazon Kindle Direct Publishing and IngramSpark print-on-demand. "
        "Georgia at 11pt is highly readable at print resolution and scales cleanly "
        "to Kindle e-ink screens. Tighter margins reduce page count, lowering print costs "
        "without sacrificing readability."
    ),
    best_for="Amazon KDP print and ebook; IngramSpark indie publishing",
    authority="Amazon KDP Content Guidelines; IngramSpark File Creation Guide",

    font_name="Georgia",
    font_size_pt=11,
    chapter_font_size_pt=16,
    chapter_font_name="Georgia",

    line_spacing="one_half",
    space_before_para_pt=0,
    space_after_para_pt=0,

    first_line_indent_in=0.3,
    margin_top_in=0.875, margin_bottom_in=0.875,
    margin_left_in=0.875, margin_right_in=0.875,

    chapter_bold=True, chapter_italic=False,
    chapter_centered=True, chapter_all_caps=True,
    chapter_page_break_before=True, chapter_start_position="third_down",
    chapter_blank_lines_above=7,

    page_size="letter",
    include_running_header=False,
    header_align_right=True,
    header_format="{page}",

    scene_break_text="* * *",
    body_justified=True,
)

# =============================================================================
#  TEMPLATE 4 — Academic / University Press
#  Authority: Chicago Manual of Style; University of Chicago Press guidelines
# =============================================================================
ACADEMIC_PRESS = NovelTemplate(
    id="academic",
    name="Academic / University Press",
    description=(
        "Follows Chicago Manual of Style specifications as required by university presses "
        "including University of Chicago Press, Oxford University Press, and MIT Press. "
        "Wider margins accommodate editorial marks. Double-spacing is mandatory."
    ),
    best_for="University presses; scholarly fiction; academic journals",
    authority="Chicago Manual of Style (17th Ed.) / University of Chicago Press",

    font_name="Times New Roman",
    font_size_pt=12,
    chapter_font_size_pt=14,

    line_spacing="double",
    space_before_para_pt=0,
    space_after_para_pt=0,

    first_line_indent_in=0.5,
    margin_top_in=1.0, margin_bottom_in=1.0,
    margin_left_in=1.25, margin_right_in=1.25,

    chapter_bold=True, chapter_italic=False,
    chapter_centered=True, chapter_all_caps=False,
    chapter_page_break_before=True, chapter_start_position="top",
    chapter_blank_lines_above=0,

    page_size="letter",
    include_running_header=True, header_align_right=True,
    header_format="{author}  {page}",

    scene_break_text="§",
    body_justified=False,
)

# =============================================================================
#  TEMPLATE 5 — International A4 (European / UK Publishers)
#  Authority: UK Society of Authors; Frankfurt Book Fair submission standards
# =============================================================================
INTERNATIONAL_A4 = NovelTemplate(
    id="a4",
    name="International A4 (European / UK Standard)",
    description=(
        "Preferred by UK and European publishers who work on A4 paper. "
        "Palatino Linotype is the most widely used serif in European trade publishing. "
        "Follows the UK Society of Authors formatting guidelines and is the correct "
        "format for Frankfurt Book Fair co-publishing submissions."
    ),
    best_for="UK agents; European publishers; Frankfurt Book Fair submissions",
    authority="UK Society of Authors / Frankfurt Book Fair",

    font_name="Palatino Linotype",
    font_size_pt=12,
    chapter_font_size_pt=14,

    line_spacing="double",
    space_before_para_pt=0,
    space_after_para_pt=0,

    first_line_indent_in=0.5,
    margin_top_in=1.0, margin_bottom_in=1.0,
    margin_left_in=1.0, margin_right_in=1.0,

    chapter_bold=False, chapter_italic=False,
    chapter_centered=True, chapter_all_caps=False,
    chapter_page_break_before=True, chapter_start_position="third_down",
    chapter_blank_lines_above=8,

    page_size="a4",
    include_running_header=True, header_align_right=True,
    header_format="{author} / {title} / {page}",

    scene_break_text="* * *",
    body_justified=True,
)


# ── Public Registry ──────────────────────────────────────────────────────────
TEMPLATES: Dict[str, NovelTemplate] = {
    t.id: t for t in [
        TRADITIONAL,
        MODERN_LITERARY,
        KDP_SELF_PUBLISH,
        ACADEMIC_PRESS,
        INTERNATIONAL_A4,
    ]
}
