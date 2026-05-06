/**
 * SSO Orchestrator — Single entry point for the full intelligence pipeline
 * 
 * Wires together:
 * 1. signalEngine.js     → Raw signal detection (arc, pacing, conflict issues)
 * 2. intentLayer.js      → Phase-aware score adjustment
 * 3. metaSignalLayer.js  → Cluster overlapping signals into meta-signals
 * 4. progressionCurve.js → Chapter-level progression curve calculation
 * 5. aiModes.js          → Mode-dependent token budget & pass configuration
 * 6. ssoTracks.js        → Track-aware snapshot building for AI context
 * 
 * RULE: This orchestrator NEVER receives raw manuscript text.
 * It reads exclusively from the Zustand store's structural metadata.
 */

import { runSignalEngine } from './signalEngine.js';
import { mergeToMetaSignals } from './metaSignalLayer.js';
import { calculateProgressionCurve } from './progressionCurve.js';
import { AI_MODES } from './aiModes.js';
import { buildTrackSnapshot, SSO_TRACKS } from './ssoTracks.js';

/**
 * Run the full local analysis pipeline (no AI calls).
 * This is the client-side intelligence that runs on every significant store change.
 * 
 * @param {object} storeSnapshot - Current Zustand store state
 * @returns {object} Complete analysis result
 */
export function runLocalAnalysis(storeSnapshot) {
  const startTime = performance.now();

  // 1. Progression Curve — determines phase assignments for each chapter
  const progression = calculateProgressionCurve(storeSnapshot);

  // 2. Signal Engine — detects structural issues (flat arcs, pacing, conflicts)
  //    Internally calls intentLayer for phase-aware adjustments
  const signals = runSignalEngine(storeSnapshot);

  // 3. Meta-Signal Layer — clusters overlapping signals into compound insights
  const metaSignals = mergeToMetaSignals(signals);

  // 4. Separate meta from standalone signals
  const compoundSignals = metaSignals.filter(s => s.is_meta);
  const standaloneSignals = metaSignals.filter(s => !s.is_meta);

  // 5. Build health score from progression + signals
  const healthScore = calculateHealthScore(progression, metaSignals);

  const elapsed = performance.now() - startTime;

  return {
    timestamp: new Date().toISOString(),
    elapsed_ms: Math.round(elapsed),
    progression,
    signals: standaloneSignals,
    metaSignals: compoundSignals,
    allSignals: metaSignals,
    healthScore,
    summary: buildSummary(progression, metaSignals, healthScore),
  };
}

/**
 * Build an SSO context payload for AI consumption.
 * Combines local analysis with the appropriate track snapshot.
 * 
 * @param {string} mode - 'normal' | 'depth' | 'extended'
 * @param {string} trackId - SSO track (e.g., 'DEVELOPMENTAL', 'CULTURAL')
 * @param {object} storeSnapshot - Current Zustand store state
 * @param {object} localAnalysis - Result from runLocalAnalysis
 * @returns {object} AI-ready context payload
 */
export function buildAIContext(mode, trackId, storeSnapshot, localAnalysis) {
  const modeConfig = AI_MODES[mode.toUpperCase()] || AI_MODES.NORMAL;
  const trackSnapshot = buildTrackSnapshot(trackId, storeSnapshot);

  // Enforce signal limits per mode
  const signalLimit = modeConfig.maxSignals;
  const topSignals = localAnalysis.allSignals.slice(0, signalLimit);

  // Build the SSO payload (never includes raw text)
  const ssoPayload = {
    mode: modeConfig.id,
    track: trackSnapshot.track,
    tokenBudget: trackSnapshot.tokenBudget,
    
    // Structural data
    signals: topSignals.map(s => ({
      id: s.id,
      type: s.type,
      severity: s.severity,
      phase: s.progression_phase,
      issue: s.issue,
      cause: s.cause,
      fix: s.directional_fix,
      score: s.intent_adjusted_score || s.composite_score,
      is_meta: s.is_meta || false,
    })),
    
    // Progression summary (not full curve data in normal mode)
    progression: modeConfig.id === 'normal' 
      ? {
          phases: localAnalysis.progression.phaseAssignments,
          issues: localAnalysis.progression.detectedIssues,
          chapterCount: localAnalysis.progression.chapterCurves.length,
        }
      : {
          phases: localAnalysis.progression.phaseAssignments,
          issues: localAnalysis.progression.detectedIssues,
          curves: localAnalysis.progression.chapterCurves,
        },

    // Track-specific data
    stateData: trackSnapshot.data,
    
    // Health overview
    health: localAnalysis.healthScore,
  };

  return {
    payload: ssoPayload,
    modeConfig,
    estimatedTokens: estimateTokens(ssoPayload),
  };
}

/**
 * Calculate a 0-100 health score for the manuscript structure.
 */
function calculateHealthScore(progression, metaSignals) {
  let score = 100;

  // Deduct for detected structural issues
  const issueWeights = {
    missing_peak: 25,
    flat_middle: 15,
    weak_escalation: 10,
    early_resolution: 10,
  };
  
  for (const issue of progression.detectedIssues) {
    score -= (issueWeights[issue] || 5);
  }

  // Deduct for high-severity signals
  for (const signal of metaSignals) {
    const severity = signal.severity || 'low';
    if (severity === 'critical') score -= 15;
    else if (severity === 'high') score -= 10;
    else if (severity === 'medium') score -= 5;
  }

  // Bonus for having progression markers defined
  const hasMarkers = progression.chapterCurves.some(c => c.setup_density > 0);
  if (hasMarkers) score += 5;

  return {
    score: Math.max(0, Math.min(100, score)),
    grade: score >= 90 ? 'A' : score >= 75 ? 'B' : score >= 60 ? 'C' : score >= 40 ? 'D' : 'F',
    label: score >= 90 ? 'Excellent' : score >= 75 ? 'Good' : score >= 60 ? 'Needs Work' : score >= 40 ? 'Significant Issues' : 'Critical Issues',
    issueCount: progression.detectedIssues.length + metaSignals.filter(s => s.severity === 'high' || s.severity === 'critical').length,
  };
}

/**
 * Build a human-readable summary of the analysis.
 */
function buildSummary(progression, metaSignals, healthScore) {
  const parts = [];

  parts.push(`Structure Health: ${healthScore.grade} (${healthScore.score}/100)`);

  if (progression.detectedIssues.length > 0) {
    const issueLabels = {
      missing_peak: 'Missing climax',
      flat_middle: 'Flat middle section',
      weak_escalation: 'Weak escalation',
      early_resolution: 'Premature resolution',
    };
    const issues = progression.detectedIssues.map(i => issueLabels[i] || i);
    parts.push(`Issues: ${issues.join(', ')}`);
  } else {
    parts.push('No structural issues detected');
  }

  const criticalCount = metaSignals.filter(s => s.severity === 'critical' || s.severity === 'high').length;
  if (criticalCount > 0) {
    parts.push(`${criticalCount} high-priority signal(s) require attention`);
  }

  return parts.join('. ') + '.';
}

/**
 * Rough token estimate for an SSO payload.
 * Uses ~4 chars per token heuristic.
 */
function estimateTokens(payload) {
  const jsonStr = JSON.stringify(payload);
  return Math.ceil(jsonStr.length / 4);
}
