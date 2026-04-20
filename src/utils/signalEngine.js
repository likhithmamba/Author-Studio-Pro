import { applyIntentAdjustment, buildIntentConfig } from './intentLayer.js';
import { calculateProgressionCurve } from './progressionCurve.js';

export function runSignalEngine(storeSnapshot) {
    const { characterStates = {}, conflictStates = {}, progressionMarkers = [], nodes = {}, edges = [], chapterOrder = [], projectMeta = {} } = storeSnapshot;
    
    let rawSignals = [];
    const progData = calculateProgressionCurve(storeSnapshot);
    
    // 1. Detect Flat Arcs
    Object.values(characterStates).forEach(char => {
        if (char.arc_phase === 'introduction' && chapterOrder.indexOf(char.chapter_id) > chapterOrder.length * 0.4) {
             rawSignals.push({
                 id: `sig_${Date.now()}_char_${char.character_id}_flat`,
                 type: 'arc',
                 progression_phase: 'escalation',
                 characters: [char.character_id],
                 region: { chapterIds: [char.chapter_id].filter(Boolean) },
                 raw_score: 75,
                 severity: 'medium',
                 issue: `Character has a flat arc (still in introduction late in story).`,
                 cause: "Character development is stalled or missing progression markers.",
                 directional_fix: "Push this character into a proactive transformation or active conflict."
             });
        }
    });

    // 2. Detect Curve Issues
    progData.detectedIssues.forEach(issue => {
        if (issue === 'flat_middle') {
            rawSignals.push({
                id: `sig_${Date.now()}_flat_mid`,
                type: 'pacing',
                progression_phase: 'escalation',
                characters: [],
                region: { chapterIds: progData.phaseAssignments.escalation || [] },
                raw_score: 75,
                severity: 'medium',
                issue: "Detected a flat middle: Conflict intensity lacks variation across core chapters.",
                cause: "Scenes are functionally repetitive without compounding escalation.",
                directional_fix: "Vary conflict intensity. If chapter X escalates, chapter X+1 should react or complicate."
            });
        }
        if (issue === 'missing_peak') {
            rawSignals.push({
                id: `sig_${Date.now()}_no_peak`,
                type: 'structure',
                progression_phase: 'peak',
                characters: [],
                region: { chapterIds: progData.phaseAssignments.peak || [] },
                raw_score: 90,
                severity: 'high',
                issue: "Missing climax or missing_peak.",
                cause: "No chapter reaches maximum conflict intensity (> 0.8).",
                directional_fix: "Consolidate active conflicts to peak simultaneously in the designated climax chapters."
            });
        }
        if (issue === 'early_resolution') {
            rawSignals.push({
                 id: `sig_${Date.now()}_early_res`,
                 type: 'pacing',
                 progression_phase: 'resolution',
                 characters: [],
                 region: { chapterIds: progData.phaseAssignments.resolution || [] },
                 raw_score: 60,
                 severity: 'medium',
                 issue: "Premature resolution of pressure.",
                 cause: "Primary conflicts resolve too far ahead of the story's end.",
                 directional_fix: "Extend the peak conflict or introduce a secondary complication before the true resolution."
            });
        }
        if (issue === 'weak_escalation') {
            rawSignals.push({
                 id: `sig_${Date.now()}_weak_esc`,
                 type: 'pacing',
                 progression_phase: 'escalation',
                 characters: [],
                 region: { chapterIds: progData.phaseAssignments.escalation || [] },
                 raw_score: 70,
                 severity: 'medium',
                 issue: "Weak Escalation: Tension drops between midpoint and climax.",
                 cause: "Conflict intensity is lower at 75% than it was at 50%.",
                 directional_fix: "Introduce a major setback or raise the stakes after the midpoint."
            });
        }
    });

    // 3. Unresolved conflicts
    Object.values(conflictStates).forEach(conf => {
        if (conf.status === 'active' || conf.status === 'escalating') {
            const chapterIdx = chapterOrder.indexOf(conf.chapter_id);
            if (chapterIdx > 0 && (chapterIdx / chapterOrder.length) > 0.85) {
                rawSignals.push({
                    id: `sig_${Date.now()}_${conf.conflict_id}_unres`,
                    type: 'conflict',
                    progression_phase: 'resolution',
                    characters: conf.parties || [],
                    region: { chapterIds: [conf.chapter_id].filter(Boolean) },
                    raw_score: 70,
                    severity: 'medium',
                    issue: "Unresolved active conflict at end phase.",
                    cause: `Conflict '${conf.type}' spanning multiple characters lacks closure.`,
                    directional_fix: "Design a scene that decisively resolves or addresses this tension before the epilogue."
                });
            }
        }
    });
    
    // STAGE 2 - INTENT ADJUSTMENT
    const intentConfig = buildIntentConfig(projectMeta);
    let adjustedSignals = rawSignals.map(sig => applyIntentAdjustment(sig, storeSnapshot, intentConfig));
    
    // STAGE 3 - SCORING
    adjustedSignals.forEach(sig => {
        let sevWeight = sig.severity === 'critical' ? 100 : (sig.severity === 'high' ? 90 : (sig.severity === 'medium' ? 60 : 30));
        let structural_impact = sig.issue.includes("middle") || sig.issue.includes("peak") || sig.issue.includes("missing_peak") ? 80 : 40;
        let finalScore = (sevWeight * 0.4) + (structural_impact * 0.4) + (20); 
        sig.intent_adjusted_score = Math.min(100, Math.max(0, finalScore));
    });

    // STAGE 4 - SUPPRESSION
    adjustedSignals.forEach(sig => {
        if (sig.intent_adjusted_score < 30) {
            sig.suppressed = true;
            sig.suppression_reason = "Score too low (<30)";
        }
    });

    // STAGE 5 - RANKING
    let ranked = adjustedSignals.filter(s => !s.suppressed).sort((a, b) => b.intent_adjusted_score - a.intent_adjusted_score);

    // Filter duplicates
    let seenIssues = new Set();
    let uniqueRanked = [];
    for (let s of ranked) {
        if (!seenIssues.has(s.issue)) {
            seenIssues.add(s.issue);
            uniqueRanked.push(s);
        }
    }

    // STAGE 6 - OUTPUT
    return uniqueRanked.slice(0, 3);
}
