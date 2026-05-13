<!-- converted from asp_landing_v2.docx -->


AUTHOR STUDIO PRO
Landing Page Implementation Brief  —  Revision 2.0
Editorial-Grade SaaS Entry Gate  ·  Routing Architecture  ·  Design System
github.com/likhithmamba/Author-Studio-Pro   ·   React 18 · FastAPI · Supabase · Razorpay


§0  DESIGN PHILOSOPHY — READ FIRST

The previous version of this landing page was clean, correct, and forgettable. It read like a polished template rather than a product with conviction — too balanced, too safe, too AI-generated. This revision fixes that by introducing three properties that make premium SaaS feel premium: identity, asymmetry, and tension.

Clean and correct is the floor. Editorial and opinionated is the ceiling. Build to the ceiling.

What Was Wrong
- Everything was predictable — grid, cards, hero, repeat
- No narrative arc — sections stacked with no story
- No signature moment — nothing a user would remember or describe
- Felt AI-generated because it was too balanced and structurally safe
- Gold was flat, blacks were uniform, motion was decorative rather than purposeful

What This Version Delivers
- Editorial storytelling — every section flows from the previous one
- Controlled imperfection — deliberate asymmetry, varied type sizes, off-axis layouts
- One unforgettable signature element — the Floating Manuscript Spine
- Motion that earns its place — no bounce, no flash, only purposeful kinetics
- A pricing section that feels expensive, not apologetic

§1  REPOSITORY & STACK CONTEXT

Read the full repository before generating any file. Do not infer missing context from general knowledge — consult the actual codebase.


Files That Must NOT Change
- storyStore.js  —  Zustand state shape (do not restructure)
- WritingSystemContext.jsx  —  UI state for panel/tab coordination
- AppWorkspace.jsx  —  editor scaffold and panel layout
- backend/routers/*  —  all existing FastAPI route handlers
- supabase/migrations/*  —  schema; no new tables without a migration file
- keyStorage.js  —  BYOK key management (do not bypass)

§2  VISUAL DESIGN SYSTEM

2.1  Color Architecture — Layered, Not Flat
The previous spec used a single background value. Real depth requires a three-layer black system. Every panel, card, and elevated surface uses a different layer — never the same value twice at adjacent depth levels.


2.2  Gold Is Not Flat
Anywhere gold is used as a fill or decorative gradient, use this value — never the solid hex alone:

linear-gradient(135deg, #C4903A 0%, #E0B56A 50%, #A8742A 100%)

For the hero light bloom behind the headline (not a visible shape — a glow that implies a source):

radial-gradient(circle at 30% 20%, rgba(196,144,58,0.08), transparent 60%)

2.3  Typography Stack
Three distinct roles. Never mix roles. Never fall back to system fonts without declaring the stack.


Variable type sizing is intentional — not every section headline is the same size. Use this deliberately to create hierarchy and break monotony:
- Hero headline:  72–80px (Cormorant)
- Section headers:  alternates between 56px and 48px across sections
- Card titles:  28–32px (DM Sans, medium weight)
- Body:  16–17px (DM Sans, light weight)
- Data labels:  13px uppercase, 0.08em tracking (DM Mono)

2.4  Texture & Surface Treatment
A CSS grain overlay at 1.5% opacity applied to the entire document root gives the surface analog warmth. This is what separates digital-sterile from editorial-premium.

/* Apply to :root or body */
background-image: url("data:image/svg+xml,...");  /* SVG noise pattern */
background-blend-mode: overlay;
opacity: 0.015;

Additionally: all section backgrounds alternate between --bg-base and --bg-alt to create visual breathing room without using hard borders.

§3  SIGNATURE ELEMENT — FLOATING MANUSCRIPT SPINE


What It Is
A stack of slightly angled book spines rendered in CSS/SVG (no image asset required), where each spine represents one module of the product. The spines float independently using staggered vertical sine-wave animation, giving them organic movement.

The Six Spines

Interaction
- Hover over any spine → it expands laterally to reveal a micro UI preview of that module
- The preview is not a screenshot — it is a live mini-component (word count bar, query stats panel, etc.)
- The other spines compress slightly to make room
- Cursor leaves → everything returns to stack over 400ms with ease-in-out

Animation Spec
/* Each spine floats on its own sine cycle */
animation: spineFloat 6s ease-in-out infinite;
animation-delay: calc(var(--spine-index) * 0.8s);

@keyframes spineFloat {
0%   { transform: translateY(0px)    rotate(var(--tilt)); }
50%  { transform: translateY(-10px)  rotate(var(--tilt)); }
100% { transform: translateY(0px)    rotate(var(--tilt)); }
}

Respect prefers-reduced-motion — remove animation, retain layout.

§4  LAYOUT PHILOSOPHY — BREAK THE GRID

The previous spec centered everything. Center-alignment is the default choice — it requires no decision-making. Editorial products make layout decisions. Use the following layout language across all sections.

4.1  Base Layout Pattern (Magazine-Style)
Alternate left-heavy and right-heavy layouts across sections. Never center two sections in a row.

/* Section A — text left, visual right */
grid-template-columns: 40fr 60fr;

/* Section B — visual left, text right (invert) */
grid-template-columns: 55fr 45fr;

4.2  Deliberate Imperfection Rules
These are not bugs — they are decisions that signal craft:
- Floating elements carry ±1.5° rotation (never perfectly straight)
- Section vertical spacing is uneven — not a fixed --section-gap for all
- One section per page uses an oversized headline (72–80px) while adjacent sections use 48px
- Comparison table extends 12px beyond its container on the right side (deliberate bleed)
- Pricing cards are not the same height — Studio card stands taller

4.3  Section Rhythm (Top to Bottom)

§5  SECTION-BY-SECTION SPECIFICATIONS

5.1  Hero — Rebuild Completely


HEADLINE (DISPLAY — CORMORANT GARAMOND 72PX)

SUBTEXT (DM SANS, 18PX, --TEXT-SECONDARY)
Fix structure. Match industry standards. Ship like a professional.

Hero Layer Stack
- Background: --bg-base with gold bloom (radial gradient, 8% opacity)
- Grain overlay: SVG noise at 1.5% opacity
- Left 45%: headline + subtext + dual CTA buttons
- Right 55%: Floating Manuscript Spine (the signature element)
- Cursor follow: a 300px gold radial glow that tracks cursor position (opacity 0.06)

CTA BUTTONS

5.2  Features — Staggered Grid, No Icons
Stop using six equal cards in a uniform grid. Use a 2+4 staggered layout. The two large cards showcase Format and Analyse. The four compact cards show the remaining modules.

LAYOUT STRUCTURE
/* Row 1 */
[ FORMAT — large card (48%) ]  [ ANALYSE — large card (48%) ]

/* Row 2 */
[ QUERY ]  [ MARKET ]  [ SUBMISSIONS ]  [ EDITOR ]  (4 compact)

Card Rules
- No icons — replace with live micro UI previews embedded in the card top
- FORMAT card preview:  a word-count bar and margin indicator strip
- ANALYSE card preview:  a mini radar chart with five manuscript dimensions
- QUERY card preview:  a submission tracker with three status rows
- MARKET card preview:  a small bar chart of genre word-count benchmarks
- Hover state:  card lifts 4px, gold edge appears (box-shadow: 0 0 0 1px #C4903A40)
- Hover state:  micro UI animates — bars fill, numbers count up

5.3  How It Works — Tactile Timeline
Replace the three-step icon row with a horizontal timeline strip that feels like a production pipeline.

TIMELINE STEPS

- A connecting progress bar animates between steps when user scrolls into view
- Each step card shows a time indicator: Upload 2s · Analyse 12s · Export 3s
- Step 02 is slightly larger (taller card) — this is the core value, it should dominate visually

5.4  AI Intelligence — Real, Not Fake
This is where most SaaS landing pages fail. They show generic AI output that looks obviously simulated. Build this section as a split-panel editorial assessment demo.

SPLIT PANEL LAYOUT
[ LEFT 48% — Manuscript text excerpt ]  [ RIGHT 48% — AI editorial sidebar ]

Left panel: Manuscript text
- Three paragraphs of generic fiction excerpt
- Highlighted spans in three colors: structural issue (amber), pacing note (blue), strength (green)
- Highlights use the existing analysisCards data shape — not hardcoded

Right panel: AI editorial sidebar
- Four inline comments anchored to highlighted spans
- Each comment: icon + label + one-sentence note + confidence percentage
- Market readiness score: 72% — rendered as a DM Mono number with a thin arc progress
- 'Processed in 11.4 seconds' — shown in --text-muted at the bottom

The entire panel is static — no API call required on the landing page. It must use the analysisCards data shape so it can later be connected without refactoring.

5.5  Genre Database — Analytical, Not Decorative
Replace word-count cards with a horizontal bar chart system. The bars make the data feel like research, not marketing.

BAR CHART DATA (WORD COUNT BENCHMARKS)

- Bars animate from 0 on scroll-into-view (Framer Motion layoutId)
- Hover on a genre row → reveals average advance range and top publisher for that genre
- Data sourced from the real /api/market/:genreId endpoint where available

5.6  Templates — Document Previews, Not Icons
Show what the templates actually look like. Render first-page previews using CSS that mirrors real document formatting.


- Hover on any preview → it scales to 1.08 with a gold border glow
- A 'Download Template' ghost button appears on hover

5.7  Comparison Table — Aggressive, Not Polite
Stop being diplomatic about competitors. Name the weaknesses directly.


- Author Studio Pro column: gold header, #FFFBF4 cell background, gold-dark text for values
- Competitor weakness cells: rendered in --text-muted with italic styling
- Table extends 12px beyond right container edge (deliberate bleed — editorial signature)

5.8  Pricing — Feel Expensive, Not Cheap


TIER STRUCTURE

Pricing Design Rules
- PRO card is 8% taller than FREE and STUDIO — it anchors the eye
- PRO card has a gold gradient top border (4px) and 'RECOMMENDED' badge in gold
- STUDIO card has a subtle gold outer glow (box-shadow)
- ROI framing line below the cards (DM Sans italic, --text-secondary):

Costs less than a single rejection cycle. One accepted manuscript covers a year.

Razorpay Integration (Live — Not Mock)
// CTA click → createOrder → Razorpay checkout → verifyPayment
const order = await fetch('/api/create-order', {
method: 'POST',
body: JSON.stringify({ tier: 'pro', amount: 29900 })  // paise
});
const { id: orderId } = await order.json();

const rzp = new window.Razorpay({
key: import.meta.env.VITE_RAZORPAY_KEY_ID,
amount: 29900, currency: 'INR', order_id: orderId,
handler: (response) => verifyPayment(response)
});
rzp.open();

5.9  FAQ — Editorial Two-Column
Replace the accordion dropdown list with a two-column editorial layout. Questions on the left, answers expanded and readable on the right. Feels like documentation — authoritative, not filler.

- Left column (35%): questions in DM Sans medium, gold bullet
- Right column (60%): full paragraph answers, --text-secondary, line-height 1.7
- Clicking a question on the left highlights that row and smooth-scrolls the right panel

5.10  Footer — Trust Weight

§6  MOTION SYSTEM

Motion is a material, not a decoration. Every animation in this page serves one of three purposes: communicating state, directing attention, or rewarding interaction. If an animation does none of these, remove it.

6.1  Banned Motion Patterns
- No bounce (spring physics on entrance) — looks cheap, breaks the editorial tone
- No flash / scale-pop entrance — used by free templates
- No simultaneous animations — stagger everything
- No parallax scrolling on text — illegible and performatively complex

6.2  Standard Entrance Animation
All section content uses this pattern — no exceptions:

initial:   { opacity: 0, y: 12 }
animate:   { opacity: 1, y: 0 }
transition: { duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }

6.3  Stagger Delay
/* Child elements within a section */
transition: { delay: index * 0.04 }

Cap stagger at 0.04s per item. More than 0.06s feels sluggish. Never use the same delay for all children.

6.4  Hover Micro-Interactions
- Max scale on hover:  1.02  —  never higher
- Gold edge glow on hover:  box-shadow: 0 0 0 1.5px rgba(196,144,58,0.5)
- Transition duration:  180ms ease-out for enter, 280ms ease-in for leave
- CTA button press:  scale(0.97) on active, no color change

6.5  Scroll-Based Reveals
// Use Framer Motion whileInView — not scroll event listeners
whileInView={{ opacity: 1, y: 0 }}
initial={{ opacity: 0, y: 12 }}
viewport={{ once: true, margin: '-80px' }}

6.6  Reduced Motion
// Wrap all motion values with this utility
).matches;

const motionProps = prefersReduced
? {}
: { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } };

§7  UX FLOW & ROUTE ARCHITECTURE


7.1  Visibility Rules
The landing page renders ONLY when BOTH of these conditions are true simultaneously:
- The user has NO valid Supabase session  (await supabase.auth.getSession() returns null)
- localStorage does NOT contain the key  asp_entered_app  with value  'true'

If EITHER condition is false, navigate to /app immediately. Use React Router navigate() — never window.location.href.

7.2  Gate Check Implementation
// App.jsx — / route guard
const { data: { session } } = await supabase.auth.getSession();
const hasEntered = localStorage.getItem('asp_entered_app') === 'true';

if (session || hasEntered) {
return <Navigate to="/app" replace />;
}
return <LandingPage />;

7.3  CTA Click Handler
// Inside LandingPage.jsx  — handleEnter()
const handleEnter = () => {
localStorage.setItem('asp_entered_app', 'true');
navigate('/app');
};

7.4  Logout Handler  (extend existing AuthContext)
// AuthContext.jsx  — extend logout()
const logout = async () => {
await supabase.auth.signOut();
localStorage.removeItem('asp_entered_app');
navigate('/');
};

7.5  Route Map

7.6  useEntryGate Hook
Encapsulate all gate logic in a reusable hook. This keeps App.jsx clean and the logic testable.

// src/hooks/useEntryGate.js
export function useEntryGate() {
const [shouldRedirect, setShouldRedirect] = useState(null);

useEffect(() => {
supabase.auth.getSession().then(({ data: { session } }) => {
const entered = localStorage.getItem('asp_entered_app') === 'true';
setShouldRedirect(!!session || entered);
});
}, []);

return { shouldRedirect };
}

§8  INTEGRATION CONSTRAINTS


8.1  Live Integration Points

8.2  Environment Variables Required
- VITE_SUPABASE_URL              — Supabase project URL
- VITE_SUPABASE_ANON_KEY         — Supabase anon key (public)
- VITE_API_URL                   — Render FastAPI base URL
- VITE_RAZORPAY_KEY_ID           — Razorpay publishable key

No environment variable is hardcoded in JSX. All are accessed via import.meta.env. No API keys appear in client-side bundles.

§9  OUTPUT FORMAT — STRICT

9.1  Required Files

9.2  Hard Output Rules
- No explanations — only code. Zero prose between files.
- No markdown code fences in final delivery
- No placeholder <img> tags, empty divs, or TODO comments
- No // @ts-ignore comments — fix the types
- All animations wrapped in prefers-reduced-motion guard (see §6.6)
- All Razorpay calls use VITE_RAZORPAY_KEY_ID — never a hardcoded string
- ManuscriptSpine.jsx must be a standalone component with no dependencies on AppWorkspace
- LandingPage.css must not conflict with any existing CSS custom properties

9.3  CSS Custom Properties (Do Not Redefine)
These already exist in the codebase. Use them — do not create duplicates:
- --gold-primary   --gold-light   --gold-dark
- --bg-primary   --bg-secondary   --bg-tertiary
- --text-primary   --text-secondary   --text-muted
- --border-gold   --border-subtle

§10  ANTI-PATTERNS — REJECT IMMEDIATELY

Flag and regenerate the output if any of the following are present:

Code Anti-Patterns
- setTimeout redirect instead of useEffect + navigate()
- window.location.href for any internal routing
- Hardcoded API keys, Supabase URLs, or Razorpay keys in JSX
- Importing anything from storyStore.js in LandingPage.jsx
- Creating new Supabase tables or columns without a migration file in supabase/migrations/
- Calling a backend endpoint not present in backend/routers/*
- Using React.useState for Supabase session (use useEffect + getSession)

Design Anti-Patterns
- Generic icon library (Heroicons, Lucide) used in feature cards — use micro UI previews
- All sections centered — breaks the editorial layout philosophy (see §4)
- Flat gold (#C4903A solid) used as a fill — always use the gradient (see §2.2)
- New CSS variables that duplicate existing ones
- Placeholder prose in the AI Intelligence section — use the analysisCards data shape
- SecurityBadge.jsx missing from footer or appearing immediately (must delay 3s)
- Bounce or spring animations — see §6.1
- Comparison table that softens competitor weaknesses — be direct
- Free tier visually equal to Pro tier in the pricing section

§11  QUALITY GATE — ACCEPTANCE CRITERIA

The output is accepted only when every item below passes. Test in order.





Author Studio Pro  ·  Landing Page Implementation Brief  ·  Rev 2.0  ·  ImperialX
github.com/likhithmamba  ·  Likhith Mamba
| THIS DOCUMENT IS A CODE-GENERATION PROMPT
Hand it, along with the full repository file tree, to the generating model before requesting any code. Every design decision, layout rule, motion spec, and integration constraint in this document is non-negotiable. The output must be drop-in ready — no placeholders, no TODOs, no explanation prose. |
| --- |
| Repository | github.com/likhithmamba/Author-Studio-Pro |
| --- | --- |
| Frontend | React 18 + Vite  —  deployed to Vercel |
| Backend | FastAPI (Python 3.11)  —  deployed to Render |
| Database | Supabase (PostgreSQL + Row-Level Security + Auth) |
| Payments | Razorpay  (INR / UPI)  —  order + verify pattern |
| AI Layer | OpenRouter via BYOK  (browser → OpenRouter, no backend relay) |
| Global State | Zustand  (storyStore.js)  +  WritingSystemContext  (UI state) |
| CSS Strategy | Custom properties  (no Tailwind)  —  existing --gold-primary vars |
| --bg-base    (floor) | #07050A  —  page background, body |
| --- | --- |
| --bg-alt     (walls) | #0D0A12  —  alternate sections, drawer backgrounds |
| --bg-panel   (surfaces) | #121017  —  cards, panels, elevated containers |
| --gold-primary | #C4903A  —  interactive elements, CTAs, accents |
| --gold-light | #E0B56A  —  hover states, highlights, star ratings |
| --gold-dark | #A8742A  —  pressed states, deep shadows |
| --text-primary | #F0EDE8  —  headlines, strong copy |
| --text-secondary | #AAAAAA  —  body copy, labels, supporting text |
| --text-muted | #555555  —  fine print, disabled states |
| Display / Headlines | Cormorant Garamond  —  weight 600–700, optical size 36px+ |
| --- | --- |
| UI / Body | DM Sans  —  weight 300–500, line-height 1.6–1.7 |
| Data / Code / Mono | DM Mono  —  weight 400, tabular nums, letter-spacing 0.02em |
| This is the one thing users must remember. If this is not implemented, the page has no identity.
Replace every generic floating card, hero illustration, or placeholder screenshot with the Floating Manuscript Spine. This is the signature visual that becomes Author Studio Pro's brand identity on first visit. |
| --- |
| Spine 1  —  FORMAT | Cognac gold (#C4903A), 0° rotation |
| --- | --- |
| Spine 2  —  ANALYSE | Deep charcoal (#121017) with gold edge, +1.2° rotation |
| Spine 3  —  QUERY | Near-black (#0D0A12) with gold spine text, -0.8° rotation |
| Spine 4  —  MARKET | Dark gold (#A8742A), +1.5° rotation |
| Spine 5  —  SUBMISSIONS | Charcoal with off-white text, -1.0° rotation |
| Spine 6  —  EDITOR | Gradient gold-to-dark, +0.5° rotation |
| 01  Hero | Full viewport · left-aligned text · Manuscript Spine right · cursor glow |
| --- | --- |
| 02  Features | Staggered 2+4 grid · micro UI previews (no icons) · hover reveals output |
| 03  How It Works | Full-width timeline strip · animated progress · time indicator |
| 04  AI Intelligence | Split panel · manuscript text left · editorial AI comments right |
| 05  Genre Database | Horizontal bar chart system · analytical feel · no decorative cards |
| 06  Templates | First-page document previews · hover-to-zoom · three document types |
| 07  Comparison | Aggressive table · gold-lit ASP column · hard truths for competitors |
| 08  Pricing | Three tiers · Pro as default · ROI framing · Razorpay live checkout |
| 09  FAQ | Two-column editorial layout · questions left · answers right |
| 10  Footer | Trust signals · security badge · GDPR note (quiet) · social proof |
| The previous hero headline is rejected. Replace it entirely. |
| --- |
| Your manuscript isn't rejected.
It's unreadable. |
| --- |
| Primary CTA | Enter Studio  —  gold gradient fill, Razorpay-style press shadow |
| --- | --- |
| Secondary CTA | View Editorial Demo  —  ghost button, gold border, opacity 0.7 |
| 01  UPLOAD | Drag manuscript (DOCX) → file validation → progress ring |
| --- | --- |
| 02  ANALYSE | Real-time intelligence processing → animated scan line |
| 03  EXPORT | Formatted output download → format selector dropdown |
| Fantasy / Epic | ████████████████  120,000 words |
| --- | --- |
| Literary Fiction | ████████████      90,000 words |
| Thriller | ██████████        80,000 words |
| Romance | ████████          70,000 words |
| YA Fiction | ███████           65,000 words |
| Crime / Mystery | ████████          75,000 words |
| Standard Manuscript | 12pt Courier, 1-inch margins, header with title/author, page numbers |
| --- | --- |
| Screenplay | Courier 12pt, action/dialogue layout, scene headings in caps |
| Query Letter | Business block format, three-paragraph structure, word count line |
| Synopsis | Double-spaced, present tense, character names in caps on first mention |
| Submission Package | Cover page + first ten pages in manuscript format |
| Feature | Author Studio Pro | Scrivener | Atticus | Dabble |
| --- | --- | --- | --- | --- |
| AI Manuscript Analysis | Full suite | No AI analysis | No AI analysis | No AI analysis |
| Industry Word Count Data | Live + genre-segmented | Not included | Not included | Not included |
| Query Letter Builder | Built in | Manual only | Not available | Not available |
| Export Formatting | 6 standards | Complex, error-prone | Basic | Basic |
| Submission Tracking | Integrated | Separate tool required | Not included | Partial |
| Market Intelligence | FastAPI backend | None | None | None |
| Pricing (INR) | From ₹0 / month | One-time ₹7,500+ | ₹4,000/yr | ₹2,500/yr |
| Remove emphasis from the Free tier. Free is not the product. Pro is the product. |
| --- |
| FREE | Starter access · 3 analyses/month · Standard export only · No query builder |
| --- | --- |
| PRO | ₹299/month · RECOMMENDED badge · Full AI analysis · All exports · Query builder |
| STUDIO | ₹599/month · Everything + priority processing + API key support + commercial license |
| Social proof | Used by 12,000+ writers — rendered in --text-secondary, small caps |
| --- | --- |
| Security badge | SecurityBadge.jsx component — appears 3s after page load, persists |
| GDPR note | 8px DM Mono, --text-muted — quiet but present |
| Links | Product · GitHub · Support · Docs — no decorative icons |
| Legal | Privacy Policy · Terms of Use — right-aligned, --text-muted |
| The landing page is a one-time entry gate — not a reusable marketing page.
Once a user enters the app, they must never be returned here automatically. This rule has no exceptions. |
| --- |
| / | Public gate — shows LandingPage or redirects (see §7.2) |
| --- | --- |
| /app | Protected workspace — requires valid Supabase session |
| /editor | Editor deep-link — requires valid Supabase session |
| /* | 404 fallback — redirect to / if no match |
| ZERO fake APIs. ZERO mock endpoints. ZERO stub components.
Every UI element that makes a backend call must connect to a real route that exists in backend/routers/*. If the endpoint does not exist, render static data — do not create a fake API. |
| --- |
| Auth | AuthContext.jsx → authLogin / authRegister → /api/auth/* |
| --- | --- |
| Pricing | Pricing.jsx → createOrder / verifyPayment → /api/create-order · /api/verify-payment |
| Razorpay | Script loaded from checkout.razorpay.com/v1/checkout.js — CDN, not npm |
| Market data | Genre bar chart → getMarketData → /api/market/:genreId (static if endpoint missing) |
| Health ping | App boot → fetch(VITE_API_URL + '/api/health') to warm Render instance |
| Settings | BYOK key persistence → hasApiKey() / saveApiKey() from keyStorage.js |
| src/App.jsx | Routing logic, gate checks, redirect guards |
| --- | --- |
| src/components/LandingPage.jsx | Full marketing UI (all 10 sections + animations) |
| src/components/LandingPage.css | Scoped styles — no Tailwind, no inline styles |
| src/contexts/AuthContext.jsx | Extended logout() with flag clear + navigate |
| src/hooks/useEntryGate.js | Reusable gate hook (session + localStorage check) |
| src/components/ManuscriptSpine.jsx | The signature element — standalone component |
| src/components/PricingCard.jsx | Tier card with Razorpay handler — standalone |
| ROUTING & GATE LOGIC
Visiting / while logged in → immediately redirects to /app (no flash of landing content)
Visiting / after CTA click (flag set) → immediately redirects to /app
CTA click → sets flag → routes to /app → browser back button does NOT return to /
Logout → clears flag → next visit shows landing page again |
| --- |
| DESIGN & INTERACTION
Floating Manuscript Spine renders with six spines, correct tilts, and float animation
Hover on any spine → expands with micro UI preview → returns on cursor leave
All six feature cards use micro UI previews (no icon library)
Comparison table has gold-lit ASP column and direct competitor weakness text
Pricing: Pro card is taller, has gold top border, has RECOMMENDED badge
Genre bar chart animates from 0 on scroll-into-view
SecurityBadge appears exactly 3 seconds after page load — not immediately
prefers-reduced-motion removes all animations but preserves layout |
| --- |
| INTEGRATIONS
Pricing CTA initiates real Razorpay checkout (createOrder → verifyPayment flow)
AuthModal opens on Sign In click and closes correctly on successful auth
No console errors on fresh load in Chromium and Firefox
No 404s for static assets or imported modules
API health ping fires on app mount (not on landing page load) |
| --- |