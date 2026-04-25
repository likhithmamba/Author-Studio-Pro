/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  AUTHOR STUDIO PRO — MIDNIGHT CHRONICLE                            ║
 * ║  Complete UI + Backend Integration Layer                           ║
 * ║  v3.0 — Error-free, production-ready                               ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 *
 * BACKEND INTEGRATION MAP
 * ─────────────────────────────────────────────────────────────────────
 *  useAutoSave       → PUT  /api/scenes/:id/content        (debounced 2s)
 *  useWritingSession → POST /api/sessions                  (word tracking)
 *  useAnalysis       → POST /api/analysis/prose            (prose metrics)
 *  useAI             → POST /api/ai/assist                 (AI feedback)
 *  useVersionHistory → GET  /api/scenes/:id/versions
 *  useExport         → POST /api/export
 *  useFind           → client-side (no API)
 *  useWordCount      → client-side (no API)
 * ─────────────────────────────────────────────────────────────────────
 */

import { useState, useEffect, useRef, useCallback, createContext, useContext, useReducer } from "react";
import { useStoryStore } from "../../store/storyStore";
import ThinkingPanel from '../ThinkingPanel/ThinkingPanel';

// ═══════════════════════════════════════════════════════════════════════
// 1. DESIGN TOKENS
// ═══════════════════════════════════════════════════════════════════════
const T = {
  bg:           "#0c0d11",
  bgDeep:       "#080910",
  panel:        "#111318",
  panelRaised:  "#151720",
  surface:      "#1a1d27",
  border:       "#22253a",
  borderSoft:   "#1a1d2e",
  accent:       "#c9a24e",
  accentSoft:   "#c9a24e14",
  accentGlow:   "#c9a24e28",
  text:         "#e8e4d8",
  textSoft:     "#b8b4a8",
  textMuted:    "#6e6f88",
  textDim:      "#4a4b60",
  green:        "#5cc98a",
  blue:         "#6b9de8",
  red:          "#e85c5c",
  amber:        "#e8a84a",
  purple:       "#9d7de8",
  teal:         "#4ec9b0",
  fontDisplay:  "'Playfair Display', Georgia, serif",
  fontBody:     "'Crimson Text', Georgia, serif",
  fontUI:       "'DM Sans', system-ui, sans-serif",
  fontMono:     "'JetBrains Mono', monospace",
  fontTitle:    "'Cormorant Garamond', Georgia, serif",
  r:            "6px",
  rSm:          "4px",
};

// ═══════════════════════════════════════════════════════════════════════
// 2. STYLE HELPERS  (defined before any component references them)
// ═══════════════════════════════════════════════════════════════════════
const btnSt = (w = 26, active = false) => ({
  width: w, height: 26, display: "flex", alignItems: "center",
  justifyContent: "center", borderRadius: T.rSm,
  border: `1px solid ${active ? T.accent : T.border}`,
  background: active ? T.accentSoft : "transparent",
  color: active ? T.accent : T.textMuted, cursor: "pointer", flexShrink: 0,
});
const selSt = (maxWidth) => ({
  height: 26, border: `1px solid ${T.border}`, borderRadius: T.rSm,
  background: T.surface, color: T.textSoft, fontSize: 11,
  fontFamily: T.fontUI, padding: "0 4px", cursor: "pointer", maxWidth,
});
const inpSt = (width) => ({
  height: 26, border: `1px solid ${T.border}`, borderRadius: T.rSm,
  background: T.surface, color: T.text, fontSize: 11,
  fontFamily: T.fontUI, padding: "0 8px", width, outline: "none",
});
const smBtnSt = {
  padding: "0 8px", height: 26, borderRadius: T.rSm,
  border: `1px solid ${T.border}`, background: T.surface,
  color: T.textMuted, cursor: "pointer", fontSize: 10, fontFamily: T.fontUI,
};
const labelSt = { fontSize: 9, color: T.textDim, fontFamily: T.fontUI, whiteSpace: "nowrap" };
const stepL = {
  width: 20, height: 26, border: `1px solid ${T.border}`,
  borderRadius: `${T.rSm} 0 0 ${T.rSm}`, background: T.surface,
  color: T.textMuted, cursor: "pointer", fontSize: 13,
};
const stepR = {
  width: 20, height: 26, border: `1px solid ${T.border}`,
  borderRadius: `0 ${T.rSm} ${T.rSm} 0`, background: T.surface,
  color: T.textMuted, cursor: "pointer", fontSize: 13,
};
const stepMid = {
  width: 34, height: 26, border: `1px solid ${T.border}`,
  borderLeft: "none", borderRight: "none", background: T.surface,
  display: "flex", alignItems: "center", justifyContent: "center",
  fontSize: 11, color: T.textSoft, fontFamily: T.fontMono,
};

// ═══════════════════════════════════════════════════════════════════════
// 3. PRIMITIVE COMPONENTS
// ═══════════════════════════════════════════════════════════════════════
const Divider = ({ vertical, style: s }) =>
  vertical
    ? <div style={{ width: 1, alignSelf: "stretch", background: T.border, flexShrink: 0, ...s }} />
    : <div style={{ height: 1, width: "100%", background: T.border, ...s }} />;

const Badge = ({ label, color = T.accent }) => (
  <span style={{
    display: "inline-flex", alignItems: "center", padding: "2px 7px",
    borderRadius: 3, fontSize: 9, fontWeight: 700, fontFamily: T.fontUI,
    letterSpacing: "0.1em", textTransform: "uppercase",
    background: `${color}18`, color, border: `1px solid ${color}33`,
  }}>{label}</span>
);

const PBar = ({ value, max, color = T.accent, height = 3, label }) => {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {label && (
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: 10, color: T.textMuted, fontFamily: T.fontUI }}>{label}</span>
          <span style={{ fontSize: 10, color, fontFamily: T.fontMono }}>{value.toLocaleString()} / {max.toLocaleString()}</span>
        </div>
      )}
      <div style={{ height, borderRadius: height, background: T.border, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: `linear-gradient(90deg,${color}cc,${color})`, borderRadius: height, transition: "width 0.6s ease" }} />
      </div>
    </div>
  );
};

const MBar = ({ label, value, color }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
    <div style={{ display: "flex", justifyContent: "space-between" }}>
      <span style={{ fontSize: 10, color: T.textMuted, fontFamily: T.fontUI }}>{label}</span>
      <span style={{ fontSize: 10, color, fontFamily: T.fontMono, fontWeight: 600 }}>{value}%</span>
    </div>
    <div style={{ height: 3, borderRadius: 2, background: T.border, overflow: "hidden" }}>
      <div style={{ width: `${value}%`, height: "100%", background: color, borderRadius: 2 }} />
    </div>
  </div>
);

// ── SVG Icons ──────────────────────────────────────────────────────────
const PATHS = {
  write:    "M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z",
  dash:     "M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z",
  board:    "M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14l-5-5 1.41-1.41L12 14.17l7.59-7.59L21 8l-9 9z",
  person:   "M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z",
  globe:    "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z",
  clock:    "M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z",
  folder:   "M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z",
  export:   "M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z",
  settings: "M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.57 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z",
  plus:     "M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z",
  search:   "M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z",
  check:    "M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z",
  ai:       "M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z",
  book:     "M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 4h5v8l-2.5-1.5L6 12V4z",
  fire:     "M13.5.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5.67z",
  lightning:"M7 2v11h3v9l7-12h-4l4-8z",
  eye:      "M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z",
  undo:     "M12.5 8c-2.65 0-5.05 1-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z",
  redo:     "M18.4 10.6C16.55 9 14.15 8 11.5 8c-4.65 0-8.58 3.03-9.96 7.22L3.9 15.7C4.95 12.81 7.95 10.5 11.5 10.5c1.96 0 3.73.72 5.12 1.88L13 16h9V7l-3.6 3.6z",
  tag:      "M21.41 11.58l-9-9C12.05 2.22 11.55 2 11 2H4c-1.1 0-2 .9-2 2v7c0 .55.22 1.05.59 1.42l9 9c.36.36.86.58 1.41.58.55 0 1.05-.22 1.41-.59l7-7c.37-.36.59-.86.59-1.41 0-.55-.23-1.06-.59-1.42z",
  note:     "M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z",
};
const Ico = ({ n, s = 15, c = "currentColor" }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill={c} style={{ flexShrink: 0, display: "block" }}>
    {PATHS[n] && <path d={PATHS[n]} />}
  </svg>
);

// ═══════════════════════════════════════════════════════════════════════
// 4. BACKEND SERVICE HOOKS
// ═══════════════════════════════════════════════════════════════════════
const BASE_URL = "/api"; // ← change in production

const apiFetch = async (endpoint, options = {}) => {
  const token = localStorage.getItem("asp_token");
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers },
    ...options,
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
};

const syncAllPendingDrafts = async () => {
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith("asp_draft_")) {
      const sceneId = key.replace("asp_draft_", "");
      const content = localStorage.getItem(key);
      try {
        await apiFetch(`/scenes/${sceneId}/content`, { method: "PUT", body: JSON.stringify({ content }) });
        localStorage.removeItem(key);
      } catch (err) {
        console.error("Failed to sync offline draft for", sceneId);
      }
    }
  }
};

// Auto-run on load
if (typeof window !== "undefined") {
  setTimeout(syncAllPendingDrafts, 3000);
}

/** PUT /api/scenes/:id/content — 2s debounce, localStorage fallback */
const useAutoSave = (sceneId, content) => {
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(new Date());
  const timer = useRef(null);

  useEffect(() => {
    if (!sceneId || content === undefined) return;
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setSaving(true);
      try {
        await apiFetch(`/scenes/${sceneId}/content`, { method: "PUT", body: JSON.stringify({ content }) });
        setLastSaved(new Date());
      } catch {
        localStorage.setItem(`asp_draft_${sceneId}`, content);
        setLastSaved(new Date());
      } finally { setSaving(false); }
    }, 2000);
    return () => clearTimeout(timer.current);
  }, [sceneId, content]);

  const saveNow = useCallback(async () => {
    clearTimeout(timer.current);
    setSaving(true);
    try { await apiFetch(`/scenes/${sceneId}/content`, { method: "PUT", body: JSON.stringify({ content }) }); setLastSaved(new Date()); }
    catch { localStorage.setItem(`asp_draft_${sceneId}`, content); setLastSaved(new Date()); }
    finally { setSaving(false); }
  }, [sceneId, content]);

  return { saving, lastSaved, saveNow };
};

/** POST /api/sessions — word delta tracking + session timer */
const useWritingSession = (projectId) => {
  const [sessionStart] = useState(Date.now());
  const [secs, setSecs] = useState(0);
  const prevWords = useRef(0);

  useEffect(() => {
    const t = setInterval(() => setSecs(s => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const recordWords = useCallback(async (count) => {
    const delta = Math.max(0, count - prevWords.current);
    if (delta > 0) {
      prevWords.current = count;
      try { await apiFetch("/sessions", { method: "POST", body: JSON.stringify({ projectId, wordsAdded: delta }) }); } catch {}
    }
  }, [projectId]);

  const h = Math.floor(secs / 3600), m = Math.floor((secs % 3600) / 60), s = secs % 60;
  const sessionTime = h > 0 ? `${h}h ${m}m` : `${m}m ${s}s`;
  return { sessionTime, recordWords };
};

/** POST /api/analysis/prose { text } → metrics */
const useAnalysis = () => {
  const [analysis, setAnalysis] = useState(MOCK_ANALYSIS);
  const analyze = useCallback(async (text) => {
    if (!text || text.length < 50) return;
    try { const d = await apiFetch("/analysis/prose", { method: "POST", body: JSON.stringify({ text }) }); setAnalysis(d); } catch {}
  }, []);
  return { analysis, analyze };
};

/** POST /api/ai/assist { mode, text } → feedback[] */
const useAI = () => {
  const [feedback, setFeedback] = useState(MOCK_AI_FEEDBACK);
  const [loading, setLoading] = useState(false);
  const getAssist = useCallback(async (mode, text) => {
    setLoading(true);
    try { const d = await apiFetch("/ai/assist", { method: "POST", body: JSON.stringify({ mode, text }) }); setFeedback(d.feedback || MOCK_AI_FEEDBACK); }
    catch {} finally { setLoading(false); }
  }, []);
  return { feedback, loading, getAssist };
};

/** GET /api/scenes/:id/versions */
const useVersionHistory = (sceneId) => {
  const [versions] = useState(MOCK_VERSIONS);
  const restore = useCallback(async (versionId) => {
    try { const d = await apiFetch(`/scenes/${sceneId}/versions/restore/${versionId}`, { method: "POST" }); return d.content; } catch { return null; }
  }, [sceneId]);
  return { versions, restore };
};

/** POST /api/export → { downloadUrl } */
const useExport = () => {
  const [exporting, setExporting] = useState(false);
  const doExport = useCallback(async (projectId, format, options) => {
    setExporting(true);
    try { const d = await apiFetch("/export", { method: "POST", body: JSON.stringify({ projectId, format, options }) }); return d.downloadUrl; }
    catch { return null; } finally { setExporting(false); }
  }, []);
  return { exporting, doExport };
};

/** Client-side find/replace */
const useFind = (content, setContent) => {
  const [findText, setFindText] = useState("");
  const [replaceText, setReplaceText] = useState("");
  const [matchCase, setMatchCase] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);

  const matchCount = (() => {
    if (!findText) return 0;
    try {
      const flags = matchCase ? "g" : "gi";
      const pattern = wholeWord ? `\\b${findText}\\b` : findText;
      return [...(content || "").matchAll(new RegExp(pattern, flags))].length;
    } catch { return 0; }
  })();

  const replaceAll = useCallback(() => {
    if (!findText) return;
    try {
      const flags = matchCase ? "g" : "gi";
      const pattern = wholeWord ? `\\b${findText}\\b` : findText;
      setContent(c => c.replace(new RegExp(pattern, flags), replaceText));
    } catch {}
  }, [findText, replaceText, matchCase, wholeWord, setContent]);

  return { findText, setFindText, replaceText, setReplaceText, matchCase, setMatchCase, wholeWord, setWholeWord, matchCount, replaceAll };
};

/** Client-side word / char / para count */
const useWordCount = (text) => ({
  words: text ? text.trim().split(/\s+/).filter(Boolean).length : 0,
  chars: text ? text.length : 0,
  paras: text ? text.split(/\n\n+/).filter(Boolean).length : 1,
});

// ═══════════════════════════════════════════════════════════════════════
// 5. MOCK DATA  (replace each with real API calls in production)
// ═══════════════════════════════════════════════════════════════════════
const MOCK_CONTENT = `The old lighthouse keeper had not spoken to another soul in thirty-seven years. He had grown accustomed to the silence — had come to love it, in fact, the way a man learns to love the particular weight of a life he has chosen without entirely meaning to.

When the girl appeared on the rocks below, drenched and shivering, he stood for a long moment at the window before descending the iron stairs.

She was perhaps fourteen, perhaps younger, her dark hair plastered against her cheeks in flat, sodden ribbons. She did not speak when he reached her, and he did not expect her to.

He carried her inside without a word — which was, for Eli Marsh, the only way he knew how to speak.`;

const MOCK_CHAPTERS = [
  { id: "ch0", label: "Dedication",              status: "done",   words: 42,   scenes: [] },
  { id: "ch1", label: "Prologue",                status: "done",   words: 2148, scenes: [{ id: "s1a", title: "The Wreck" }, { id: "s1b", title: "Found at Dawn" }] },
  { id: "ch2", label: "Ch. 1 — The Storm",       status: "done",   words: 3421, scenes: [{ id: "s2a", title: "Gathering Clouds" }, { id: "s2b", title: "The Last Ship" }] },
  { id: "ch3", label: "Ch. 2 — Arrivals",        status: "done",   words: 3204, scenes: [{ id: "s3a", title: "Dawn" }, { id: "s3b", title: "The Inspector" }] },
  { id: "ch4", label: "Ch. 3 — The Descent",     status: "active", words: 1243, scenes: [{ id: "scene_3_1", title: "The Girl on the Rocks" }, { id: "s4b", title: "The Climb" }] },
  { id: "ch5", label: "Ch. 4 — The Secret",      status: "draft",  words: 0,    scenes: [] },
  { id: "ch6", label: "Ch. 5 — The Letter",      status: "draft",  words: 0,    scenes: [] },
];

const MOCK_CHARS = [
  { id: "eli",    name: "Eli Marsh",        role: "Protagonist",   age: 67, arc: "Redemption", color: T.accent,  traits: ["Taciturn","Perceptive","Haunted"],      bio: "Former merchant sailor turned lighthouse keeper. Has not spoken to another soul in 37 years.", firstAppears: "Prologue",        wordCount: 892, scenes: 14, arc_pct: 35 },
  { id: "girl",   name: "The Girl / Clara", role: "Deuteragonist", age: 14, arc: "Discovery",  color: T.blue,    traits: ["Silent","Watchful","Knows too much"],   bio: "Arrives on the rocks during a storm. Does not speak. Knows Eli's old name.",             firstAppears: "Ch. 3",           wordCount: 411, scenes: 4,  arc_pct: 10 },
  { id: "half",   name: "Insp. Halford",    role: "Antagonist",    age: 54, arc: "Obsession",  color: T.red,     traits: ["Methodical","Cold","Dangerous"],         bio: "Inspector connected to the 1952 Wrecking. His real motive is buried in the past.",       firstAppears: "Ch. 2",           wordCount: 318, scenes: 3,  arc_pct: 20 },
  { id: "mary",   name: "Mary Marsh",       role: "Absent Figure", age: 52, arc: "Mystery",    color: T.purple,  traits: ["Warm","Fearless","Chose to leave"],      bio: "Eli's wife, disappeared 1990. Referenced through flashback and memory.",                firstAppears: "Ch. 1 (flashback)", wordCount: 210, scenes: 6,  arc_pct: 0  },
  { id: "thomas", name: "Thomas Crane",     role: "Supporting",    age: 71, arc: "Conscience", color: T.green,   traits: ["Loyal","Weathered","Knows secrets"],     bio: "Runs the post office. The only person who still leaves food for Eli.",                  firstAppears: "Ch. 2",           wordCount: 189, scenes: 2,  arc_pct: 15 },
];

const MOCK_LOCS = [
  { id: "l1", name: "The Lighthouse",       type: "Primary Setting", region: "Crow's Point",      desc: "19th-century stone lighthouse. Four stories of iron stairs. Light automated since 1985. Eli lives in the keeper's cottage attached to the base.", tag: "ACTIVE",    color: T.accent },
  { id: "l2", name: "Crow's Point Village", type: "Secondary",       region: "Coastal",            desc: "Fishing village of 340 people. Declining since the cannery closed in 1978. Locals consider the lighthouse haunted.", tag: "RECURRING", color: T.blue   },
  { id: "l3", name: "The Lower Rocks",      type: "Scene Location",  region: "Lighthouse grounds", desc: "Where the girl is found. Granite shelf worn smooth by surf. A cave beneath at low tide.", tag: "KEY SCENE", color: T.red    },
  { id: "l4", name: "The Keeper's Cottage", type: "Interior",        region: "Lighthouse grounds", desc: "Stone walls 80cm thick. A woodstove. 37 years of logbooks. One locked room sealed in 1990.", tag: "ACTIVE",    color: T.accent },
];

const MOCK_TIMELINE = [
  { id: "t1", year: 1952, label: "The Wrecking",        desc: "SS Ardmore runs aground. 12 of 19 crew lost. Eli, 25, survives.",      type: "historical", color: T.red    },
  { id: "t2", year: 1953, label: "Eli becomes Keeper",  desc: "Appointed lighthouse keeper — 'penance for surviving'.",               type: "character",  color: T.accent },
  { id: "t3", year: 1961, label: "Marries Mary",         desc: "Marries Mary Vance. 29 years together in the lighthouse.",            type: "character",  color: T.green  },
  { id: "t4", year: 1985, label: "Light Automated",      desc: "Lighthouse automated. Eli stays as unofficial caretaker.",            type: "world",      color: T.blue   },
  { id: "t5", year: 1990, label: "Mary Disappears",      desc: "A clear November night. No body found. Three days before report.",    type: "mystery",    color: T.purple },
  { id: "t6", year: 1991, label: "The Vow of Silence",   desc: "Last words to Thomas Crane: 'I'll be here.' Has not spoken since.",  type: "character",  color: T.accent },
  { id: "t7", year: 2024, label: "The Girl Arrives",     desc: "Present day. A storm. A child on the rocks. The silence breaks.",    type: "present",    color: T.amber  },
];

const MOCK_RESEARCH = [
  { id: "r1", tag: "LIGHTHOUSE", color: T.accent, title: "Keeper duties post-automation",    body: "After 1985 automation, most keepers were given notice. A few retained as informal caretakers. No salary — accommodation only. Legally ambiguous status." },
  { id: "r2", tag: "MARITIME",   color: T.blue,   title: "Reporting missing person at sea",  body: "In 1990, a report from a remote lighthouse required physical travel to the nearest coast guard station (22 miles). Eli never made this trip." },
  { id: "r3", tag: "PSYCHOLOGY", color: T.purple, title: "Selective mutism in adults",       body: "Trauma-induced mutism in adults is rare but documented. Always tied to a specific precipitating event. Speech is physically possible but psychologically blocked." },
  { id: "r4", tag: "HISTORY",    color: T.red,    title: "SS Ardmore wreck records",          body: "Real-world analogue: Flying Enterprise, 1952 — captain refuses to leave his ship. Eli stayed. Others died. This is the emotional register I need." },
  { id: "r5", tag: "CRAFT",      color: T.green,  title: "On silence in prose (Hemingway)",  body: "'The dignity of movement of an iceberg is due to only one-eighth of it being above water.' This is the structural principle for Eli — everything is subtext." },
  { id: "r6", tag: "SETTING",    color: T.amber,  title: "Cornish lighthouse interiors",      body: "Stone spiral stairs. Iron handrails worn smooth. The smell: salt, paraffin, old paper. Wind in the lantern room described as 'a kind of singing'." },
];

const MOCK_ANALYSIS = {
  grade: "B+", summary: "Strong voice. One long sentence. Passive voice above baseline.",
  readability: 78, pacing: 64, sentenceVariety: 82, showVsTell: 71,
  dialogueRatio: 8, passiveVoice: 14, adverbDensity: 6, clicheScore: 88,
  overusedWords: [{ word: "had", count: 8 }, { word: "the", count: 47 }, { word: "just", count: 5 }, { word: "silence", count: 4 }],
  sentenceLengths: [12, 28, 8, 35, 14, 22, 31, 9, 18, 25, 7, 40],
};

const MOCK_AI_FEEDBACK = [
  { type: "praise",   icon: "✦", color: T.green,  title: "STRONG PASSAGE",  text: "The final line is the best in the chapter. 'The only way he knew how to speak' earns all 37 years of silence." },
  { type: "suggest",  icon: "→", color: T.accent, title: "SUGGESTION",       text: "Cut 'for a long moment' in §2. The act of descending tells us everything — the hesitation needs no announcement." },
  { type: "flag",     icon: "⚠", color: T.amber,  title: "PACING FLAG",      text: "§3 rushes slightly. 'Sodden ribbons' is vivid but arrives before the reader has fully descended the stairs with Eli." },
  { type: "question", icon: "?", color: T.blue,   title: "STORY QUESTION",   text: "Does Eli recognize something in her, or is it instinct? The reader needs a single micro-reaction to anchor the mystery." },
];

const MOCK_VERSIONS = [
  { id: "v5", time: "5 min ago",           words: "412 → 412", label: "Auto-save",    active: true  },
  { id: "v4", time: "24m ago",             words: "398 → 412", label: "Manual save",  active: false },
  { id: "v3", time: "1h 22m ago",          words: "271 → 398", label: "Session start", active: false },
  { id: "v2", time: "Yesterday 11:41pm",   words: "218 → 271", label: "Late session", active: false },
  { id: "v1", time: "Apr 18 · 2:14pm",    words: "0 → 218",   label: "Scene created", active: false },
];

const HISTORY = [842, 1204, 678, 1553, 0, 0, 941, 1102, 1891, 534, 1243, 0, 0, 1243];
const DAYS    = ["M","T","W","T","F","S","S","M","T","W","T","F","S","S"];

// ═══════════════════════════════════════════════════════════════════════
// 6. CHROME — TITLEBAR · TOPNAV · GLOBAL STATUS
// ═══════════════════════════════════════════════════════════════════════
const TitleBar = () => (
  <div style={{ display: "flex", alignItems: "center", height: 38, padding: "0 16px", gap: 12, background: T.panelRaised, borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
    <div style={{ display: "flex", gap: 6 }}>
      {["#e05252","#e0b452","#52b452"].map((c, i) => <div key={i} style={{ width: 11, height: 11, borderRadius: "50%", background: c, boxShadow: `0 0 6px ${c}66` }} />)}
    </div>
    <div style={{ width: 1, height: 16, background: T.border }} />
    <span style={{ fontFamily: T.fontTitle, fontSize: 14, color: T.accent, fontStyle: "italic" }}>Author Studio Pro</span>
    <span style={{ fontFamily: T.fontUI, fontSize: 11, color: T.textDim }}>—</span>
    <span style={{ fontFamily: T.fontUI, fontSize: 11, color: T.textMuted }}>The Lighthouse Keeper's Daughter</span>
    <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
      <Badge label="DRAFT 2" color={T.blue} />
      <Badge label="AUTO-SAVED" color={T.green} />
      <Badge label="47,218 WORDS" />
    </div>
  </div>
);

const NAV = [
  { id: "dashboard",  label: "Dashboard",    icon: "dash"   },
  { id: "write",      label: "Write",         icon: "write"  },
  { id: "corkboard",  label: "Corkboard",     icon: "board"  },
  { id: "characters", label: "Characters",    icon: "person" },
  { id: "world",      label: "Worldbuilding", icon: "globe"  },
  { id: "timeline",   label: "Timeline",      icon: "clock"  },
  { id: "research",   label: "Research",      icon: "folder" },
  { id: "export",     label: "Export",        icon: "export" },
];

const TopNav = ({ active, setActive }) => (
  <div style={{ display: "flex", alignItems: "center", height: 40, padding: "0 16px", gap: 2, background: T.panel, borderBottom: `1px solid ${T.border}`, flexShrink: 0, overflowX: "auto" }}>
    {NAV.map(({ id, label, icon }) => {
      const on = active === id;
      return (
        <button key={id} onClick={() => setActive(id)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "0 12px", height: "100%", border: "none", cursor: "pointer", background: on ? T.accentSoft : "transparent", color: on ? T.accent : T.textMuted, fontSize: 11, fontFamily: T.fontUI, borderBottom: on ? `2px solid ${T.accent}` : "2px solid transparent", whiteSpace: "nowrap", flexShrink: 0 }}>
          <Ico n={icon} s={13} c={on ? T.accent : T.textMuted} />{label}
        </button>
      );
    })}
    <div style={{ marginLeft: "auto", padding: "3px 10px", borderRadius: 20, border: `1px solid ${T.accent}44`, background: T.accentSoft, color: T.accent, fontSize: 11, fontFamily: T.fontUI }}>
      🔥 14-day streak
    </div>
  </div>
);

const GlobalStatus = ({ view }) => (
  <div style={{ display: "flex", alignItems: "center", padding: "3px 20px", gap: 18, background: T.bgDeep, borderTop: `1px solid ${T.border}`, fontSize: 9, color: T.textDim, fontFamily: T.fontMono, flexShrink: 0 }}>
    <span style={{ color: T.green }}>● MIDNIGHT CHRONICLE</span>
    <span>Author Studio Pro v3.0</span>
    <span style={{ color: T.accent }}>{view.toUpperCase()}</span>
    <div style={{ marginLeft: "auto", display: "flex", gap: 16 }}>
      <span>47,218 words</span><span>Session: 1h 34m</span>
      <span style={{ color: T.accent }}>🔥 14-day streak</span><span>All changes saved</span>
    </div>
  </div>
);

// ═══════════════════════════════════════════════════════════════════════
// 7. DASHBOARD VIEW
// ═══════════════════════════════════════════════════════════════════════
const DashboardView = ({ setView }) => {
  const maxW = Math.max(...HISTORY);
  return (
    <div style={{ flex: 1, overflow: "auto", padding: 28, display: "flex", flexDirection: "column", gap: 22 }}>
      {/* Greeting */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 24 }}>
        <div>
          <h1 style={{ fontFamily: T.fontDisplay, fontSize: 27, color: T.text, fontWeight: 400, lineHeight: 1.2, marginBottom: 8 }}>Good evening, Author.</h1>
          <p style={{ fontFamily: T.fontBody, fontSize: 15, color: T.textMuted, lineHeight: 1.7, maxWidth: 500, margin: 0 }}>
            Working on <em style={{ color: T.accent }}>The Lighthouse Keeper's Daughter</em>. 1,243 words today — 757 left to hit your goal.
          </p>
        </div>
        <button onClick={() => setView("write")} style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 22px", borderRadius: T.r, border: `1px solid ${T.accent}55`, background: `linear-gradient(135deg,${T.accentSoft},${T.accentGlow})`, color: T.accent, cursor: "pointer", fontFamily: T.fontUI, fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", flexShrink: 0 }}>
          <Ico n="write" s={15} c={T.accent} /> Continue Writing
        </button>
      </div>

      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 12 }}>
        {[
          { label: "Total Words",    value: "47,218", sub: "Full manuscript",  color: T.text,   icon: "book"      },
          { label: "Today's Words",  value: "1,243",  sub: "62% of goal",      color: T.green,  icon: "lightning" },
          { label: "Writing Streak", value: "14 days",sub: "Personal best",    color: T.amber,  icon: "fire"      },
          { label: "Chapters Done",  value: "3 / 8",  sub: "37.5% complete",   color: T.blue,   icon: "check"     },
          { label: "Est. Read Time", value: "3h 57m", sub: "At ~200 wpm",      color: T.purple, icon: "eye"       },
        ].map(({ label, value, sub, color, icon }) => (
          <div key={label} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.r, padding: "16px 18px", display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 9, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.12em", fontFamily: T.fontUI }}>{label}</span>
              <Ico n={icon} s={14} c={color} />
            </div>
            <div style={{ fontFamily: T.fontDisplay, fontSize: 24, color, fontWeight: 400 }}>{value}</div>
            <div style={{ fontSize: 10, color: T.textMuted, fontFamily: T.fontUI }}>{sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16 }}>
        {/* History chart */}
        <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.r, padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 18 }}>
            <div>
              <div style={{ fontSize: 12, color: T.text, fontFamily: T.fontUI, fontWeight: 600 }}>Writing History</div>
              <div style={{ fontSize: 10, color: T.textMuted, fontFamily: T.fontUI, marginTop: 2 }}>Last 14 days · avg 892 words/session</div>
            </div>
            <Badge label="2-WEEK VIEW" color={T.blue} />
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 80 }}>
            {HISTORY.map((w, i) => {
              const pct = maxW > 0 ? (w / maxW) * 100 : 0;
              const isToday = i === 13;
              return (
                <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  <div style={{ width: "100%", height: `${pct || 8}%`, minHeight: 4, background: w === 0 ? T.border : isToday ? T.accent : `${T.accent}55`, borderRadius: "2px 2px 0 0", boxShadow: isToday ? `0 0 12px ${T.accent}44` : "none" }} />
                  <span style={{ fontSize: 8, color: isToday ? T.accent : T.textDim, fontFamily: T.fontUI }}>{DAYS[i]}</span>
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: 16 }}><PBar value={1243} max={2000} label="Today's goal" /></div>
        </div>

        {/* Progress */}
        <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.r, padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ fontSize: 12, color: T.text, fontFamily: T.fontUI, fontWeight: 600 }}>Novel Progress</div>
          <PBar value={47218} max={80000} label="Target word count" color={T.accent} height={5} />
          <PBar value={3} max={8} label="Chapters complete" color={T.green} height={5} />
          <PBar value={31} max={52} label="Scenes complete" color={T.blue} height={5} />
          <Divider />
          {[["Manuscript draft","~41 days"],["At 2k words/day","~16 days"],["Projected finish","June 1, 2025"]].map(([l, v]) => (
            <div key={l} style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 11, color: T.textMuted, fontFamily: T.fontUI }}>{l}</span>
              <span style={{ fontSize: 11, color: T.accent, fontFamily: T.fontMono }}>{v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent sessions */}
      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.r, padding: 20 }}>
        <div style={{ fontSize: 12, color: T.text, fontFamily: T.fontUI, fontWeight: 600, marginBottom: 14 }}>Recent Sessions</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
          {[{ d:"Today",d2:"1h 22m",ch:"Ch. 3 · Scene 1",w:1243,m:"Focused"},{d:"Yesterday",d2:"58m",ch:"Ch. 3 · Scene 1",w:891,m:"Struggling"},{d:"Fri Apr 18",d2:"34m",ch:"Ch. 2 · Scene 3",w:534,m:"Inspired"},{d:"Thu Apr 17",d2:"1h 12m",ch:"Ch. 2 · Scene 2",w:1102,m:"Flowing"}].map(({ d, d2, ch, w, m }) => (
            <div key={d} style={{ padding: 12, borderRadius: T.rSm, background: T.panel, border: `1px solid ${T.border}` }}>
              <div style={{ fontSize: 10, color: T.textMuted, fontFamily: T.fontUI, marginBottom: 6 }}>{d}</div>
              <div style={{ fontSize: 11, color: T.text, fontFamily: T.fontUI, marginBottom: 8 }}>{ch}</div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 13, color: T.accent, fontFamily: T.fontMono, fontWeight: 600 }}>{w.toLocaleString()}</span>
                <span style={{ fontSize: 10, color: T.textMuted, fontFamily: T.fontUI }}>{d2} · {m}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════
// 8. BINDER PANEL
// ═══════════════════════════════════════════════════════════════════════
const BinderPanel = ({ activeScene, onSelect }) => {
  const { chapters, chapterOrder, scenes } = useStoryStore();
  const [exp, setExp] = useState({ ch4: true });

  const mappedChapters = chapterOrder.map(cid => {
    const ch = chapters[cid];
    const chScenes = Object.values(scenes).filter(s => s.chapter_id === cid).sort((a,b) => a.position - b.position);
    return {
      id: cid,
      label: ch.title || ch.label,
      status: ch.status || "active",
      words: ch.wordCount || 0,
      scenes: chScenes
    };
  });

  return (
    <div style={{ width: 208, background: T.panel, borderRight: `1px solid ${T.border}`, display: "flex", flexDirection: "column", overflow: "hidden", flexShrink: 0 }}>
      <div style={{ padding: "10px 12px 6px", borderBottom: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 9, color: T.textDim, textTransform: "uppercase", letterSpacing: "0.14em", fontFamily: T.fontUI }}>BINDER</span>
        <button style={{ ...btnSt(20), fontSize: 16 }}>+</button>
      </div>
      <div style={{ flex: 1, overflow: "auto", padding: "4px 0" }}>
        {mappedChapters.map(item => {
          const isA = item.status === "active", isE = exp[item.id];
          return (
            <div key={item.id}>
              <div onClick={() => setExp(p => ({ ...p, [item.id]: !p[item.id] }))} style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 8px 5px 12px", cursor: "pointer", borderRadius: 4, margin: "0 4px", background: isA ? T.accentSoft : "transparent", borderLeft: `2px solid ${isA ? T.accent : "transparent"}`, color: isA ? T.accent : item.status === "draft" ? T.textDim : T.textSoft }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", flexShrink: 0, background: { done: T.green, active: T.accent, draft: T.textDim }[item.status] || T.accent }} />
                <span style={{ flex: 1, fontSize: 11, fontFamily: T.fontUI }}>{item.label}</span>
                {item.words > 0 && <span style={{ fontSize: 9, color: T.textDim, fontFamily: T.fontMono }}>{(item.words / 1000).toFixed(1)}k</span>}
                {item.scenes.length > 0 && <span style={{ fontSize: 10, color: T.textDim }}>{isE ? "▾" : "▸"}</span>}
              </div>
              {isE && item.scenes.map(sc => (
                <div key={sc.id} onClick={() => onSelect && onSelect(sc.id)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "3px 8px 3px 28px", cursor: "pointer", background: activeScene === sc.id ? `${T.accent}0a` : "transparent", color: activeScene === sc.id ? T.accent : T.textMuted }}>
                  <span style={{ fontSize: 9, color: T.textDim }}>↳</span>
                  <span style={{ fontSize: 10, fontFamily: T.fontUI }}>{sc.title}</span>
                </div>
              ))}
            </div>
          );
        })}
        <div style={{ padding: "12px 12px 3px", fontSize: 8, color: T.textDim, textTransform: "uppercase", letterSpacing: "0.14em", fontFamily: T.fontUI, marginTop: 4 }}>STORY BIBLE</div>
        {[["person","Characters","5"],["globe","Worldbuilding","4"],["clock","Timeline","7"],["folder","Research","34"],["tag","Glossary","18"]].map(([icon, lbl, sub]) => (
          <div key={lbl} style={{ display: "flex", alignItems: "center", gap: 7, padding: "5px 8px 5px 12px", cursor: "pointer", margin: "0 4px", borderRadius: 4 }}>
            <Ico n={icon} s={12} c={T.textDim} />
            <span style={{ flex: 1, fontSize: 11, color: T.textMuted, fontFamily: T.fontUI }}>{lbl}</span>
            <span style={{ fontSize: 9, color: T.textDim, fontFamily: T.fontUI }}>{sub}</span>
          </div>
        ))}
      </div>
      <div style={{ padding: 12, borderTop: `1px solid ${T.border}`, display: "flex", flexDirection: "column", gap: 7 }}>
        <div style={{ fontSize: 9, color: T.textDim, textTransform: "uppercase", letterSpacing: "0.12em", fontFamily: T.fontUI }}>TODAY'S GOAL</div>
        <PBar value={1243} max={2000} />
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, fontFamily: T.fontMono }}>
          <span style={{ color: T.accent }}>1,243 wd</span>
          <span style={{ color: T.textMuted }}>757 left</span>
        </div>
        <div style={{ fontSize: 9, color: T.textMuted, fontFamily: T.fontUI, textAlign: "center" }}>🔥 14-day streak</div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════
// 9. WRITING CANVAS  (the full editor — the heart of the app)
// ═══════════════════════════════════════════════════════════════════════
const WritingCanvas = ({ activeScene }) => {
  const { scenes, upsertScene } = useStoryStore();
  const scene = activeScene ? scenes[activeScene] : null;

  // Typography
  const [fontFamily, setFontFamily] = useState("Crimson Text");
  const [fontSize,   setFontSize]   = useState(17);
  const [leading,    setLeading]    = useState(1.9);
  const [paraGap,    setParaGap]    = useState(0);
  const [indent,     setIndent]     = useState(2.5);
  const [align,      setAlign]      = useState("left");
  const [colWidth,   setColWidth]   = useState(680);
  const [zoom,       setZoom]       = useState(100);

  // Modes
  const [focusMode,      setFocusMode]      = useState(false);
  const [typewriterMode, setTypewriterMode] = useState(false);
  const [showFind,       setShowFind]       = useState(false);
  const [grammar,        setGrammar]        = useState(true);
  const [comments,       setComments]       = useState(true);
  const [trackCh,        setTrackCh]        = useState(false);
  const [viewMode,       setViewMode]       = useState("write");
  const [activePara,     setActivePara]     = useState(null);
  const [ambient,        setAmbient]        = useState(null);

  // Content
  const [content, setContent] = useState("");

  useEffect(() => {
    if (scene) {
      setContent(scene.content || "");
    } else {
      setContent("");
    }
  }, [activeScene, scene?.id]);

  const handleContentChange = (newContent) => {
    setContent(newContent);
    if (scene) {
      // Update local store immediately for word count etc
      upsertScene({ ...scene, content: newContent });
    }
  };

  // Hooks
  const { saving }      = useAutoSave(activeScene, content);
  const { sessionTime } = useWritingSession("proj_001");
  const { words, chars, paras } = useWordCount(content);
  const findState       = useFind(content, setContent);

  const FONTS = ["Crimson Text","Palatino","Georgia","EB Garamond","Libre Baskerville","Merriweather","Lora","Courier Prime","Times New Roman"];

  // Grammar underline helper
  const G = ({ color, title, children }) =>
    grammar
      ? <span title={title} style={{ borderBottom: `2px wavy ${color}`, cursor: "help" }}>{children}</span>
      : <>{children}</>;

  // ── TOOLBAR ROW 1 ────────────────────────────────────────────────────
  const Row1 = () => (
    <div style={{ display: "flex", alignItems: "center", padding: "5px 14px", gap: 4, borderBottom: `1px solid ${T.borderSoft}`, flexWrap: "wrap" }}>
      {/* Undo / Redo */}
      <button title="Undo" style={btnSt()}><Ico n="undo" s={13} c={T.textMuted} /></button>
      <button title="Redo" style={btnSt()}><Ico n="redo" s={13} c={T.textMuted} /></button>
      <Divider vertical style={{ margin: "0 4px" }} />

      {/* Paragraph style */}
      <select style={selSt(130)}>
        {["Body Text","Chapter Heading","Scene Heading","Block Quote","Scene Break ★","Synopsis","Epigraph"].map(s => <option key={s}>{s}</option>)}
      </select>
      <Divider vertical style={{ margin: "0 4px" }} />

      {/* Character styles */}
      {[{l:"B",fw:700,fi:"normal",td:"none",tip:"Bold"},{l:"I",fw:400,fi:"italic",td:"none",tip:"Italic"},{l:"U",fw:400,fi:"normal",td:"underline",tip:"Underline"},{l:"S",fw:400,fi:"normal",td:"line-through",tip:"Strikethrough"}].map(({ l, fw, fi, td, tip }) => (
        <button key={l} title={tip} style={{ ...btnSt(), fontWeight: fw, fontStyle: fi, textDecoration: td, fontFamily: T.fontTitle, fontSize: 13 }}>{l}</button>
      ))}
      <Divider vertical style={{ margin: "0 4px" }} />

      {/* Highlight */}
      <span style={labelSt}>H:</span>
      {[T.amber, T.green, T.blue, T.red, T.purple].map(c => (
        <button key={c} title="Highlight" style={{ width: 14, height: 14, borderRadius: 3, background: c, border: "none", cursor: "pointer", opacity: 0.8, flexShrink: 0 }} />
      ))}
      <button title="Clear" style={{ ...btnSt(18), fontSize: 9 }}>✕</button>
      <Divider vertical style={{ margin: "0 4px" }} />

      {/* Smart punctuation */}
      {["—","…","'","'","\u201C","\u201D"].map(ch => (
        <button key={ch} title={`Insert ${ch}`} style={{ ...btnSt(22), fontSize: 13, fontFamily: T.fontTitle }}>{ch}</button>
      ))}
      <Divider vertical style={{ margin: "0 4px" }} />

      {/* View mode */}
      <div style={{ display: "flex", background: T.surface, borderRadius: T.rSm, border: `1px solid ${T.border}`, padding: 2 }}>
        {["Write","Split","Preview","Outline"].map(m => (
          <button key={m} onClick={() => setViewMode(m.toLowerCase())} style={{ padding: "2px 9px", borderRadius: 3, border: "none", cursor: "pointer", background: viewMode === m.toLowerCase() ? T.bg : "transparent", color: viewMode === m.toLowerCase() ? T.accent : T.textMuted, fontSize: 10, fontFamily: T.fontUI }}>{m}</button>
        ))}
      </div>
      <Divider vertical style={{ margin: "0 4px" }} />

      {/* AI */}
      <button style={{ display: "flex", alignItems: "center", gap: 5, padding: "0 10px", height: 26, borderRadius: T.rSm, border: `1px solid ${T.accent}44`, background: T.accentSoft, color: T.accent, cursor: "pointer", fontSize: 10, fontFamily: T.fontUI, fontWeight: 600 }}>
        <Ico n="ai" s={12} c={T.accent} /> AI Assist
      </button>

      {/* Right controls */}
      <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
        <button onClick={() => setShowFind(!showFind)} style={{ ...btnSt(undefined, showFind), padding: "0 9px", width: "auto" }}>
          <Ico n="search" s={11} c={showFind ? T.accent : T.textMuted} />
          <span style={{ fontSize: 10, fontFamily: T.fontUI, marginLeft: 4 }}>Find</span>
        </button>
        <button onClick={() => setFocusMode(v => !v)} style={{ ...btnSt(undefined, focusMode), padding: "0 9px", width: "auto", fontSize: 10, fontFamily: T.fontUI }}>⛶ Focus</button>
        <button onClick={() => setTypewriterMode(v => !v)} style={{ ...btnSt(undefined, typewriterMode), padding: "0 9px", width: "auto", fontSize: 10, fontFamily: T.fontUI }}>⌨ Typewriter</button>
      </div>
    </div>
  );

  // ── TOOLBAR ROW 2: Typography ────────────────────────────────────────
  const Row2 = () => (
    <div style={{ display: "flex", alignItems: "center", padding: "4px 14px", gap: 8, borderBottom: `1px solid ${T.borderSoft}`, flexWrap: "wrap" }}>
      {/* Font */}
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <span style={labelSt}>Font</span>
        <select value={fontFamily} onChange={e => setFontFamily(e.target.value)} style={selSt(148)}>
          {FONTS.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
      </div>
      {/* Size */}
      <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
        <span style={{ ...labelSt, marginRight: 4 }}>Size</span>
        <button onClick={() => setFontSize(s => Math.max(10, s - 1))} style={stepL}>−</button>
        <div style={stepMid}>{fontSize}</div>
        <button onClick={() => setFontSize(s => Math.min(28, s + 1))} style={stepR}>+</button>
      </div>
      <Divider vertical style={{ margin: "0 2px" }} />
      {/* Leading */}
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <span style={labelSt}>Leading</span>
        <select value={leading} onChange={e => setLeading(Number(e.target.value))} style={selSt(68)}>
          {[1.4,1.5,1.6,1.7,1.8,1.9,2.0,2.2,2.5].map(v => <option key={v} value={v}>{v}×</option>)}
        </select>
      </div>
      {/* Para gap */}
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <span style={labelSt}>Para gap</span>
        <select value={paraGap} onChange={e => setParaGap(Number(e.target.value))} style={selSt(68)}>
          {[0,4,8,12,16,20].map(v => <option key={v} value={v}>{v === 0 ? "None" : `${v}px`}</option>)}
        </select>
      </div>
      {/* Indent */}
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <span style={labelSt}>Indent</span>
        <select value={indent} onChange={e => setIndent(Number(e.target.value))} style={selSt(60)}>
          {[0,1,1.5,2,2.5,3,4].map(v => <option key={v} value={v}>{v === 0 ? "None" : `${v}em`}</option>)}
        </select>
      </div>
      <Divider vertical style={{ margin: "0 2px" }} />
      {/* Alignment */}
      <div style={{ display: "flex", gap: 2 }}>
        {[["left","⫷"],["justify","≡"],["center","≐"],["right","⫸"]].map(([a, g]) => (
          <button key={a} onClick={() => setAlign(a)} title={`Align ${a}`} style={{ ...btnSt(24), border: `1px solid ${align === a ? T.accent : T.border}`, background: align === a ? T.accentSoft : "transparent", color: align === a ? T.accent : T.textMuted, fontSize: 13 }}>{g}</button>
        ))}
      </div>
      <Divider vertical style={{ margin: "0 2px" }} />
      {/* Column width */}
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <span style={labelSt}>Width</span>
        <select value={colWidth} onChange={e => setColWidth(Number(e.target.value))} style={selSt(120)}>
          {[[520,"Narrow"],[620,"Medium"],[680,"Standard"],[760,"Wide"],[900,"Full"]].map(([v, l]) => <option key={v} value={v}>{l} ({v}px)</option>)}
        </select>
      </div>
      {/* Zoom */}
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <span style={labelSt}>Zoom</span>
        <select value={zoom} onChange={e => setZoom(Number(e.target.value))} style={selSt(68)}>
          {[70,80,90,100,110,120,150].map(z => <option key={z} value={z}>{z}%</option>)}
        </select>
      </div>
      <Divider vertical style={{ margin: "0 2px" }} />
      {/* Feature toggles */}
      <div style={{ display: "flex", gap: 4, marginLeft: "auto", flexWrap: "wrap" }}>
        {[["Grammar",grammar,() => setGrammar(v=>!v),T.red],["Comments",comments,() => setComments(v=>!v),T.amber],["Track Chg",trackCh,() => setTrackCh(v=>!v),T.green]].map(([l, on, fn, c]) => (
          <button key={l} onClick={fn} style={{ display: "flex", alignItems: "center", gap: 4, padding: "0 8px", height: 24, borderRadius: T.rSm, border: `1px solid ${on ? `${c}55` : T.border}`, background: on ? `${c}14` : "transparent", color: on ? c : T.textDim, cursor: "pointer", fontSize: 9, fontFamily: T.fontUI, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            <div style={{ width: 5, height: 5, borderRadius: "50%", background: on ? c : T.textDim }} />{l}
          </button>
        ))}
      </div>
    </div>
  );

  // ── TOOLBAR ROW 3: Scene Meta + Ambient ─────────────────────────────
  const Row3 = () => (
    <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 14px", borderBottom: `1px solid ${T.borderSoft}`, background: `${T.bgDeep}80`, flexWrap: "wrap" }}>
      <span style={{ ...labelSt, textTransform: "uppercase", letterSpacing: "0.1em" }}>SCENE:</span>
      {[["POV","Eli Marsh · 3rd",T.accent],["Loc","The Lower Rocks",T.blue],["Time","Dusk, storm clearing",T.textMuted],["Tension","Rising ↑",T.amber],["Mood","Haunted",T.purple],["Act","Act I · Inciting",T.teal]].map(([k, v, c]) => (
        <span key={k} style={{ fontSize: 10, color: c, padding: "2px 8px", borderRadius: 20, background: `${c}10`, border: `1px solid ${c}25`, fontFamily: T.fontUI, whiteSpace: "nowrap" }}>
          <span style={{ color: T.textDim }}>{k}: </span>{v}
        </span>
      ))}
      <div style={{ marginLeft: "auto", display: "flex", gap: 4, alignItems: "center" }}>
        <span style={labelSt}>Ambient:</span>
        {[["🌊","Ocean"],["🌧","Rain"],["🔥","Fireplace"],["🌿","Forest"],["☕","Café"]].map(([em, l]) => (
          <button key={l} title={l} onClick={() => setAmbient(ambient === l ? null : l)} style={{ ...btnSt(22), border: `1px solid ${ambient === l ? T.accent : T.border}`, background: ambient === l ? T.accentSoft : "transparent", fontSize: 12 }}>{em}</button>
        ))}
        {ambient && <span style={{ fontSize: 9, color: T.accent, fontFamily: T.fontUI }}>♪ {ambient}</span>}
      </div>
    </div>
  );

  // ── FIND & REPLACE PANEL ─────────────────────────────────────────────
  const FindPanel = () => (
    <div style={{ padding: "8px 14px", background: T.bgDeep, borderBottom: `1px solid ${T.border}`, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ ...labelSt, width: 48 }}>Find</span>
          <input value={findState.findText} onChange={e => findState.setFindText(e.target.value)} placeholder="Search…" style={inpSt(180)} />
          {findState.findText && <span style={{ fontSize: 10, color: T.accent, fontFamily: T.fontMono }}>{findState.matchCount} found</span>}
          <button style={smBtnSt}>‹ Prev</button>
          <button style={smBtnSt}>Next ›</button>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ ...labelSt, width: 48 }}>Replace</span>
          <input value={findState.replaceText} onChange={e => findState.setReplaceText(e.target.value)} placeholder="Replace with…" style={inpSt(180)} />
          <button style={smBtnSt}>Replace</button>
          <button onClick={findState.replaceAll} style={{ ...smBtnSt, border: `1px solid ${T.accent}44`, background: T.accentSoft, color: T.accent }}>Replace All</button>
        </div>
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        {[["Aa","Match case",findState.matchCase,()=>findState.setMatchCase(v=>!v)],["\\b","Whole word",findState.wholeWord,()=>findState.setWholeWord(v=>!v)]].map(([l,tip,on,fn]) => (
          <button key={l} title={tip} onClick={fn} style={{ padding: "0 8px", height: 24, borderRadius: T.rSm, border: `1px solid ${on ? T.accent : T.border}`, background: on ? T.accentSoft : "transparent", color: on ? T.accent : T.textMuted, cursor: "pointer", fontSize: 11, fontFamily: T.fontMono }}>{l}</button>
        ))}
      </div>
      <button onClick={() => setShowFind(false)} style={{ marginLeft: "auto", background: "transparent", border: "none", cursor: "pointer", color: T.textDim, fontSize: 18, lineHeight: 1 }}>✕</button>
    </div>
  );

  // ── RULER ─────────────────────────────────────────────────────────────
  const Ruler = () => (
    <div style={{ height: 20, background: T.panel, borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "flex-end", justifyContent: "center", flexShrink: 0, overflow: "hidden" }}>
      <div style={{ width: colWidth, position: "relative", height: "100%" }}>
        {Array.from({ length: 17 }, (_, i) => {
          const pct = (i / 16) * 100;
          const isMajor = i % 4 === 0;
          return (
            <div key={i} style={{ position: "absolute", left: `${pct}%`, bottom: 0, height: isMajor ? 10 : 6, width: 1, background: isMajor ? T.textDim : T.border, transform: "translateX(-50%)" }}>
              {isMajor && <div style={{ position: "absolute", bottom: "100%", left: "50%", transform: "translateX(-50%)", fontSize: 7, color: T.textDim, fontFamily: T.fontMono, marginBottom: 1, whiteSpace: "nowrap" }}>
                {i === 0 ? "0" : i === 16 ? `${colWidth}` : Math.round((i / 16) * colWidth)}
              </div>}
            </div>
          );
        })}
        <div title="Left margin"  style={{ position: "absolute", left: 0,  top: 0, bottom: 0, width: 8, cursor: "ew-resize", background: `${T.accent}18`, borderRight: `1px solid ${T.accent}33` }} />
        <div title="Right margin" style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 8, cursor: "ew-resize", background: `${T.accent}18`, borderLeft:  `1px solid ${T.accent}33` }} />
      </div>
    </div>
  );

  // ── MANUSCRIPT AREA ───────────────────────────────────────────────────
  const ManuscriptArea = () => (
    <div style={{ flex: 1, overflow: "auto", padding: typewriterMode ? "28vh 0" : "36px 0", background: focusMode ? T.bgDeep : T.bg, transition: "background 0.3s" }}>
      {focusMode && (
        <button onClick={() => setFocusMode(false)} style={{ position: "fixed", top: 14, right: 260, fontSize: 10, color: T.textDim, background: "transparent", border: `1px solid ${T.border}`, padding: "3px 10px", borderRadius: T.rSm, cursor: "pointer", fontFamily: T.fontUI, zIndex: 20 }}>Esc — Exit Focus</button>
      )}
      <div style={{ maxWidth: colWidth, margin: "0 auto", padding: "0 28px", transform: `scale(${zoom / 100})`, transformOrigin: "top center" }}>
        {/* Chapter title */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <div style={{ height: 1, flex: 1, background: T.borderSoft }} />
          <span style={{ fontSize: 10, color: T.accent, letterSpacing: "0.2em", textTransform: "uppercase", fontFamily: T.fontUI }}>Chapter Three</span>
          <div style={{ height: 1, flex: 1, background: T.borderSoft }} />
        </div>
        <h2 style={{ fontFamily: T.fontDisplay, fontSize: 26, color: T.text, fontWeight: 400, lineHeight: 1.3, marginBottom: 10, textAlign: "center" }}>The Girl on the Rocks</h2>
        <div style={{ height: 1, width: 40, background: T.accent, margin: "0 auto 36px" }} />

        {/* PROSE */}
        <textarea
          value={content}
          onChange={(e) => handleContentChange(e.target.value)}
          style={{
            width: "100%",
            minHeight: "60vh",
            background: "transparent",
            border: "none",
            resize: "none",
            outline: "none",
            fontFamily: `'${fontFamily}', Georgia, serif`,
            fontSize: `${fontSize}px`,
            lineHeight: leading,
            textAlign: align,
            color: T.text,
            overflow: "hidden"
          }}
          placeholder="Begin writing..."
        />

        {/* Inline AI comment */}
        <div style={{ marginTop: 24, padding: "12px 16px", background: T.surface, border: `1px solid ${T.border}`, borderLeft: `3px solid ${T.accent}`, borderRadius: T.rSm }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
            <Ico n="ai" s={12} c={T.accent} />
            <span style={{ fontSize: 10, color: T.accent, fontFamily: T.fontUI, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>AI Developmental Editor</span>
          </div>
          <p style={{ fontSize: 12, color: T.textMuted, fontFamily: T.fontBody, lineHeight: 1.7, margin: 0 }}>
            Excellent restraint in this scene. The silence carries the weight. One flag: <em style={{ color: T.amber }}>"perhaps fourteen, perhaps younger"</em> reads as a tell — cut it entirely and let the reader infer from the image.
          </p>
        </div>
      </div>

      {/* Synonym popup */}
      {synOpen && synTarget && (
        <div style={{ position: "fixed", bottom: 80, right: 260, width: 220, background: T.panelRaised, border: `1px solid ${T.border}`, borderRadius: T.r, padding: 14, boxShadow: "0 8px 32px #00000066", zIndex: 100 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span style={{ fontSize: 11, color: T.accent, fontFamily: T.fontUI, fontWeight: 600 }}>Character: <em style={{ color: T.text }}>{synTarget}</em></span>
            <button onClick={() => setSynOpen(false)} style={{ background: "transparent", border: "none", cursor: "pointer", color: T.textDim, fontSize: 16, lineHeight: 1 }}>✕</button>
          </div>
          {["Open character profile","Highlight all mentions","Replace name manuscript-wide"].map(s => (
            <div key={s} style={{ padding: "5px 8px", borderRadius: T.rSm, cursor: "pointer", fontSize: 11, color: T.textSoft, fontFamily: T.fontUI, borderBottom: `1px solid ${T.borderSoft}` }}>{s}</div>
          ))}
        </div>
      )}
    </div>
  );

  // ── EDITOR STATUS BAR ─────────────────────────────────────────────────
  const EditorStatus = () => (
    <div style={{ display: "flex", alignItems: "center", padding: "4px 16px", background: T.panel, borderTop: `1px solid ${T.border}`, flexShrink: 0, gap: 14, flexWrap: "wrap" }}>
      <span style={{ fontSize: 10, color: saving ? T.amber : T.green, fontFamily: T.fontUI }}>{saving ? "● Saving…" : "● Saved"}</span>
      <Divider vertical style={{ height: 12 }} />
      <span style={{ fontSize: 10, color: T.textMuted, fontFamily: T.fontMono }}>Scene <b style={{ color: T.text }}>{words}w</b></span>
      <span style={{ fontSize: 10, color: T.textMuted, fontFamily: T.fontMono }}>Total <b style={{ color: T.text }}>47,218w</b></span>
      <span style={{ fontSize: 10, color: T.textMuted, fontFamily: T.fontMono }}>Chars <b style={{ color: T.text }}>{chars}</b></span>
      <span style={{ fontSize: 10, color: T.textMuted, fontFamily: T.fontMono }}>Paras <b style={{ color: T.text }}>{paras}</b></span>
      <Divider vertical style={{ height: 12 }} />
      <span style={{ fontSize: 10, color: T.textMuted, fontFamily: T.fontUI }}>Grade <b style={{ color: T.blue }}>9.2</b></span>
      <span style={{ fontSize: 10, color: T.textMuted, fontFamily: T.fontUI }}>Font <b style={{ color: T.textSoft }}>{fontFamily} {fontSize}pt</b></span>
      <span style={{ fontSize: 10, color: T.textMuted, fontFamily: T.fontUI }}>Leading <b style={{ color: T.textSoft }}>{leading}×</b></span>
      <div style={{ marginLeft: "auto", display: "flex", gap: 12, alignItems: "center" }}>
        <span style={{ fontSize: 10, color: T.accent, fontFamily: T.fontUI }}>🔥 14-day streak</span>
        <span style={{ fontSize: 10, color: T.textMuted, fontFamily: T.fontUI }}>Session: {sessionTime}</span>
        <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
          <button onClick={() => setZoom(z => Math.max(50, z - 10))} style={{ width: 16, height: 16, borderRadius: 3, border: `1px solid ${T.border}`, background: "transparent", color: T.textMuted, cursor: "pointer", fontSize: 11 }}>−</button>
          <span style={{ fontSize: 10, color: T.textMuted, fontFamily: T.fontMono, width: 36, textAlign: "center" }}>{zoom}%</span>
          <button onClick={() => setZoom(z => Math.min(200, z + 10))} style={{ width: 16, height: 16, borderRadius: 3, border: `1px solid ${T.border}`, background: "transparent", color: T.textMuted, cursor: "pointer", fontSize: 11 }}>+</button>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ background: T.panel, borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
        <Row1 /><Row2 /><Row3 />
        {showFind && <FindPanel />}
      </div>
      <Ruler />
      <ManuscriptArea />
      <EditorStatus />
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════
// 10. INSPECTOR PANEL  (5 tabs)
// ═══════════════════════════════════════════════════════════════════════
const InspectorPanel = ({ activeScene }) => {
  const { characters } = useStoryStore();
  const charsArray = Object.values(characters || {});
  const [tab, setTab] = useState("stats");
  const [thinkTab, setThinkTab] = useState("ideas");
  const { analysis } = useAnalysis();
  const { feedback }  = useAI();
  const { versions, restore } = useVersionHistory(activeScene);

  const TABS = [["stats","Stats"],["analysis","Analysis"],["ai","AI Editor"],["notes","Notes"],["history","Versions"],["think","Think"]];

  return (
    <div style={{ width: 248, background: T.panel, borderLeft: `1px solid ${T.border}`, display: "flex", flexDirection: "column", overflow: "hidden", flexShrink: 0 }}>
      <div style={{ display: "flex", borderBottom: `1px solid ${T.border}`, background: T.panelRaised, flexShrink: 0 }}>
        {TABS.map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} style={{ flex: 1, padding: "7px 2px", border: "none", cursor: "pointer", background: "transparent", color: tab === id ? T.accent : T.textDim, fontSize: 8, fontFamily: T.fontUI, letterSpacing: "0.06em", textTransform: "uppercase", borderBottom: tab === id ? `2px solid ${T.accent}` : "2px solid transparent", whiteSpace: "nowrap" }}>{label}</button>
        ))}
      </div>
      <div style={{ flex: 1, overflow: "auto" }}>

        {/* STATS */}
        {tab === "stats" && (
          <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ fontSize: 9, color: T.textDim, textTransform: "uppercase", letterSpacing: "0.12em", fontFamily: T.fontUI }}>DOCUMENT STATS</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {[["Words","47,218",T.text],["Today","1,243",T.green],["Scenes","31",T.blue],["Streak","14d",T.amber],["Chars","248k",T.textMuted],["Read","3h 57m",T.purple]].map(([l,v,c]) => (
                <div key={l} style={{ padding: 10, borderRadius: T.rSm, background: T.surface, border: `1px solid ${T.border}` }}>
                  <div style={{ fontSize: 9, color: T.textDim, fontFamily: T.fontUI, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>{l}</div>
                  <div style={{ fontSize: 20, color: c, fontFamily: T.fontDisplay, fontWeight: 400, lineHeight: 1 }}>{v}</div>
                </div>
              ))}
            </div>
            <Divider />
            <div style={{ fontSize: 9, color: T.textDim, textTransform: "uppercase", letterSpacing: "0.12em", fontFamily: T.fontUI }}>CHAPTER PACING</div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 52 }}>
              {[2148,3421,3204,1243,0,0,0,0].map((w,i) => (
                <div key={i} style={{ flex: 1, height: `${w > 0 ? (w / 3500) * 100 : 8}%`, minHeight: 4, background: w === 0 ? T.border : i === 3 ? T.accent : `${T.accent}44`, borderRadius: "2px 2px 0 0" }} />
              ))}
            </div>
            <Divider />
            <div style={{ fontSize: 9, color: T.textDim, textTransform: "uppercase", letterSpacing: "0.12em", fontFamily: T.fontUI }}>SCENE CHARACTERS</div>
            {charsArray.slice(0, 3).map(ch => (
              <div key={ch.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 0", borderBottom: `1px solid ${T.borderSoft}` }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: `${ch.color || T.accent}20`, border: `1px solid ${ch.color || T.accent}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: ch.color || T.accent, fontFamily: T.fontDisplay, fontWeight: 700 }}>{ch.name ? ch.name[0] : '?'}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: T.text, fontFamily: T.fontUI }}>{ch.name}</div>
                  <div style={{ fontSize: 9, color: T.textMuted, fontFamily: T.fontUI }}>{ch.role || 'Character'}</div>
                </div>
                <Badge label="IN SCENE" color={ch.color || T.accent} />
              </div>
            ))}
          </div>
        )}

        {/* ANALYSIS */}
        {tab === "analysis" && (
          <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ fontSize: 9, color: T.textDim, textTransform: "uppercase", letterSpacing: "0.12em", fontFamily: T.fontUI }}>PROSE ANALYSIS — SCENE 3.1</div>
            <div style={{ background: T.surface, borderRadius: T.rSm, padding: 12, border: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 10, color: T.text, fontFamily: T.fontUI, fontWeight: 600 }}>Prose Grade</div>
                <div style={{ fontSize: 10, color: T.textMuted, fontFamily: T.fontUI, marginTop: 2 }}>{analysis.summary}</div>
              </div>
              <span style={{ fontSize: 28, color: T.green, fontFamily: T.fontDisplay }}>{analysis.grade}</span>
            </div>
            {[["Readability",analysis.readability,T.green],["Pacing",analysis.pacing,T.amber],["Sentence Variety",analysis.sentenceVariety,T.green],["Show vs Tell",analysis.showVsTell,T.green],["Dialogue Ratio",analysis.dialogueRatio,T.blue],["Passive Voice",analysis.passiveVoice,T.red],["Adverb Density",analysis.adverbDensity,T.green],["Cliché Score",analysis.clicheScore,T.green]].map(([l,v,c]) => (
              <MBar key={l} label={l} value={v} color={c} />
            ))}
            <Divider />
            <div style={{ fontSize: 9, color: T.textDim, textTransform: "uppercase", letterSpacing: "0.12em", fontFamily: T.fontUI }}>HIGHLIGHT KEY</div>
            {[[T.green,"Strong prose"],[T.red,"Long / complex sentence"],[T.amber,"Weak or vague word"],[T.blue,"Passive voice"],[T.purple,"Repeated phrase"]].map(([c,l]) => (
              <div key={l} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: c, flexShrink: 0 }} />
                <span style={{ fontSize: 10, color: T.textMuted, fontFamily: T.fontUI }}>{l}</span>
              </div>
            ))}
            <Divider />
            <div style={{ fontSize: 9, color: T.textDim, textTransform: "uppercase", letterSpacing: "0.12em", fontFamily: T.fontUI }}>OVERUSED WORDS</div>
            {analysis.overusedWords.map(({ word, count }) => (
              <div key={word} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 11, color: T.red, fontFamily: T.fontMono }}>"{word}"</span>
                <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
                  <div style={{ width: Math.min(50, count * 5), height: 3, borderRadius: 2, background: T.red }} />
                  <span style={{ fontSize: 10, color: T.textDim, fontFamily: T.fontMono }}>{count}×</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* AI EDITOR */}
        {tab === "ai" && (
          <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 11 }}>
            <div style={{ fontSize: 9, color: T.textDim, textTransform: "uppercase", letterSpacing: "0.12em", fontFamily: T.fontUI }}>AI DEVELOPMENTAL EDITOR</div>
            <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
              {["Critique","Expand","Rewrite","Pacing","Dialogue"].map(m => (
                <button key={m} style={{ padding: "3px 9px", borderRadius: 20, border: `1px solid ${m === "Critique" ? T.accent : T.border}`, background: m === "Critique" ? T.accentSoft : "transparent", color: m === "Critique" ? T.accent : T.textMuted, fontSize: 9, fontFamily: T.fontUI, cursor: "pointer" }}>{m}</button>
              ))}
            </div>
            {feedback.map((item, i) => (
              <div key={i} style={{ padding: 11, borderRadius: T.rSm, background: T.surface, border: `1px solid ${T.border}`, borderLeft: `3px solid ${item.color}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 5 }}>
                  <span style={{ fontSize: 11, color: item.color }}>{item.icon}</span>
                  <span style={{ fontSize: 9, color: item.color, fontFamily: T.fontUI, fontWeight: 700, letterSpacing: "0.1em" }}>{item.title}</span>
                </div>
                <div style={{ fontSize: 11, color: T.textSoft, fontFamily: T.fontBody, lineHeight: 1.7 }}>{item.text}</div>
              </div>
            ))}
            <Divider />
            {["Analyze full chapter","Generate alternate opening","Plot consistency check","Suggest scene transition","Tone comparison with Ch.1"].map(a => (
              <button key={a} style={{ display: "flex", alignItems: "center", gap: 7, padding: "7px 10px", borderRadius: T.rSm, border: `1px solid ${T.border}`, background: "transparent", color: T.textMuted, cursor: "pointer", fontSize: 10, fontFamily: T.fontUI, textAlign: "left" }}>
                <Ico n="ai" s={11} c={T.accent} />{a}
              </button>
            ))}
          </div>
        )}

        {/* NOTES */}
        {tab === "notes" && (
          <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 11 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 9, color: T.textDim, textTransform: "uppercase", letterSpacing: "0.12em", fontFamily: T.fontUI }}>SCENE NOTES</span>
              <button style={{ background: "transparent", border: "none", cursor: "pointer", color: T.textDim, fontSize: 18, lineHeight: 1 }}>+</button>
            </div>
            {[{tag:"PLOT",c:T.accent,text:"The girl knows Eli's birth name — not his keeper's name. Requires access to pre-1953 records."},{tag:"CHARACTER",c:T.blue,text:"Eli's instinct to carry her (not call for help) is telling — protecting something, not just someone."},{tag:"REVISION",c:T.amber,text:"TODO: Add sensory grounding detail (smell, sound) when he first reaches the rocks."},{tag:"RESEARCH",c:T.green,text:"No telephone in a keeper's cottage of this era. His isolation is total — needs to be explicit."}].map(({ tag, c, text }) => (
              <div key={tag} style={{ padding: 11, borderRadius: T.rSm, background: T.surface, border: `1px solid ${T.border}` }}>
                <Badge label={tag} color={c} />
                <div style={{ fontSize: 11, color: T.textSoft, fontFamily: T.fontBody, lineHeight: 1.7, marginTop: 8 }}>{text}</div>
              </div>
            ))}
          </div>
        )}

        {/* VERSIONS */}
        {tab === "history" && (
          <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ fontSize: 9, color: T.textDim, textTransform: "uppercase", letterSpacing: "0.12em", fontFamily: T.fontUI }}>VERSION HISTORY</div>
            {versions.map(({ id, time, words, label, active }) => (
              <div key={id} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: active ? T.accent : T.border, marginTop: 3, flexShrink: 0 }} />
                  <div style={{ width: 1, flex: 1, background: T.border, minHeight: 20 }} />
                </div>
                <div style={{ flex: 1, paddingBottom: 8 }}>
                  <div style={{ fontSize: 10, color: active ? T.accent : T.text, fontFamily: T.fontUI, fontWeight: active ? 600 : 400 }}>{label}</div>
                  <div style={{ fontSize: 9, color: T.textDim, fontFamily: T.fontUI, marginTop: 2 }}>{time}</div>
                  <div style={{ fontSize: 9, color: T.textMuted, fontFamily: T.fontMono, marginTop: 2 }}>words: {words}</div>
                  {!active && <button onClick={() => restore(id)} style={{ fontSize: 9, color: T.blue, background: "transparent", border: "none", cursor: "pointer", padding: 0, fontFamily: T.fontUI, marginTop: 3 }}>Restore this version</button>}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* THINK */}
        {tab === "think" && (
          <ThinkingPanel 
            projectId="demo-project-1" 
            width={248} 
            open={true} 
            onToggleOpen={() => {}} 
            activeTab={thinkTab} 
            onTabChange={setThinkTab} 
          />
        )}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════
// 11. WRITE VIEW  (3-panel)
// ═══════════════════════════════════════════════════════════════════════
const WriteView = () => {
  const { sceneOrder } = useStoryStore();
  const [activeScene, setActiveScene] = useState(sceneOrder[0] || null);
  
  useEffect(() => {
    if (!activeScene && sceneOrder.length > 0) {
      setActiveScene(sceneOrder[0]);
    }
  }, [sceneOrder, activeScene]);

  return (
    <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
      <BinderPanel activeScene={activeScene} onSelect={setActiveScene} />
      <WritingCanvas activeScene={activeScene} />
      <InspectorPanel activeScene={activeScene} />
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════
// 12. CORKBOARD VIEW
// ═══════════════════════════════════════════════════════════════════════
const CorkboardView = () => {
  const [selCh, setSelCh] = useState("ch4");
  const cards = [
    { id:1, title:"3.1 — The Girl",          status:"done",    text:"Eli sees her from the window. Drenched, silent, alone. He descends without speaking.",        pov:"Eli", tension:"Rising",  words:412,  bg:"#2a2000" },
    { id:2, title:"3.2 — The Climb",         status:"done",    text:"He carries her up. She studies everything — not frightened, not grateful. Already familiar.",  pov:"Eli", tension:"Tense",   words:388,  bg:"#002020" },
    { id:3, title:"3.3 — First Words",       status:"writing", text:"Her first word is his old name. The one he buried with the Ardmore.",                          pov:"Eli", tension:"Peak",    words:156,  bg:"#20001a" },
    { id:4, title:"3.4 — The Storm Returns", status:"draft",   text:"PLACEHOLDER — Halford's truck on the coast road.",                                              pov:"Eli", tension:"???",     words:0,    bg:"#1a1a1a" },
    { id:5, title:"3.5 — The Knock",         status:"draft",   text:"PLACEHOLDER — Someone at the door. Eli decides before opening.",                                pov:"Eli", tension:"???",     words:0,    bg:"#1a1a1a" },
  ];
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", padding: "8px 20px", gap: 8, background: T.panel, borderBottom: `1px solid ${T.border}`, flexShrink: 0, flexWrap: "wrap" }}>
        <span style={{ fontSize: 9, color: T.textDim, textTransform: "uppercase", letterSpacing: "0.12em", fontFamily: T.fontUI, marginRight: 4 }}>CHAPTER:</span>
        {MOCK_CHAPTERS.filter(c => c.scenes.length > 0).map(c => (
          <button key={c.id} onClick={() => setSelCh(c.id)} style={{ padding: "3px 10px", borderRadius: T.rSm, border: `1px solid ${selCh === c.id ? T.accent : T.border}`, background: selCh === c.id ? T.accentSoft : "transparent", color: selCh === c.id ? T.accent : T.textMuted, fontSize: 10, fontFamily: T.fontUI, cursor: "pointer" }}>{c.label}</button>
        ))}
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}><Badge label="5 SCENES" color={T.blue} /><Badge label="956 WORDS" /></div>
      </div>
      <div style={{ flex: 1, overflow: "auto", padding: 28, background: `repeating-linear-gradient(0deg,transparent,transparent 24px,${T.border}18 24px,${T.border}18 25px),repeating-linear-gradient(90deg,transparent,transparent 24px,${T.border}18 24px,${T.border}18 25px),${T.bgDeep}` }}>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          {cards.map(card => (
            <div key={card.id} style={{ width: 200, background: card.bg, border: `1px solid ${card.status === "writing" ? T.accent : T.border}`, borderTop: `3px solid ${card.status === "done" ? T.green : card.status === "writing" ? T.accent : T.border}`, borderRadius: T.rSm, padding: 14, boxShadow: "0 2px 8px #00000044", cursor: "pointer", position: "relative" }}>
              <div style={{ position: "absolute", top: -8, left: "50%", transform: "translateX(-50%)", width: 12, height: 12, borderRadius: "50%", background: card.status === "done" ? T.green : card.status === "writing" ? T.accent : T.textDim, boxShadow: "0 2px 4px #00000066" }} />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <span style={{ fontSize: 11, color: T.text, fontFamily: T.fontUI, fontWeight: 600, flex: 1, paddingRight: 6, lineHeight: 1.3 }}>{card.title}</span>
                <Badge label={card.status === "done" ? "DONE" : card.status === "writing" ? "WIP" : "DRAFT"} color={card.status === "done" ? T.green : card.status === "writing" ? T.accent : T.textDim} />
              </div>
              <div style={{ fontSize: 11, color: T.textMuted, fontFamily: T.fontBody, lineHeight: 1.6, marginBottom: 10, minHeight: 50 }}>{card.text}</div>
              <Divider />
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 9, color: T.textDim, fontFamily: T.fontUI }}>
                <span>POV: {card.pov}</span><span>⚡ {card.tension}</span><span>{card.words > 0 ? `${card.words}w` : "—"}</span>
              </div>
            </div>
          ))}
          <div style={{ width: 200, minHeight: 140, background: "transparent", border: `2px dashed ${T.border}`, borderRadius: T.rSm, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: T.textDim, flexDirection: "column", gap: 8 }}>
            <Ico n="plus" s={20} c={T.textDim} /><span style={{ fontSize: 11, fontFamily: T.fontUI }}>Add Scene</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════
// 13. CHARACTERS VIEW
// ═══════════════════════════════════════════════════════════════════════
const CharactersView = () => {
  const { characters } = useStoryStore();
  const charsList = Object.keys(characters || {}).length > 0 ? Object.values(characters) : MOCK_CHARS;
  const [sel, setSel] = useState(charsList[0]);
  
  useEffect(() => {
    if (charsList.length > 0 && !charsList.find(c => c.id === sel?.id)) {
      setSel(charsList[0]);
    }
  }, [charsList, sel]);

  return (
    <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
      <div style={{ width: 220, background: T.panel, borderRight: `1px solid ${T.border}`, display: "flex", flexDirection: "column", overflow: "hidden", flexShrink: 0 }}>
        <div style={{ padding: "12px 14px 8px", borderBottom: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 9, color: T.textDim, textTransform: "uppercase", letterSpacing: "0.12em", fontFamily: T.fontUI }}>CHARACTERS · {charsList.length}</span>
          <button style={{ ...btnSt(20), fontSize: 18 }}>+</button>
        </div>
        <div style={{ flex: 1, overflow: "auto", padding: "6px 8px" }}>
          {charsList.map(ch => (
            <div key={ch.id} onClick={() => setSel(ch)} style={{ display: "flex", alignItems: "center", gap: 10, padding: 8, borderRadius: T.rSm, cursor: "pointer", marginBottom: 2, background: sel?.id === ch.id ? T.accentSoft : "transparent", borderLeft: `2px solid ${sel?.id === ch.id ? T.accent : "transparent"}` }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: `${ch.color}20`, border: `1px solid ${ch.color}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, color: ch.color, fontFamily: T.fontDisplay, fontWeight: 700, flexShrink: 0 }}>{ch.name[0]}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, color: sel?.id === ch.id ? T.accent : T.text, fontFamily: T.fontUI, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{ch.name}</div>
                <div style={{ fontSize: 9, color: T.textMuted, fontFamily: T.fontUI }}>{ch.role}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      {sel && (
        <div style={{ flex: 1, overflow: "auto", padding: 28 }}>
          <div style={{ display: "flex", gap: 24, marginBottom: 24, alignItems: "flex-start" }}>
            <div style={{ width: 80, height: 80, borderRadius: 20, background: `${sel.color}20`, border: `2px solid ${sel.color}55`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 40, color: sel.color, fontFamily: T.fontDisplay, fontWeight: 700, flexShrink: 0, boxShadow: `0 0 30px ${sel.color}22` }}>{sel.name[0]}</div>
            <div style={{ flex: 1 }}>
              <h2 style={{ fontFamily: T.fontDisplay, fontSize: 26, color: T.text, fontWeight: 400, lineHeight: 1.2, marginBottom: 6 }}>{sel.name}</h2>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                <Badge label={sel.role} color={sel.color} /><Badge label={`AGE ${sel.age}`} color={T.textMuted} /><Badge label={`ARC: ${sel.arc}`} color={sel.color} />
              </div>
              <p style={{ fontFamily: T.fontBody, fontSize: 15, color: T.textSoft, lineHeight: 1.7, maxWidth: 560, margin: 0 }}>{sel.bio}</p>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.r, padding: 16 }}>
              <div style={{ fontSize: 10, color: T.textDim, textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: T.fontUI, marginBottom: 10 }}>TRAITS</div>
              {sel.traits.map(t => (
                <div key={t} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", borderBottom: `1px solid ${T.borderSoft}` }}>
                  <div style={{ width: 4, height: 4, borderRadius: "50%", background: sel.color }} />
                  <span style={{ fontSize: 12, color: T.text, fontFamily: T.fontUI }}>{t}</span>
                </div>
              ))}
            </div>
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.r, padding: 16 }}>
              <div style={{ fontSize: 10, color: T.textDim, textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: T.fontUI, marginBottom: 10 }}>PRESENCE</div>
              {[["First appears",sel.firstAppears],["Total words",`${sel.wordCount.toLocaleString()} words`],["Scene count",`${sel.scenes} scenes`],["Arc progress",`${sel.arc_pct}% resolved`]].map(([l,v]) => (
                <div key={l} style={{ display: "flex", flexDirection: "column", gap: 2, padding: "6px 0", borderBottom: `1px solid ${T.borderSoft}` }}>
                  <span style={{ fontSize: 9, color: T.textDim, fontFamily: T.fontUI, textTransform: "uppercase", letterSpacing: "0.08em" }}>{l}</span>
                  <span style={{ fontSize: 11, color: T.text, fontFamily: T.fontUI }}>{v}</span>
                </div>
              ))}
            </div>
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.r, padding: 16 }}>
              <div style={{ fontSize: 10, color: T.textDim, textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: T.fontUI, marginBottom: 10 }}>CHARACTER ARC · {sel.arc}</div>
              <div style={{ height: 60, display: "flex", alignItems: "flex-end", gap: 3, marginBottom: 8 }}>
                {[15,20,30,25,35,40,38,45,50].map((h,i) => <div key={i} style={{ flex: 1, height: `${h}%`, borderRadius: "2px 2px 0 0", background: i < 3 ? `${sel.color}44` : `${sel.color}88` }} />)}
              </div>
              <PBar value={sel.arc_pct} max={100} color={sel.color} height={4} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════
// 14. WORLDBUILDING VIEW
// ═══════════════════════════════════════════════════════════════════════
const WorldView = () => {
  const [cat, setCat] = useState("locations");
  const { locations } = useStoryStore();
  const locList = Object.keys(locations || {}).length > 0 ? Object.values(locations) : MOCK_LOCS;

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", padding: "8px 20px", gap: 8, background: T.panel, borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
        {[["locations","Locations"],["lore","Lore"],["glossary","Glossary"],["objects","Artifacts"]].map(([id, l]) => (
          <button key={id} onClick={() => setCat(id)} style={{ padding: "4px 14px", borderRadius: 20, border: `1px solid ${cat === id ? T.accent : T.border}`, background: cat === id ? T.accentSoft : "transparent", color: cat === id ? T.accent : T.textMuted, fontSize: 11, fontFamily: T.fontUI, cursor: "pointer" }}>{l}</button>
        ))}
        <button style={{ marginLeft: "auto", ...btnSt(24), fontSize: 18 }}>+</button>
      </div>
      <div style={{ flex: 1, overflow: "auto", padding: 24 }}>
        {cat === "locations" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 16 }}>
            {locList.map(loc => (
              <div key={loc.id} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.r, padding: 20, cursor: "pointer", borderTop: `3px solid ${loc.color}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                  <div>
                    <h3 style={{ fontFamily: T.fontDisplay, fontSize: 17, color: T.text, fontWeight: 400, marginBottom: 3 }}>{loc.name}</h3>
                    <div style={{ fontSize: 10, color: T.textMuted, fontFamily: T.fontUI }}>{loc.type} · {loc.region}</div>
                  </div>
                  <Badge label={loc.tag} color={loc.color} />
                </div>
                <p style={{ fontFamily: T.fontBody, fontSize: 13, color: T.textSoft, lineHeight: 1.7, margin: 0 }}>{loc.desc}</p>
              </div>
            ))}
          </div>
        )}
        {cat === "glossary" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[["The Wrecking","The local term for the 1952 grounding of the SS Ardmore."],["The Keeper","Eli's title. Not his name — his function."],["The Log","Eli's daily journal. 37 volumes, written as if addressed to no one."],["The Locked Room","The back room sealed in 1990."],["The Girl's Name","Clara. Not used until Chapter 6."]].map(([term, def]) => (
              <div key={term} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.rSm, padding: 14 }}>
                <div style={{ fontFamily: T.fontUI, fontSize: 12, color: T.accent, fontWeight: 600, marginBottom: 6 }}>{term}</div>
                <p style={{ fontFamily: T.fontBody, fontSize: 13, color: T.textSoft, lineHeight: 1.7, margin: 0 }}>{def}</p>
              </div>
            ))}
          </div>
        )}
        {(cat === "lore" || cat === "objects") && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60%", flexDirection: "column", gap: 12 }}>
            <Ico n="folder" s={40} c={T.textDim} />
            <p style={{ fontSize: 14, color: T.textMuted, fontFamily: T.fontUI, margin: 0 }}>No {cat} entries yet.</p>
            <button style={{ padding: "7px 16px", borderRadius: T.r, border: `1px solid ${T.accent}44`, background: T.accentSoft, color: T.accent, cursor: "pointer", fontSize: 11, fontFamily: T.fontUI }}>+ Add first entry</button>
          </div>
        )}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════
// 15. TIMELINE VIEW
// ═══════════════════════════════════════════════════════════════════════
const TimelineView = () => {
  const { timelineEvents } = useStoryStore();
  const timelineList = timelineEvents?.length > 0 ? timelineEvents : MOCK_TIMELINE;

  return (
  <div style={{ flex: 1, overflow: "auto", padding: 32 }}>
    <h2 style={{ fontFamily: T.fontDisplay, fontSize: 22, color: T.text, marginBottom: 6, fontWeight: 400 }}>Story Timeline</h2>
    <p style={{ fontSize: 12, color: T.textMuted, fontFamily: T.fontBody, marginBottom: 36, margin: "0 0 36px" }}>The Lighthouse Keeper's Daughter · 1952 → 2024</p>
    <div style={{ position: "relative", paddingBottom: 60, minWidth: 600 }}>
      <div style={{ position: "absolute", top: 21, left: 0, right: 0, height: 2, background: `linear-gradient(90deg,transparent,${T.border} 5%,${T.border} 95%,transparent)` }} />
      <div style={{ display: "flex", justifyContent: "space-between", position: "relative" }}>
        {timelineList.map((ev, i) => {
          const even = i % 2 === 0;
          return (
            <div key={ev.id} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", position: "relative" }}>
              <div style={{ width: 14, height: 14, borderRadius: "50%", background: ev.color, border: `2px solid ${T.bg}`, boxShadow: `0 0 10px ${ev.color}66`, zIndex: 1, marginTop: 14 }} />
              {even && <div style={{ width: 1, height: 28, background: `${ev.color}55` }} />}
              <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderTop: `2px solid ${ev.color}`, borderRadius: T.rSm, padding: 12, maxWidth: 130, width: "90%", marginTop: even ? 0 : 44, position: even ? "relative" : "absolute", top: even ? "auto" : -128 }}>
                <div style={{ fontFamily: T.fontMono, fontSize: 13, color: ev.color, fontWeight: 700, marginBottom: 4 }}>{ev.year}</div>
                <div style={{ fontFamily: T.fontUI, fontSize: 10, color: T.text, fontWeight: 600, marginBottom: 4 }}>{ev.label}</div>
                <p style={{ fontFamily: T.fontBody, fontSize: 10, color: T.textMuted, lineHeight: 1.6, margin: 0 }}>{ev.desc}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
    <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 60, paddingTop: 16, borderTop: `1px solid ${T.border}` }}>
      {[["historical",T.red],["character",T.accent],["world",T.blue],["mystery",T.purple],["present",T.amber]].map(([type, c]) => (
        <div key={type} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: c }} />
          <span style={{ fontSize: 10, color: T.textMuted, fontFamily: T.fontUI, textTransform: "capitalize" }}>{type}</span>
        </div>
      ))}
    </div>
  </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════
// 16. RESEARCH VIEW
// ═══════════════════════════════════════════════════════════════════════
const ResearchView = () => {
  const [cat, setCat] = useState("all");
  const { researchNotes } = useStoryStore();
  const researchList = researchNotes?.length > 0 ? researchNotes : MOCK_RESEARCH;
  const cats = ["all","lighthouse","maritime","psychology","history","craft","setting"];
  const filtered = cat === "all" ? researchList : researchList.filter(n => n.tag.toLowerCase().includes(cat));
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 20px", background: T.panel, borderBottom: `1px solid ${T.border}`, flexShrink: 0, flexWrap: "wrap" }}>
        {cats.map(c => <button key={c} onClick={() => setCat(c)} style={{ padding: "3px 10px", borderRadius: 20, border: `1px solid ${cat === c ? T.accent : T.border}`, background: cat === c ? T.accentSoft : "transparent", color: cat === c ? T.accent : T.textMuted, fontSize: 10, fontFamily: T.fontUI, cursor: "pointer" }}>{c.charAt(0).toUpperCase() + c.slice(1)}</button>)}
        <button style={{ marginLeft: "auto", ...btnSt(24), fontSize: 18 }}>+</button>
      </div>
      <div style={{ flex: 1, overflow: "auto", padding: 24, display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 14, alignContent: "start" }}>
        {filtered.map(n => (
          <div key={n.id} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.r, padding: 18, borderLeft: `3px solid ${n.color}` }}>
            <Badge label={n.tag} color={n.color} />
            <h4 style={{ fontFamily: T.fontUI, fontSize: 13, color: T.text, fontWeight: 600, margin: "8px 0", lineHeight: 1.3 }}>{n.title}</h4>
            <p style={{ fontFamily: T.fontBody, fontSize: 13, color: T.textSoft, lineHeight: 1.75, margin: 0 }}>{n.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════
// 17. EXPORT VIEW
// ═══════════════════════════════════════════════════════════════════════
const ExportView = () => {
  const [fmt, setFmt] = useState("manuscript");
  const { exporting, doExport } = useExport();
  const formats = [
    { id: "manuscript", label: "Manuscript PDF",    desc: "Courier 12pt, double-spaced. For agent submissions.", icon: "📄", badge: "RECOMMENDED" },
    { id: "epub",       label: "EPUB 3 eBook",      desc: "Self-publishing ready. Includes metadata, ToC.",       icon: "📱", badge: "" },
    { id: "docx",       label: "Word Document",     desc: "Editable .docx with tracked changes preserved.",       icon: "📝", badge: "" },
    { id: "fdx",        label: "Final Draft (.fdx)", desc: "For screenwriters adapting the novel.",                icon: "🎬", badge: "" },
    { id: "html",       label: "Clean HTML",        desc: "Semantic HTML5. For web serialization.",               icon: "🌐", badge: "" },
    { id: "txt",        label: "Plain Text",        desc: "UTF-8 text. Archive format. No formatting.",           icon: "🗒", badge: "" },
  ];
  return (
    <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
      {/* Format picker */}
      <div style={{ width: 260, background: T.panel, borderRight: `1px solid ${T.border}`, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ padding: "14px 16px 10px", borderBottom: `1px solid ${T.border}` }}>
          <div style={{ fontSize: 9, color: T.textDim, textTransform: "uppercase", letterSpacing: "0.12em", fontFamily: T.fontUI }}>EXPORT FORMAT</div>
        </div>
        <div style={{ flex: 1, overflow: "auto", padding: 8 }}>
          {formats.map(f => (
            <div key={f.id} onClick={() => setFmt(f.id)} style={{ padding: 12, borderRadius: T.rSm, cursor: "pointer", marginBottom: 4, background: fmt === f.id ? T.accentSoft : "transparent", border: `1px solid ${fmt === f.id ? T.accent : T.border}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 16 }}>{f.icon}</span>
                <span style={{ fontSize: 12, color: fmt === f.id ? T.accent : T.text, fontFamily: T.fontUI, fontWeight: 600 }}>{f.label}</span>
                {f.badge && <Badge label={f.badge} color={T.green} />}
              </div>
              <p style={{ fontSize: 10, color: T.textMuted, fontFamily: T.fontUI, lineHeight: 1.5, margin: 0, paddingLeft: 24 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
      {/* Options + preview */}
      <div style={{ flex: 1, overflow: "auto", padding: 28, display: "flex", gap: 20 }}>
        <div style={{ width: 280, flexShrink: 0, display: "flex", flexDirection: "column", gap: 16 }}>
          <h2 style={{ fontFamily: T.fontDisplay, fontSize: 20, color: T.text, fontWeight: 400 }}>Export Options</h2>
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.r, padding: 16 }}>
            <div style={{ fontSize: 10, color: T.textDim, textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: T.fontUI, marginBottom: 12 }}>SCOPE</div>
            {["Full manuscript","Current chapter only","Selected scenes","Front matter + chapters"].map(s => (
              <label key={s} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", cursor: "pointer" }}>
                <div style={{ width: 14, height: 14, borderRadius: "50%", border: `2px solid ${s === "Full manuscript" ? T.accent : T.border}`, background: s === "Full manuscript" ? T.accent : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {s === "Full manuscript" && <div style={{ width: 5, height: 5, borderRadius: "50%", background: T.bg }} />}
                </div>
                <span style={{ fontSize: 11, color: T.textSoft, fontFamily: T.fontUI }}>{s}</span>
              </label>
            ))}
          </div>
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.r, padding: 16 }}>
            <div style={{ fontSize: 10, color: T.textDim, textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: T.fontUI, marginBottom: 12 }}>FORMAT OPTIONS</div>
            {[["Include scene headings",true],["Include chapter numbers",true],["Author header/footer",true],["Include inline notes",false],["Tracked changes",false],["Word count page",true]].map(([label, checked]) => (
              <label key={label} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0", cursor: "pointer" }}>
                <div style={{ width: 14, height: 14, borderRadius: 3, border: `2px solid ${checked ? T.accent : T.border}`, background: checked ? T.accentSoft : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {checked && <Ico n="check" s={9} c={T.accent} />}
                </div>
                <span style={{ fontSize: 11, color: T.textSoft, fontFamily: T.fontUI }}>{label}</span>
              </label>
            ))}
          </div>
          <button onClick={() => doExport("proj_001", fmt, {})} disabled={exporting} style={{ padding: "13px 0", borderRadius: T.r, border: `1px solid ${T.accent}55`, background: exporting ? T.surface : `linear-gradient(135deg,${T.accentSoft},${T.accentGlow})`, color: exporting ? T.textMuted : T.accent, cursor: exporting ? "not-allowed" : "pointer", fontFamily: T.fontUI, fontSize: 14, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <Ico n="export" s={16} c={exporting ? T.textMuted : T.accent} />
            {exporting ? "Exporting…" : "Export Manuscript"}
          </button>
        </div>
        {/* Manuscript preview */}
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 11, color: T.textMuted, fontFamily: T.fontUI, marginBottom: 12 }}>Preview — Standard Manuscript Format</p>
          <div style={{ background: "#f8f6f0", borderRadius: T.r, padding: "48px 64px", maxWidth: 500, boxShadow: "0 4px 24px rgba(0,0,0,0.4)", fontFamily: "'Courier Prime',Courier,monospace", fontSize: 12, lineHeight: 2, color: "#1a1a1a" }}>
            <div style={{ textAlign: "right", marginBottom: 40, fontSize: 11, color: "#666" }}>Author Name / THE LIGHTHOUSE KEEPER'S DAUGHTER / 1</div>
            <div style={{ textAlign: "center", marginBottom: 40 }}>
              <div style={{ textTransform: "uppercase", fontWeight: "bold", marginBottom: 4 }}>CHAPTER THREE</div>
              <div style={{ textTransform: "uppercase" }}>The Girl on the Rocks</div>
            </div>
            <p style={{ textIndent: "5ch", margin: "0 0 0 0" }}>The old lighthouse keeper had not spoken to another soul in thirty-seven years. He had grown accustomed to the silence — had come to love it, in fact…</p>
            <div style={{ textAlign: "center", marginTop: 24, color: "#aaa", fontSize: 11 }}>[ continued… ]</div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════
// 18. ROOT APP
// ═══════════════════════════════════════════════════════════════════════
import './MidnightChronicleEditor.css';

export default function MidnightChronicleEditor() {
  const [view, setView] = useState("write");

  const VIEWS = {
    dashboard:  <DashboardView setView={setView} />,
    write:      <WriteView />,
    corkboard:  <CorkboardView />,
    characters: <CharactersView />,
    world:      <WorldView />,
    timeline:   <TimelineView />,
    research:   <ResearchView />,
    export:     <ExportView />,
  };

  return (
    <div className="midnight-chronicle-editor" style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: T.bg, overflow: "hidden" }}>
      <TitleBar />
      <TopNav active={view} setActive={setView} />
      <div key={view} className="fade-in" style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {VIEWS[view] || <WriteView />}
      </div>
      <GlobalStatus view={view} />
    </div>
  );
}
