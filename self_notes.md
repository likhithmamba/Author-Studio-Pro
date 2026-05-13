this is a self notes.

<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Inkforge — System Architecture</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&family=Syne:wght@400;600;700;800&display=swap');

  :root {
    --bg:        #080C14;
    --surface:   #0D1320;
    --border:    #1C2A3A;
    --accent:    #00C8FF;
    --green:     #00E5A0;
    --amber:     #FFB300;
    --red:       #FF4D6D;
    --purple:    #A855F7;
    --teal:      #14B8A6;
    --white:     #E8F0F8;
    --muted:     #4A6080;
    --node-bg:   #111927;

    --ui-border:      #1E3A5F;
    --ui-bg:          #08192E;
    --state-border:   #1A4A2E;
    --state-bg:       #071A10;
    --backend-border: #1A3040;
    --backend-bg:     #080F18;
    --intel-border:   #2A1A4A;
    --intel-bg:       #0E0818;
    --pay-border:     #4A2A1A;
    --pay-bg:         #180A06;
    --pub-border:     #1A3A2A;
    --pub-bg:         #071510;
    --persist-border: #2A2A1A;
    --persist-bg:     #0E0E06;
  }

  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    background: var(--bg);
    font-family: 'JetBrains Mono', monospace;
    color: var(--white);
    min-height: 100vh;
    padding: 32px 24px 60px;
    overflow-x: auto;
  }

  /* ── HEADER ── */
  .header {
    display: flex;
    align-items: baseline;
    gap: 20px;
    margin-bottom: 36px;
  }
  .header h1 {
    font-family: 'Syne', sans-serif;
    font-size: 28px;
    font-weight: 800;
    color: var(--accent);
    letter-spacing: -0.5px;
  }
  .header .sub {
    font-size: 11px;
    color: var(--muted);
    letter-spacing: 2px;
    text-transform: uppercase;
  }
  .header .badge {
    margin-left: auto;
    font-size: 10px;
    color: var(--muted);
    border: 1px solid var(--border);
    padding: 4px 10px;
    border-radius: 4px;
  }

  /* ── LEGEND ── */
  .legend {
    display: flex;
    gap: 20px;
    flex-wrap: wrap;
    margin-bottom: 32px;
    padding: 12px 16px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 6px;
  }
  .legend-item {
    display: flex;
    align-items: center;
    gap: 7px;
    font-size: 11px;
    color: var(--muted);
  }
  .legend-dot {
    width: 10px; height: 10px;
    border-radius: 2px;
    flex-shrink: 0;
  }

  /* ── GRID ── */
  .grid {
    display: grid;
    grid-template-columns: 1fr 1fr 260px;
    grid-template-rows: auto auto auto;
    gap: 16px;
    max-width: 1400px;
  }

  /* ── SUBGRAPH PANELS ── */
  .panel {
    border-radius: 8px;
    padding: 18px;
    position: relative;
    overflow: visible;
  }
  .panel-label {
    font-family: 'Syne', sans-serif;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 2.5px;
    text-transform: uppercase;
    margin-bottom: 16px;
    padding-bottom: 10px;
    border-bottom: 1px solid;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .panel-label::before {
    content: '';
    width: 6px; height: 6px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .p-ui      { background: var(--ui-bg);      border: 1px solid var(--ui-border); }
  .p-ui      .panel-label { color: var(--accent); border-color: var(--ui-border); }
  .p-ui      .panel-label::before { background: var(--accent); box-shadow: 0 0 6px var(--accent); }

  .p-state   { background: var(--state-bg);   border: 1px solid var(--state-border); }
  .p-state   .panel-label { color: var(--green); border-color: var(--state-border); }
  .p-state   .panel-label::before { background: var(--green); box-shadow: 0 0 6px var(--green); }

  .p-backend { background: var(--backend-bg); border: 1px solid var(--backend-border); }
  .p-backend .panel-label { color: var(--accent); border-color: var(--backend-border); }
  .p-backend .panel-label::before { background: var(--accent); box-shadow: 0 0 6px var(--accent); }

  .p-intel   { background: var(--intel-bg);   border: 1px solid var(--intel-border); }
  .p-intel   .panel-label { color: var(--purple); border-color: var(--intel-border); }
  .p-intel   .panel-label::before { background: var(--purple); box-shadow: 0 0 6px var(--purple); }

  .p-pay     { background: var(--pay-bg);     border: 1px solid var(--pay-border); }
  .p-pay     .panel-label { color: var(--amber); border-color: var(--pay-border); }
  .p-pay     .panel-label::before { background: var(--amber); box-shadow: 0 0 6px var(--amber); }

  .p-pub     { background: var(--pub-bg);     border: 1px solid var(--pub-border); }
  .p-pub     .panel-label { color: var(--teal); border-color: var(--pub-border); }
  .p-pub     .panel-label::before { background: var(--teal); box-shadow: 0 0 6px var(--teal); }

  .p-persist { background: var(--persist-bg); border: 1px solid var(--persist-border); }
  .p-persist .panel-label { color: var(--amber); border-color: var(--persist-border); }
  .p-persist .panel-label::before { background: var(--amber); box-shadow: 0 0 6px var(--amber); }

  /* ── NODES ── */
  .nodes { display: flex; flex-direction: column; gap: 8px; }
  .row   { display: flex; gap: 8px; align-items: flex-start; flex-wrap: wrap; }

  .node {
    background: var(--node-bg);
    border: 1px solid var(--border);
    border-radius: 5px;
    padding: 7px 11px;
    font-size: 11px;
    color: var(--white);
    white-space: nowrap;
    position: relative;
    transition: border-color 0.15s;
    cursor: default;
  }
  .node:hover { border-color: var(--accent); }
  .node.accent  { border-color: var(--accent);  color: var(--accent); }
  .node.green   { border-color: var(--green);   color: var(--green); }
  .node.amber   { border-color: var(--amber);   color: var(--amber); }
  .node.red     { border-color: var(--red);     color: var(--red); }
  .node.purple  { border-color: var(--purple);  color: var(--purple); }
  .node.teal    { border-color: var(--teal);    color: var(--teal); }
  .node.muted   { border-color: var(--muted);   color: var(--muted); font-size: 10px; }
  .node.gate {
    background: #2A1000;
    border: 2px solid var(--amber);
    color: var(--amber);
    font-weight: 700;
    font-size: 11px;
    clip-path: polygon(10% 0%, 90% 0%, 100% 50%, 90% 100%, 10% 100%, 0% 50%);
    padding: 8px 20px;
  }
  .node.db {
    border-radius: 0 0 12px 12px;
    border-top: 3px solid;
    padding-top: 10px;
    text-align: center;
    min-width: 110px;
  }
  .node.db.green  { border-top-color: var(--green); }
  .node.db.amber  { border-top-color: var(--amber); }

  .vtag {
    display: inline-block;
    font-size: 9px;
    font-weight: 700;
    padding: 1px 5px;
    border-radius: 3px;
    margin-right: 5px;
    background: #1A2A3A;
    color: var(--accent);
    letter-spacing: 0.5px;
  }
  .vtag.g { background: #0A2A1A; color: var(--green); }
  .vtag.p { background: #1A0A2A; color: var(--purple); }

  /* ── ARROWS ── */
  .arrow-section {
    margin-top: 12px;
    padding-top: 10px;
    border-top: 1px solid var(--border);
  }
  .arrow-row {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 6px;
    font-size: 10px;
    color: var(--muted);
    flex-wrap: wrap;
  }
  .arrow-row .from { color: var(--white); font-size: 10px; }
  .arrow-row .arr  { color: var(--muted); }
  .arrow-row .to   { color: var(--accent); font-size: 10px; }
  .arrow-row .to.g { color: var(--green); }
  .arrow-row .to.a { color: var(--amber); }
  .arrow-row .to.p { color: var(--purple); }
  .arrow-row .to.t { color: var(--teal); }
  .arrow-row .label {
    font-size: 9px;
    color: var(--muted);
    background: var(--surface);
    border: 1px solid var(--border);
    padding: 1px 6px;
    border-radius: 10px;
  }

  /* ── SUBPANEL (nested box) ── */
  .subpanel {
    border: 1px dashed;
    border-radius: 6px;
    padding: 10px 12px;
    margin-top: 10px;
  }
  .subpanel.accent { border-color: #1E3A5A; }
  .subpanel.green  { border-color: #1A3A2A; }
  .subpanel.purple { border-color: #2A1A4A; }
  .subpanel.amber  { border-color: #3A2A1A; }
  .subpanel-title {
    font-size: 9px;
    letter-spacing: 2px;
    text-transform: uppercase;
    margin-bottom: 8px;
    font-weight: 700;
  }
  .subpanel.accent .subpanel-title { color: var(--accent); }
  .subpanel.green  .subpanel-title { color: var(--green); }
  .subpanel.purple .subpanel-title { color: var(--purple); }
  .subpanel.amber  .subpanel-title { color: var(--amber); }

  /* ── CONNECTOR SVG ── */
  .connector-layer {
    position: absolute;
    top: 0; left: 0;
    width: 100%; height: 100%;
    pointer-events: none;
    overflow: visible;
  }

  /* ── FIX CALLOUTS ── */
  .fix-badge {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 9px;
    padding: 3px 8px;
    border-radius: 3px;
    background: #2A0A0A;
    border: 1px solid var(--red);
    color: var(--red);
    margin-top: 6px;
    margin-right: 4px;
  }
  .fix-badge.fixed {
    background: #0A2A1A;
    border-color: var(--green);
    color: var(--green);
  }

  /* ── LAYOUT SPANS ── */
  .span-2 { grid-column: span 2; }
  .span-3 { grid-column: span 3; }
  .col-1  { grid-column: 1; }
  .col-2  { grid-column: 2; }
  .col-3  { grid-column: 3; }

  /* ── FOOTNOTE ── */
  .footnote {
    margin-top: 28px;
    padding: 14px 18px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-left: 4px solid var(--accent);
    border-radius: 4px;
    font-size: 11px;
    color: var(--muted);
    max-width: 1400px;
    line-height: 1.8;
  }
  .footnote strong { color: var(--white); }

  /* ── DIFF PILLS ── */
  .diff-row {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    margin-top: 10px;
  }
  .diff-pill {
    font-size: 10px;
    padding: 3px 10px;
    border-radius: 12px;
    border: 1px solid;
  }
  .diff-pill.fixed  { border-color: var(--green);  color: var(--green);  background: #0A2010; }
  .diff-pill.new    { border-color: var(--accent);  color: var(--accent); background: #081828; }
  .diff-pill.future { border-color: var(--muted);   color: var(--muted);  background: var(--surface); }
</style>
</head>
<body>

<div class="header">
  <h1>INKFORGE</h1>
  <span class="sub">System Architecture — Canonical Diagram</span>
  <span class="badge">v3.0 · May 2026 · Corrected & Complete</span>
</div>

<!-- LEGEND -->
<div class="legend">
  <div class="legend-item"><div class="legend-dot" style="background:#00C8FF"></div>Editor / Backend Layer</div>
  <div class="legend-item"><div class="legend-dot" style="background:#00E5A0"></div>Frontend State (Zustand)</div>
  <div class="legend-item"><div class="legend-dot" style="background:#A855F7"></div>Intelligence / SSO Engine</div>
  <div class="legend-item"><div class="legend-dot" style="background:#FFB300"></div>Payments & Persistence</div>
  <div class="legend-item"><div class="legend-dot" style="background:#14B8A6"></div>Publishing / Export</div>
  <div class="legend-item"><div class="legend-dot" style="background:#FF4D6D"></div>Premium Gate</div>
  <div class="legend-item" style="margin-left:auto">
    <span class="diff-pill fixed">✓ FIXED</span>
    <span class="diff-pill new">+ NEW</span>
    <span class="diff-pill future">◌ FUTURE</span>
  </div>
</div>

<div class="grid">

  <!-- ══ ROW 1 COL 1: AUTHOR UI ══ -->
  <div class="panel p-ui">
    <div class="panel-label">Author UI — Midnight Chronicle Editor</div>
    <div class="nodes">
      <div class="row">
        <div class="node accent">Editor Interface</div>
        <div class="node muted">Keydown / Click</div>
      </div>
      <div class="row">
        <div class="node">Event Listener</div>
      </div>

      <div class="subpanel accent">
        <div class="subpanel-title">TipTap &amp; IME Logic</div>
        <div class="row" style="margin-bottom:8px">
          <div class="node accent">TipTap Editor Instance</div>
        </div>
        <div class="row">
          <div class="node muted">compositionstart</div>
          <span style="color:var(--muted);font-size:11px">→</span>
          <div class="node amber">IME Session Handler</div>
        </div>
        <div class="arrow-row" style="margin-top:6px">
          <span class="from">IME Handler</span><span class="arr">→</span>
          <span class="to a">Block Autosave</span>
          <span class="label">Redis flag</span>
        </div>
        <div class="row" style="margin-top:8px">
          <div class="node muted">Paragraph Blur</div>
          <span style="color:var(--muted);font-size:11px">→</span>
          <div class="node">Spellcheck Queue</div>
        </div>
        <div class="arrow-row">
          <span class="from">Spellcheck Queue</span><span class="arr">→</span>
          <span class="to">POST /spellcheck</span>
          <span class="arr">→</span>
          <span class="to g">Corrected Words</span>
          <span class="arr">→</span>
          <span class="to g">Render Squiggles ↩</span>
        </div>
        <div class="fix-badge fixed">✓ FIXED — return path now explicit</div>
      </div>

      <div class="subpanel accent" style="margin-top:10px">
        <div class="subpanel-title">Transliteration</div>
        <div class="row">
          <div class="node">Transliteration Mode Toggle</div>
        </div>
        <div class="arrow-row">
          <span class="from">Toggle</span><span class="arr">→</span>
          <span class="to">POST /transliterate</span>
          <span class="arr">→</span>
          <span class="to g">Transliteration Result Receiver ↩</span>
        </div>
        <div class="arrow-row">
          <span class="from">Result Receiver</span><span class="arr">→</span>
          <span class="to g">Inserts into TipTap at cursor</span>
        </div>
        <div class="fix-badge fixed">✓ FIXED — two Transliteration Hub nodes disambiguated</div>
      </div>

      <div class="row" style="margin-top:8px">
        <div class="node muted">Command Palette</div>
        <div class="node muted">Open ↗</div>
      </div>
    </div>
  </div>

  <!-- ══ ROW 1 COL 2: FRONTEND STATE ══ -->
  <div class="panel p-state">
    <div class="panel-label">Frontend State — Zustand SSOT</div>
    <div class="nodes">
      <div class="row">
        <div class="node green">StoryStore</div>
        <span style="color:var(--muted);font-size:11px">→</span>
        <div class="node">Inspector Panel</div>
        <span style="color:var(--muted);font-size:11px">→</span>
        <div class="node">Binder Panel</div>
      </div>

      <div class="subpanel green" style="margin-top:10px">
        <div class="subpanel-title">Sync &amp; Session Analytics</div>
        <div class="arrow-row">
          <span class="from">StoryStore</span><span class="arr">→</span>
          <span class="to g">Diff Detection</span><span class="arr">→</span>
          <span class="to g">pendingChanges Queue</span>
        </div>
        <div class="arrow-row">
          <span class="from">pendingChanges</span><span class="arr">→</span>
          <span class="to g">Debounce Timer</span><span class="arr">→</span>
          <div class="node amber" style="font-size:10px;padding:4px 10px">Sync Trigger</div>
        </div>
        <div class="arrow-row">
          <span class="from">Sync Trigger</span><span class="arr">→</span>
          <span class="to">Batch JSON</span><span class="arr">→</span>
          <span class="to">Batch API Service</span><span class="arr">→</span>
          <span class="to">POST /api/editor/data</span>
        </div>
        <div class="arrow-row" style="margin-top:8px;padding-top:8px;border-top:1px solid #1A3A2A">
          <span class="from">Session End</span>
          <span class="label">Autosave Manager event</span>
          <span class="arr">→</span>
          <span class="to g"><span class="vtag g">V10</span>Indic Analytics: Session Word Count</span>
        </div>
        <div class="arrow-row">
          <span class="from">Interval Trigger</span>
          <span class="label">every 3s</span>
          <span class="arr">→</span>
          <span class="to g"><span class="vtag g">V10</span>Indic Analytics: Streak Updater</span>
        </div>
        <div class="fix-badge fixed">✓ FIXED — V10 split into two named nodes. Analytics no longer triggers from export.</div>
      </div>

      <div class="subpanel green" style="margin-top:10px">
        <div class="subpanel-title">SSO Orchestration</div>
        <div class="arrow-row">
          <span class="from">Inspector Panel</span>
          <span class="label">Analyze Trigger</span>
          <span class="arr">→</span>
          <span class="to">POST /api/sso/snapshot</span>
        </div>
        <div class="arrow-row">
          <span class="from">StoryStore</span>
          <span class="label">Gather Bible / Context</span>
          <span class="arr">→</span>
          <span class="to g">SSO Object assembled</span>
        </div>
        <div class="arrow-row">
          <span class="from">SSO Object</span>
          <span class="arr">→</span>
          <span class="to p">Signal Engine entry point ↓</span>
        </div>
        <div class="fix-badge fixed">✓ FIXED — SSO Object now has explicit arrow into Intelligence pipeline</div>
      </div>
    </div>
  </div>

  <!-- ══ ROW 1 COL 3: PUBLISHING ══ -->
  <div class="panel p-pub" style="grid-row: span 2;">
    <div class="panel-label">Publishing — NovelFormatter</div>
    <div class="nodes">
      <div class="node teal">Export Trigger</div>

      <div class="arrow-row" style="margin-top:8px">
        <span class="from">Export Trigger</span><span class="arr">→</span>
        <span class="to t"><span class="vtag">V4</span>format_routes</span>
      </div>
      <div class="arrow-row">
        <span class="from">format_routes</span><span class="arr">→</span>
        <span class="to t">Template Mapping</span>
      </div>
      <div class="arrow-row">
        <span class="from">Template Mapping</span><span class="arr">→</span>
        <span class="to t">NovelFormatter Engine</span>
      </div>

      <div class="subpanel amber" style="margin-top:10px">
        <div class="subpanel-title">Font Embedding</div>
        <div class="arrow-row">
          <span class="from">Script Detection</span><span class="arr">→</span>
          <span class="to t">Noto Font Selection</span>
        </div>
        <div class="arrow-row">
          <span class="from">split_by_script()</span><span class="arr">→</span>
          <span class="to t">Per-run font assign</span>
        </div>
        <div class="arrow-row">
          <span class="from">w:cs XML slot</span><span class="arr">→</span>
          <span class="to t">Word-safe render</span>
        </div>
      </div>

      <div class="arrow-row" style="margin-top:8px">
        <span class="from">Font Embedded doc</span><span class="arr">→</span>
        <span class="to t">Binary Stream</span><span class="arr">→</span>
        <span class="to t">Blob ObjectURL</span>
      </div>
      <div class="arrow-row">
        <span class="from">Blob</span><span class="arr">→</span>
        <span class="to t">.docx Download ✓</span>
      </div>

      <div style="margin-top:14px;padding-top:10px;border-top:1px solid #1A3A2A">
        <div class="subpanel-title" style="color:var(--muted)">Future — Phase 3</div>
        <div class="node future muted" style="margin-top:6px;font-size:10px">Publisher Submission Packet</div>
        <div class="node future muted" style="margin-top:6px;font-size:10px">Query Letter Generator</div>
        <div class="node future muted" style="margin-top:6px;font-size:10px">Pratilipi Direct Publish</div>
        <div class="diff-pill future" style="margin-top:8px;display:inline-flex">◌ Not yet built</div>
      </div>
    </div>
  </div>

  <!-- ══ ROW 2 COL 1: PAYMENTS ══ -->
  <div class="panel p-pay">
    <div class="panel-label">Payments &amp; Auth</div>
    <div class="nodes">
      <div class="row">
        <div class="node amber">Razorpay UI</div>
        <span style="color:var(--muted);font-size:11px">→</span>
        <div class="node amber">Payment Success</div>
      </div>
      <div class="arrow-row" style="margin-top:4px">
        <span class="from">Webhook Listener</span><span class="arr">→</span>
        <span class="to a">webhook_events table</span>
        <span class="label">idempotency check</span>
      </div>
      <div class="arrow-row">
        <span class="from">Payment Success</span><span class="arr">→</span>
        <span class="to a">Session Token issued</span><span class="arr">→</span>
        <span class="to a">Profiles Table updated</span>
      </div>
      <div class="arrow-row">
        <span class="from">Profiles Table</span>
        <span class="label">subscription_tier</span>
        <span class="arr">→</span>
        <span class="to a">Tier Check</span>
        <span class="arr">→</span>
        <span class="to a">Bearer Auth / JWT</span>
      </div>
      <div class="arrow-row">
        <span class="from">JWT</span><span class="arr">→</span>
        <div class="node gate" style="font-size:10px;padding:6px 16px">require_premium_tier</div>
      </div>
      <div class="fix-badge fixed">✓ FIXED — Profiles Table now feeds the premium gate. Gate is no longer floating.</div>
    </div>
  </div>

  <!-- ══ ROW 2 COL 2: BACKEND ══ -->
  <div class="panel p-backend">
    <div class="panel-label">Backend — FastAPI Vernacular Pipeline</div>
    <div class="nodes">

      <div class="arrow-row">
        <span class="from">POST /api/editor/data</span><span class="arr">→</span>
        <span class="to">editor_routes / editor_tools</span>
      </div>

      <div class="subpanel accent">
        <div class="subpanel-title">Text Processing Services &amp; Return Paths</div>
        <div class="row" style="flex-wrap:wrap;gap:6px;margin-bottom:8px">
          <div class="node"><span class="vtag">V1</span>indic_counter.py</div>
          <div class="node"><span class="vtag">V5</span>unicode_normaliser.py</div>
          <div class="node"><span class="vtag">V8</span>indic_punctuation.py</div>
        </div>
        <div class="arrow-row">
          <span class="from">V1 Word Count</span><span class="arr">→</span>
          <span class="to g">Streak Service</span>
          <span class="arr">+</span>
          <span class="to g">Goal Bar ↩ to StoryStore</span>
        </div>
        <div class="arrow-row">
          <span class="from">V5 NFC Normalise</span><span class="arr">→</span>
          <span class="to">Supabase Upsert (write-time)</span>
        </div>
        <div class="arrow-row">
          <span class="from">V8 Punctuation</span><span class="arr">→</span>
          <span class="to">SSO Prompt Assembler</span>
        </div>
        <div class="fix-badge new">+ V6 indic_token_estimator.py — pre-AI call gate</div>
        <div class="fix-badge new">+ V9 ime_session_handler — Redis dead-man TTL 30s</div>
      </div>

      <div class="subpanel accent" style="margin-top:10px">
        <div class="subpanel-title">Tool Endpoints</div>
        <div class="arrow-row">
          <span class="from">Spellcheck Queue</span>
          <span class="arr">→</span>
          <span class="to"><span class="vtag">V3</span>POST /spellcheck</span>
          <span class="arr">→</span>
          <span class="to g">Corrected Words ↩</span>
          <span class="label">back to TipTap squiggles</span>
        </div>
        <div class="arrow-row">
          <span class="from">Transliteration Mode Toggle</span>
          <span class="arr">→</span>
          <span class="to"><span class="vtag">V2</span>POST /transliterate</span>
          <span class="arr">→</span>
          <span class="to g">Indic Output ↩</span>
          <span class="label">back to cursor</span>
        </div>
        <div class="arrow-row">
          <span class="from">V5 Normaliser</span>
          <span class="arr">→</span>
          <span class="to">POST /search</span>
          <span class="label">NFC-safe query</span>
        </div>
      </div>

    </div>
  </div>

  <!-- ══ ROW 3 COL 1-2: INTELLIGENCE ══ -->
  <div class="panel p-intel span-2">
    <div class="panel-label">Intelligence — SSO Engine</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">

      <div class="nodes">
        <div class="arrow-row">
          <span class="from">SSO Object</span>
          <span class="label">from SSO Orchestration</span>
          <span class="arr">→</span>
          <span class="to">ai_routes</span>
        </div>
        <div class="arrow-row">
          <span class="from">ai_routes</span>
          <span class="arr">→</span>
          <span class="to"><span class="vtag">V6</span>indic_token_estimator.py</span>
          <span class="label">token cap check</span>
        </div>
        <div class="arrow-row">
          <span class="from">Token OK</span>
          <span class="arr">→</span>
          <div class="node gate" style="font-size:10px;padding:6px 14px">require_premium_tier</div>
        </div>
        <div class="arrow-row">
          <span class="from">Gate</span>
          <span class="arr">→</span>
          <span class="to p">Authorized: Signal Engine</span>
        </div>
        <div class="arrow-row">
          <span class="from">Gate</span>
          <span class="arr">→</span>
          <span class="to">Denied: HTTP 402 + upgrade_url</span>
        </div>

        <div class="subpanel purple" style="margin-top:12px">
          <div class="subpanel-title">AI Modes</div>
          <div class="row" style="gap:6px">
            <div class="node purple" style="font-size:10px">NORMAL<br><span style="font-size:9px;color:var(--muted)">5K tokens</span></div>
            <div class="node purple" style="font-size:10px">DEPTH<br><span style="font-size:9px;color:var(--muted)">8K tokens</span></div>
            <div class="node purple" style="font-size:10px">EXTENDED<br><span style="font-size:9px;color:var(--muted)">12K hard cap</span></div>
          </div>
        </div>

        <div style="margin-top:14px;padding-top:10px;border-top:1px solid #2A1A4A">
          <div class="subpanel-title" style="color:var(--muted)">Future Intelligence — Phase 3</div>
          <div class="row" style="flex-wrap:wrap;gap:6px;margin-top:6px">
            <div class="node muted" style="font-size:9px">Narrative Debt Tracker</div>
            <div class="node muted" style="font-size:9px">Emotional Continuity Engine</div>
            <div class="node muted" style="font-size:9px">Reader Fatigue Predictor</div>
            <div class="node muted" style="font-size:9px">Manuscript Heartbeat</div>
            <div class="node muted" style="font-size:9px">Cultural Authenticity Checker</div>
            <div class="node muted" style="font-size:9px">Subtext Density Score</div>
          </div>
          <div class="diff-pill future" style="margin-top:8px;display:inline-flex">◌ Awaiting SSO v2 foundation</div>
        </div>
      </div>

      <div class="nodes">
        <div class="subpanel purple">
          <div class="subpanel-title">Premium Execution Pipeline</div>
          <div class="arrow-row">
            <span class="from">Signal Engine</span>
            <span class="arr">→</span>
            <span class="to p"><span class="vtag p">V12</span>script_continuity.py</span>
            <span class="label">+180 tokens</span>
          </div>
          <div class="arrow-row">
            <span class="from">Signal Engine</span>
            <span class="arr">→</span>
            <span class="to p"><span class="vtag p">V7</span>entity_resolver.py</span>
            <span class="label">cross-script merge</span>
          </div>
          <div class="arrow-row">
            <span class="from">Signal Engine</span>
            <span class="arr">→</span>
            <span class="to p"><span class="vtag p">V11</span>language_router_v2.py</span>
            <span class="label">model selection</span>
          </div>
          <div class="arrow-row" style="margin-top:8px">
            <span class="from">India SSO Injection</span>
            <span class="arr">→</span>
            <span class="to p">india_fiction_system.py</span>
            <span class="label">+820 tokens conditional</span>
          </div>
          <div class="arrow-row" style="padding-top:8px;border-top:1px solid #2A1A4A;margin-top:8px">
            <span class="from">Context + Prompts</span>
            <span class="arr">→</span>
            <span class="to p">OpenRouter API</span>
          </div>
          <div class="arrow-row">
            <span class="from">OpenRouter Response</span>
            <span class="arr">→</span>
            <span class="to p">Signal Synthesizer</span>
          </div>
          <div class="arrow-row">
            <span class="from">Every call</span>
            <span class="arr">→</span>
            <span class="to">ai_call_logs</span>
            <span class="label">model, tokens, latency, user_id</span>
          </div>
          <div class="fix-badge fixed">✓ FIXED — ai_call_logs write shown on every OpenRouter call</div>
        </div>

        <div class="arrow-row" style="margin-top:12px">
          <span class="from">Signal Synthesizer</span>
          <span class="arr">→</span>
          <span class="to g">Insights JSON</span>
          <span class="arr">→</span>
          <span class="to g">StoryStore ↩ (Zustand)</span>
        </div>
        <div class="fix-badge fixed">✓ FIXED — insights return path to StoryStore explicit</div>
      </div>
    </div>
  </div>

  <!-- ══ ROW 3 COL 3: PERSISTENCE ══ -->
  <div class="panel p-persist">
    <div class="panel-label">Persistence &amp; Analytics</div>
    <div class="nodes">
      <div class="arrow-row">
        <span class="from">editor_routes</span>
        <span class="arr">→</span>
        <span class="to a">V10: Session Word Count</span>
      </div>
      <div class="arrow-row">
        <span class="from">NFC Data</span>
        <span class="arr">→</span>
        <span class="to">Supabase Upsert</span>
      </div>
      <div class="arrow-row">
        <span class="from">V10 Session Count</span>
        <span class="arr">→</span>
        <span class="to a">V10: Streak Updater</span>
      </div>
      <div class="fix-badge fixed">✓ FIXED — V10 two separate responsibilities shown</div>

      <div style="margin-top:14px;display:flex;gap:10px;flex-wrap:wrap">
        <div class="node db green" style="min-width:100px;text-align:center">
          <div style="font-size:10px;color:var(--muted);margin-bottom:4px">PostgreSQL</div>
          <div style="font-size:10px">Supabase</div>
          <div style="font-size:9px;color:var(--muted);margin-top:3px">scenes · characters</div>
          <div style="font-size:9px;color:var(--muted)">projects · profiles</div>
          <div style="font-size:9px;color:var(--muted)">conflict_states</div>
        </div>
        <div class="node db amber" style="min-width:100px;text-align:center">
          <div style="font-size:10px;color:var(--muted);margin-bottom:4px">writing_sessions</div>
          <div style="font-size:10px">Streaks</div>
          <div style="font-size:9px;color:var(--muted);margin-top:3px">per-script counts</div>
          <div style="font-size:9px;color:var(--muted)">daily_goal · streak</div>
          <div style="font-size:9px;color:var(--muted)">timezone-aware</div>
        </div>
      </div>

      <div style="margin-top:10px">
        <div class="node db" style="border-top-color:var(--red);min-width:100%;text-align:center">
          <div style="font-size:10px;color:var(--muted);margin-bottom:4px">ai_call_logs</div>
          <div style="font-size:10px;color:var(--red)">AI Usage Log</div>
          <div style="font-size:9px;color:var(--muted);margin-top:3px">model · tokens · latency</div>
          <div style="font-size:9px;color:var(--muted)">user_id · mode · tracks</div>
        </div>
      </div>

      <div style="margin-top:10px">
        <div class="node db" style="border-top-color:var(--amber);min-width:100%;text-align:center">
          <div style="font-size:10px;color:var(--muted);margin-bottom:4px">webhook_events</div>
          <div style="font-size:10px;color:var(--amber)">Payment Events</div>
          <div style="font-size:9px;color:var(--muted);margin-top:3px">event_id (idempotency)</div>
          <div style="font-size:9px;color:var(--muted)">subscription lifecycle</div>
        </div>
      </div>
    </div>
  </div>

</div><!-- end grid -->

<!-- FOOTNOTE -->
<div class="footnote" style="max-width:1400px">
  <strong>v3.0 corrections from v2.0 (uploaded diagram):</strong>
  &nbsp;
  <span class="diff-pill fixed">✓</span> Transliteration Hub split into Toggle and Result Receiver — eliminates node ambiguity.
  &nbsp;
  <span class="diff-pill fixed">✓</span> SSO Object now has explicit arrow into Signal Engine entry point.
  &nbsp;
  <span class="diff-pill fixed">✓</span> V10 split into Session Word Count and Streak Updater — analytics no longer triggers from export.
  &nbsp;
  <span class="diff-pill fixed">✓</span> Profiles Table → Tier Check → Bearer Auth feeds the premium gate. Gate is no longer floating.
  &nbsp;
  <span class="diff-pill fixed">✓</span> ai_call_logs write shown on every OpenRouter call, not implied.
  &nbsp;
  <span class="diff-pill fixed">✓</span> Spellcheck return path (Corrected Words → TipTap squiggles) made explicit.
  &nbsp;
  <span class="diff-pill new">+</span> Future intelligence features (Narrative Debt, Heartbeat, etc.) shown as ◌ nodes awaiting SSO v2.
  &nbsp;
  <span class="diff-pill new">+</span> Publisher Submission Packet and Pratilipi Direct Publish shown as future publishing nodes.
  &nbsp;
  <span class="diff-pill new">+</span> Voice Input (V13) not shown — awaiting spec confirmation.
</div>

</body>
</html>


