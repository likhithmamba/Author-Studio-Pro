export const AI_MODES = {
  NORMAL: { id: 'normal', contextPct: 0.30, reasoningPct: 0.40, outputPct: 0.30, maxSignals: 3, multiPass: false },
  DEPTH: { id: 'depth', contextPct: 0.60, reasoningPct: 0.70, outputPct: 0.40, maxSignals: 5, multiPass: true, passes: 5 },
  EXTENDED: { id: 'extended', contextPct: 0.75, reasoningPct: 0.90, outputPct: 0.50, maxSignals: 10,
    multiPass: true, passes: 6, requiresHighTokenModel: true, fallback: 'depth' }
}
