"""
genre_db.py
===========
Comprehensive genre intelligence database.
Contains word count benchmarks, market data, publisher preferences,
and strategic positioning advice for every major commercial fiction genre.

Sources: Writer's Digest, QueryTracker industry reports, Publishers Marketplace
data, Manuscript Wishlist surveys, and AAR (Association of Authors' Representatives)
guidelines as of 2024–2025.
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple


@dataclass
class GenreProfile:
    # Identity
    id:           str
    name:         str
    category:     str          # "Adult Fiction" | "YA" | "MG" | "Non-Fiction" | etc.

    # Word count benchmarks (words)
    wc_min:       int
    wc_sweet:     int          # The ideal target agents actively seek
    wc_max:       int
    wc_debut_max: int          # Debut authors face tighter ceilings

    # Market positioning
    market_note:  str          # Honest note on the current market
    agent_note:   str          # What agents specifically say about this genre right now
    debut_note:   str          # Specific advice for debut (first-time) authors

    # Comparables guidance
    comp_note:    str          # How to write comp titles for this genre

    # Top publishers (who acquires this genre)
    publishers:   List[str] = field(default_factory=list)

    # Structural conventions agents expect
    chapter_count_typical:  Optional[Tuple[int, int]] = None   # (min, max)
    pov_conventions:        str = ""
    opening_hook_standard:  str = ""

    # Red flags that trigger immediate rejection
    rejection_flags: List[str] = field(default_factory=list)


# =============================================================================
#  GENRE DATABASE
# =============================================================================

GENRES: Dict[str, GenreProfile] = {

    # ── ADULT COMMERCIAL FICTION ─────────────────────────────────────────────

    "thriller": GenreProfile(
        id="thriller", name="Thriller / Suspense", category="Adult Fiction",
        wc_min=70_000, wc_sweet=90_000, wc_max=110_000, wc_debut_max=100_000,
        market_note=(
            "Thriller remains the highest-volume commercial fiction category by sales. "
            "Psychological thrillers and domestic suspense are currently oversaturated "
            "at the query stage, but high-concept premise thrillers with unique settings "
            "are actively sought."
        ),
        agent_note=(
            "Agents universally demand that thrillers open with momentum — not backstory. "
            "The inciting incident should occur within the first ten pages. "
            "Dual timelines are popular but must serve the plot, not merely provide structure."
        ),
        debut_note=(
            "Debut thrillers over 100,000 words face significant resistance. "
            "Target 80,000–95,000 words. A standalone with series potential is "
            "more marketable than a committed series opener."
        ),
        comp_note=(
            "Use comps from the last 3 years. 'The Silent Patient meets Gone Girl' "
            "style comps work well. Avoid comping classics (no Agatha Christie or Hitchcock)."
        ),
        publishers=["Minotaur Books", "Putnam", "Crown", "Thomas & Mercer", "Grand Central"],
        chapter_count_typical=(30, 60),
        pov_conventions="Third-person limited or first-person. Dual POV popular.",
        opening_hook_standard="Scene of tension or threat within page 1.",
        rejection_flags=[
            "Prologue featuring the victim's death before chapter 1",
            "Opening with the protagonist waking up",
            "Word count over 110,000 for a debut",
            "No clear antagonist or threat by chapter 3",
        ],
    ),

    "literary_fiction": GenreProfile(
        id="literary_fiction", name="Literary Fiction", category="Adult Fiction",
        wc_min=70_000, wc_sweet=90_000, wc_max=120_000, wc_debut_max=110_000,
        market_note=(
            "Literary fiction is the hardest category to sell and the most prestigious. "
            "The market rewards distinctly original voice above all other criteria. "
            "Debut literary fiction is acquired when it is exceptional — not merely good."
        ),
        agent_note=(
            "Agents expect literary fiction to have commercial elements — a story engine "
            "that propels the reader — alongside the prose quality. Pure character studies "
            "with no plot momentum are a difficult sell in the current market."
        ),
        debut_note=(
            "Voice is the single most important element for debut literary fiction. "
            "Sentences must be crafted with intention. Workshop the opening chapter "
            "more than any other section — agents make decisions within three pages."
        ),
        comp_note=(
            "Comp to recent prize-winners or debut successes. "
            "Mentioning the Booker, Pulitzer, or National Book Award titles "
            "signals your target reader accurately."
        ),
        publishers=["Farrar Straus & Giroux", "Knopf", "Riverhead", "Graywolf Press", "Tin House"],
        chapter_count_typical=(15, 40),
        pov_conventions="Any. Experimental structure is acceptable and often encouraged.",
        opening_hook_standard="The voice must be immediately distinctive. No compromise.",
        rejection_flags=[
            "Genre elements not disclosed upfront",
            "Overly derivative of obvious influences",
            "Passive, retrospective opening (character reflecting on their life)",
        ],
    ),

    "romance": GenreProfile(
        id="romance", name="Romance", category="Adult Fiction",
        wc_min=55_000, wc_sweet=80_000, wc_max=100_000, wc_debut_max=90_000,
        market_note=(
            "Romance is the largest genre category by revenue in the English-language market. "
            "BookTok (TikTok) has dramatically shifted what subgenres sell. "
            "Romantasy (fantasy-romance hybrid) is the fastest-growing subgenre as of 2024–2025. "
            "Contemporary romance with grumpy/sunshine, enemies-to-lovers, or forced proximity "
            "tropes remain consistently commercial."
        ),
        agent_note=(
            "The HEA (Happily Ever After) or HFN (Happy For Now) ending is mandatory — "
            "this is the genre's defining contract with its reader. "
            "Dual POV alternating between the two leads is the current standard. "
            "Agents specifically track heat level; specify yours clearly in the query."
        ),
        debut_note=(
            "Self-publishing is a viable and often preferable path for romance compared "
            "to other genres. Traditional publishing advances for romance are typically lower. "
            "If pursuing traditional, Harlequin and their imprints have the clearest "
            "submission guidelines for debut authors."
        ),
        comp_note=(
            "Comp to recent bestsellers in your specific subgenre. "
            "Emily Henry, Talia Hibbert, and Alexis Hall are current benchmark authors "
            "for contemporary. Use trope language — agents understand it."
        ),
        publishers=["Berkley", "Avon", "Forever", "Montlake", "Harlequin/Mills & Boon"],
        chapter_count_typical=(25, 45),
        pov_conventions="Dual first-person or dual third-person. One POV per chapter.",
        opening_hook_standard="Establish protagonist and hint at romantic conflict within chapter 1.",
        rejection_flags=[
            "Lack of a clear HEA or HFN ending",
            "Romance subplot rather than primary plot",
            "Single POV (increasingly non-standard for the genre)",
            "Outdated or offensive tropes without subversion",
        ],
    ),

    "fantasy": GenreProfile(
        id="fantasy", name="Fantasy (Adult)", category="Adult Fiction",
        wc_min=90_000, wc_sweet=110_000, wc_max=150_000, wc_debut_max=120_000,
        market_note=(
            "Adult fantasy is one of the few genres where longer word counts are expected "
            "and accepted by agents. Epic fantasy and romantasy are the dominant commercial "
            "subgenres. Grimdark is slightly cooled; cosy fantasy is rapidly growing. "
            "World-building must serve story — not replace it."
        ),
        agent_note=(
            "Agents consistently report that debut fantasy manuscripts over 120,000 words "
            "are an automatic pass regardless of quality, because the editing and production "
            "cost risk is too high for an unproven author. Cut ruthlessly to under 120k."
        ),
        debut_note=(
            "If your debut fantasy requires 150,000+ words to tell its story, consider "
            "whether you are beginning at the right point in the narrative. Most debut "
            "fantasy can be tightened significantly. The sequel will be easier to sell "
            "if the first book performs well within market expectations."
        ),
        comp_note=(
            "Subgenre-specific comps are essential. 'Fantasy' is too broad. "
            "Specify: epic, portal, cosy, romantasy, grimdark, progression, etc. "
            "Comp to authors publishing in the last 5 years."
        ),
        publishers=["Del Rey", "Tor Books", "Orbit", "Ace/Roc", "Harper Voyager"],
        chapter_count_typical=(30, 70),
        pov_conventions="Third-person limited or omniscient. Multiple POV common in epic.",
        opening_hook_standard="Ground the reader in the world quickly — but action first.",
        rejection_flags=[
            "Opening with a dream sequence",
            "Excessive world-building before character investment",
            "Word count over 120,000 for debut",
            "Map-only world-building without cultural depth",
        ],
    ),

    "sci_fi": GenreProfile(
        id="sci_fi", name="Science Fiction (Adult)", category="Adult Fiction",
        wc_min=80_000, wc_sweet=100_000, wc_max=130_000, wc_debut_max=110_000,
        market_note=(
            "Hard science fiction and climate fiction (cli-fi) are commercially ascendant. "
            "Space opera remains steady. Near-future thrillers with SF elements often "
            "cross over into mainstream commercial fiction and command higher advances."
        ),
        agent_note=(
            "The science must be plausible within the world's own internal logic. "
            "Agents with SF lists often have science backgrounds or consult specialists. "
            "The 'what if' premise must be clearly articulated in the query's opening paragraph."
        ),
        debut_note=(
            "Hard SF debuts with real scientific grounding tend to attract more agent "
            "attention than pure space opera. Lead with the idea and its implications "
            "in your query — the science is your competitive advantage."
        ),
        comp_note=(
            "Be specific: Kim Stanley Robinson for hard climate SF, Martha Wells "
            "for character-driven space opera, N.K. Jemisin for innovative structure. "
            "The comp signals your tonal register, not just your subject matter."
        ),
        publishers=["Tor Books", "DAW", "Orbit", "Del Rey", "Saga Press"],
        chapter_count_typical=(30, 60),
        pov_conventions="Third-person limited most common. First-person growing.",
        opening_hook_standard="The speculative premise must be apparent within chapter 1.",
        rejection_flags=[
            "Science that contradicts established physics without in-world explanation",
            "Protagonist who is the only person capable of saving humanity (cliché)",
            "Info-dump exposition about the world in opening chapters",
        ],
    ),

    "mystery": GenreProfile(
        id="mystery", name="Mystery / Crime Fiction", category="Adult Fiction",
        wc_min=60_000, wc_sweet=80_000, wc_max=100_000, wc_debut_max=90_000,
        market_note=(
            "Cosy mysteries are the fastest-growing subgenre and are particularly "
            "strong in series format. Traditional detective procedurals remain steady. "
            "Diverse detectives and non-Anglo settings are actively sought by agents."
        ),
        agent_note=(
            "The central mystery must be established by chapter 2 at the latest. "
            "All clues presented to the detective must also be presented to the reader — "
            "this is the genre's fairness contract. Deus ex machina solutions "
            "are the most common reason for rejection post-partial-read."
        ),
        debut_note=(
            "Cosy mysteries have the clearest series path of any genre and are well-suited "
            "to debut authors. If writing a series, the first book must function as "
            "a complete standalone. Agent submissions should be for book 1 only."
        ),
        comp_note=(
            "Subgenre matters enormously here. Comp cosy to cosy (Richard Osman, "
            "M.C. Beaton style), hardboiled to hardboiled, procedural to procedural. "
            "Cross-genre comps confuse agents on placement."
        ),
        publishers=["Minotaur Books", "Crooked Lane", "Berkley Prime Crime", "Soho Crime"],
        chapter_count_typical=(25, 45),
        pov_conventions="First-person most common for amateur sleuth; third for procedural.",
        opening_hook_standard="The crime or inciting incident should occur in chapter 1 or 2.",
        rejection_flags=[
            "The mystery is solved by coincidence rather than deduction",
            "Clues withheld from the reader that the detective knew",
            "Series planned but book 1 does not stand alone",
        ],
    ),

    "historical_fiction": GenreProfile(
        id="historical_fiction", name="Historical Fiction", category="Adult Fiction",
        wc_min=80_000, wc_sweet=100_000, wc_max=130_000, wc_debut_max=120_000,
        market_note=(
            "Women-centred historical fiction set in WWII has been the dominant subgenre "
            "for a decade and is now oversaturated at the query stage. "
            "Agents are actively seeking non-European settings and pre-modern periods. "
            "Historical fiction with fantasy elements (historical fantasy) is ascendant."
        ),
        agent_note=(
            "Research must be invisible — never lecturing the reader on period detail. "
            "Agents report that the most common error in historical fiction queries "
            "is describing the research rather than the story."
        ),
        debut_note=(
            "A historical note at the end of the novel, distinguishing fact from fiction, "
            "is expected and often evaluated by agents as a sign of the author's "
            "relationship with their research."
        ),
        comp_note=(
            "Comp to well-known historical novelists but be specific about period and tone. "
            "Hilary Mantel (literary), Philippa Gregory (commercial), Ken Follett (epic) "
            "represent very different market positions."
        ),
        publishers=["Crown", "Dutton", "Ballantine", "William Morrow", "St. Martin's Press"],
        chapter_count_typical=(30, 55),
        pov_conventions="Third-person limited dominant. Dual timeline popular.",
        opening_hook_standard="Immerse in the period through scene and sensory detail immediately.",
        rejection_flags=[
            "WWII women's historical fiction without a distinctly original angle",
            "Modern voice/idiom in period dialogue",
            "Historically inaccurate major facts without author's note acknowledging them",
        ],
    ),

    "horror": GenreProfile(
        id="horror", name="Horror", category="Adult Fiction",
        wc_min=60_000, wc_sweet=80_000, wc_max=110_000, wc_debut_max=100_000,
        market_note=(
            "Literary horror — horror with elevated prose and thematic depth — is "
            "the fastest-growing subgenre following the success of authors like "
            "Paul Tremblay and Carmen Maria Machado. Traditional supernatural horror "
            "remains commercially viable. Body horror and folk horror are currently popular."
        ),
        agent_note=(
            "Horror is the genre where the author's individual vision is most valued "
            "over formula. Agents respond to original concepts of dread rather than "
            "familiar monster categories. The emotional stakes must be as strong "
            "as the physical threat."
        ),
        debut_note=(
            "Short fiction in horror (magazines like The Dark, Nightmare, Clarkesworld) "
            "builds the publishing credits that make debut novel submissions stronger. "
            "Horror has an unusually active short fiction ecosystem."
        ),
        comp_note=(
            "Comp to recent literary horror (Paul Tremblay, Stephen Graham Jones, "
            "Silvia Moreno-Garcia) rather than King or Koontz, which signals "
            "you are not current with the market."
        ),
        publishers=["Tor Nightfire", "Cemetery Dance", "Anchor", "Blumhouse Books"],
        chapter_count_typical=(25, 50),
        pov_conventions="First-person for intimate dread; third for wider scope.",
        opening_hook_standard="The sense of wrongness — atmosphere and unease — from page 1.",
        rejection_flags=[
            "It was all a dream ending",
            "Monster fully revealed before maximum tension is built",
            "Jump-scare structure (shock without dread)",
        ],
    ),

    # ── YOUNG ADULT ──────────────────────────────────────────────────────────

    "ya_fantasy": GenreProfile(
        id="ya_fantasy", name="Young Adult Fantasy", category="Young Adult",
        wc_min=60_000, wc_sweet=85_000, wc_max=100_000, wc_debut_max=95_000,
        market_note=(
            "YA fantasy remains the most commercially active YA category. "
            "Romantasy elements (romance as a primary subplot) are expected. "
            "Own-voices diverse fantasy worlds are actively sought and more commercially "
            "successful than they have ever been."
        ),
        agent_note=(
            "YA agents are clear: the protagonist must be 14–18 years old and "
            "the coming-of-age emotional arc must be central, not incidental. "
            "Adult themes (graphic violence, explicit sex) require revision to MG or "
            "reclassification as adult crossover — agents will not submit adult content "
            "to YA imprints."
        ),
        debut_note=(
            "YA debut authors have the strongest online community support "
            "(Twitter/X #YAlit, #MSWL). The debut YA author community is unusually "
            "collaborative. SCBWI membership and their grants are worth investigating."
        ),
        comp_note=(
            "Comp to recent YA bestsellers. Sarah J. Maas, Holly Black, and Leigh Bardugo "
            "are the benchmark authors. Use their recent titles, not their debut books."
        ),
        publishers=["McElderry Books", "Bloomsbury YA", "Razorbill", "Roaring Brook Press", "Little Brown YA"],
        chapter_count_typical=(30, 50),
        pov_conventions="First-person present tense is the dominant YA convention.",
        opening_hook_standard="Voice-first. The protagonist's internal world must be vivid from line 1.",
        rejection_flags=[
            "Protagonist is not a teenager or does not read as a teenager",
            "Lack of a coming-of-age emotional arc",
            "Adult content submitted without explicit YA crossover note",
            "Word count over 100,000 for debut YA",
        ],
    ),

    "ya_contemporary": GenreProfile(
        id="ya_contemporary", name="Young Adult Contemporary", category="Young Adult",
        wc_min=45_000, wc_sweet=70_000, wc_max=90_000, wc_debut_max=80_000,
        market_note=(
            "YA contemporary faces tougher commercial conditions than YA fantasy. "
            "Issue-driven contemporary (mental health, identity, social justice) "
            "remains acquisitions-friendly when handled with authenticity and nuance. "
            "Romantic comedies and summer reads perform well in paperback."
        ),
        agent_note=(
            "Contemporary YA is the category where own-voices designation matters most "
            "to agents. Authentic representation of marginalised teen experiences "
            "is actively sought. Sensitivity readers are expected to have been involved."
        ),
        debut_note=(
            "Contemporary YA debuts have historically launched strong author careers "
            "because they establish a reader relationship early. The emotional authenticity "
            "of the teenage experience is the bar — adults writing about teenagers "
            "must avoid the condescending or nostalgic lens."
        ),
        comp_note=(
            "Rainbow Rowell, Angie Thomas, Adam Silvera, and Jenny Han are current "
            "benchmark authors. Comp to the tone and emotional register, not just the subject."
        ),
        publishers=["Balzer + Bray", "Dial Books", "Viking Children's", "Inkyard Press"],
        chapter_count_typical=(20, 40),
        pov_conventions="First-person present tense standard.",
        opening_hook_standard="The protagonist's voice and primary conflict established in chapter 1.",
        rejection_flags=[
            "Adult authorial perspective imposed on teen characters",
            "Issue-driven narrative that lectures rather than illuminates",
            "Undisclosed mature content in a YA submission",
        ],
    ),

    # ── MIDDLE GRADE ─────────────────────────────────────────────────────────

    "middle_grade": GenreProfile(
        id="middle_grade", name="Middle Grade (8–12)", category="Middle Grade",
        wc_min=25_000, wc_sweet=40_000, wc_max=55_000, wc_debut_max=50_000,
        market_note=(
            "Middle grade is one of the most stable categories in children's publishing. "
            "Adventure, humour, and mystery perform consistently. "
            "Fantasy MG (in the Rowling tradition) remains the highest-volume subgenre."
        ),
        agent_note=(
            "MG word counts are strictly policed. Agents and editors will not read "
            "a manuscript presented as MG that exceeds 55,000 words — it will be "
            "reclassified as YA or returned unread. School and library sales drive "
            "MG commercial performance."
        ),
        debut_note=(
            "SCBWI (Society of Children's Book Writers and Illustrators) is the "
            "essential professional organisation for debut MG authors. Their annual "
            "conference is the best place to meet MG-focused agents."
        ),
        comp_note=(
            "Rick Riordan, Roald Dahl's tone (not the books themselves), "
            "and recent Newbery winners are strong comp reference points. "
            "Be specific about your book's humour level — MG ranges from dark to comedic."
        ),
        publishers=["Scholastic", "Disney Hyperion", "HarperCollins Children's", "Random House Children's"],
        chapter_count_typical=(15, 35),
        pov_conventions="Third-person limited or first-person. Shorter chapters (1,000–2,000 words).",
        opening_hook_standard="Immediate action or strong voice. Children's attention is decisive.",
        rejection_flags=[
            "Word count over 55,000",
            "Romantic content beyond innocent crush",
            "Adult themes (violence, substance use) without age-appropriate framing",
            "Preachy moral lesson stated explicitly by the protagonist",
        ],
    ),

    # ── NON-FICTION (NARRATIVE) ───────────────────────────────────────────────

    "narrative_nonfiction": GenreProfile(
        id="narrative_nonfiction", name="Narrative Non-Fiction", category="Non-Fiction",
        wc_min=60_000, wc_sweet=85_000, wc_max=110_000, wc_debut_max=100_000,
        market_note=(
            "Narrative non-fiction is sold on proposal, not completed manuscript, "
            "which is fundamentally different from fiction. A strong author platform "
            "(academic credentials, journalism history, public profile) is often "
            "as important as the writing quality for debut NF authors."
        ),
        agent_note=(
            "The book proposal is the submission vehicle. The manuscript is secondary. "
            "A proposal includes: overview, market analysis, competitive titles, "
            "author bio/platform, chapter-by-chapter outline, and one to two sample chapters. "
            "Agents evaluate the proposal as a business document, not purely as literature."
        ),
        debut_note=(
            "Without a significant platform (100k+ social media, major publication credits, "
            "academic appointment, or professional authority), debut narrative NF is extremely "
            "difficult to sell to major publishers. University presses and independent "
            "publishers are more accessible for debut NF authors."
        ),
        comp_note=(
            "Comp to narrative NF bestsellers in the same subject area. "
            "Erik Larson, Mary Roach, Michael Lewis are high-bar comps — use them "
            "only if your writing genuinely matches that level."
        ),
        publishers=["Crown", "Penguin Press", "Simon & Schuster", "Norton", "Riverhead"],
        chapter_count_typical=(10, 25),
        pov_conventions="Third-person narrative or first-person reported. Journalism conventions apply.",
        opening_hook_standard="Scene-setting with narrative propulsion. No academic preamble.",
        rejection_flags=[
            "Proposal missing any of the required sections",
            "No demonstrable author platform",
            "Completed manuscript submitted instead of proposal",
        ],
    ),

    "memoir": GenreProfile(
        id="memoir", name="Memoir", category="Non-Fiction",
        wc_min=55_000, wc_sweet=75_000, wc_max=100_000, wc_debut_max=90_000,
        market_note=(
            "Memoir is the most competitive non-fiction category for debut authors. "
            "The commercial question agents ask is: 'Why does the world need this person's "
            "story?' Platform, extraordinary circumstances, or exceptional writing — "
            "preferably all three — are required to break through."
        ),
        agent_note=(
            "A completed memoir manuscript is expected (unlike other NF). "
            "The writing quality is paramount. Memoir is the category where "
            "agents most often say 'The story is compelling but the writing is not "
            "strong enough.' A memoir proposal with sample chapters is the standard submission."
        ),
        debut_note=(
            "The memoir must have a clear narrative arc — not simply chronology. "
            "It must answer the question: what did you learn and how did you change? "
            "Without a transformation arc, it reads as autobiography, not memoir."
        ),
        comp_note=(
            "Comp to recent memoir bestsellers in your specific emotional/thematic territory. "
            "Educated, Know My Name, When Breath Becomes Air — these signal literary quality. "
            "Humour memoirs (Tina Fey, Mindy Kaling) are a different market position."
        ),
        publishers=["Scribner", "Crown", "Penguin Press", "Flatiron Books", "HarperOne"],
        chapter_count_typical=(15, 30),
        pov_conventions="First-person. Present tense for immediacy, past for reflection.",
        opening_hook_standard="The central emotional truth of the memoir must be evident within 5 pages.",
        rejection_flags=[
            "Chronological autobiography without narrative arc",
            "Scores settled with individuals named without sufficient public interest",
            "No transformation or resolution — the author is still in the trauma",
        ],
    ),
}


# ── Helper Functions ──────────────────────────────────────────────────────────

def get_word_count_assessment(genre_id: str, word_count: int) -> Dict:
    """
    Returns a detailed assessment of a manuscript's word count
    against genre benchmarks.
    """
    if genre_id not in GENRES:
        return {
            "status":  "unknown",
            "message": "Genre not found in database.",
            "colour":  "gray",
        }

    g = GENRES[genre_id]
    wc = word_count

    if wc < g.wc_min * 0.80:
        return {
            "status":   "too_short",
            "label":    "Significantly Below Range",
            "colour":   "red",
            "message":  (
                f"At {wc:,} words, this manuscript is significantly shorter than "
                f"the minimum of {g.wc_min:,} for {g.name}. Most agents will not "
                f"consider it ready. Target at least {g.wc_min:,} words."
            ),
            "ideal":    g.wc_sweet,
        }
    elif wc < g.wc_min:
        return {
            "status":   "short",
            "label":    "Below Range",
            "colour":   "orange",
            "message":  (
                f"At {wc:,} words, this manuscript is below the typical minimum of "
                f"{g.wc_min:,} for {g.name}. Some agents will overlook this for "
                f"exceptional work, but the ideal target is {g.wc_sweet:,} words."
            ),
            "ideal":    g.wc_sweet,
        }
    elif wc <= g.wc_sweet:
        return {
            "status":   "ideal",
            "label":    "Ideal Range",
            "colour":   "green",
            "message":  (
                f"At {wc:,} words, this manuscript sits in the ideal range for {g.name}. "
                f"This word count is unlikely to raise concerns at the query stage."
            ),
            "ideal":    g.wc_sweet,
        }
    elif wc <= g.wc_max:
        return {
            "status":   "acceptable",
            "label":    "Acceptable (Upper Range)",
            "colour":   "yellow",
            "message":  (
                f"At {wc:,} words, this manuscript is in the upper acceptable range for "
                f"{g.name}. It is submittable but some agents may note the length. "
                f"For debut authors specifically, the ceiling is {g.wc_debut_max:,}."
            ),
            "ideal":    g.wc_sweet,
        }
    elif wc <= g.wc_debut_max + 5_000:
        return {
            "status":   "high",
            "label":    "Above Recommended Range",
            "colour":   "orange",
            "message":  (
                f"At {wc:,} words, this manuscript exceeds the recommended maximum of "
                f"{g.wc_max:,} for {g.name}. Debut authors should aim to reduce this "
                f"to under {g.wc_debut_max:,} before querying."
            ),
            "ideal":    g.wc_sweet,
        }
    else:
        return {
            "status":   "too_long",
            "label":    "Significantly Over Range",
            "colour":   "red",
            "message":  (
                f"At {wc:,} words, this manuscript is significantly longer than the "
                f"market ceiling of {g.wc_max:,} for {g.name}. This is a near-automatic "
                f"rejection trigger for debut authors. Substantial cutting is required "
                f"before this manuscript is submittable. Target under {g.wc_debut_max:,}."
            ),
            "ideal":    g.wc_sweet,
        }


# Import needed in return type annotation
from typing import Dict
