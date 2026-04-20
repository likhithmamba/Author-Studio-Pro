export function buildIntentConfig(projectMeta) {
    const type = projectMeta?.storyType || 'literary';
    const config = {
        storyType: type,
        expectedConflictByPhase: {
            setup: { min: 0.1, max: 0.4 },
            escalation: { min: 0.4, max: 0.8 },
            peak: { min: 0.7, max: 1.0 },
            resolution: { min: 0.0, max: 0.5 },
        }
    };
    
    if (type === 'thriller' || type === 'action') {
        config.expectedConflictByPhase = {
            setup: { min: 0.4, max: 0.6 },
            escalation: { min: 0.6, max: 0.9 },
            peak: { min: 0.8, max: 1.0 },
            resolution: { min: 0.2, max: 0.6 },
        };
    } else if (type === 'slow_burn' || type === 'romance') {
        config.expectedConflictByPhase = {
            setup: { min: 0.0, max: 0.2 },
            escalation: { min: 0.2, max: 0.6 },
            peak: { min: 0.6, max: 0.9 },
            resolution: { min: 0.0, max: 0.3 },
        };
    }
    
    return config;
}

export function applyIntentAdjustment(signal, storeSnapshot, intentConfig) {
    const phase = signal.progression_phase || 'setup';
    let adjustedScore = signal.raw_score || 50;
    
    // Pacing rules
    if (signal.type === 'pacing' && phase === 'setup' && intentConfig.storyType === 'slow_burn') {
        adjustedScore -= 30; 
    }
    
    // Arc rules
    if (signal.type === 'arc' && phase === 'setup') {
        adjustedScore -= 20;
        if (adjustedScore < 30) {
            signal.suppressed = true;
            signal.suppression_reason = "Intentional in setup phase";
        }
    }
    
    // Spec phase-aware modifiers
    if (phase === 'setup' && signal.issue && signal.issue.includes('flat arc')) {
        signal.suppressed = true;
        signal.suppression_reason = "Intentional in setup phase";
    }
    
    if (phase === 'escalation' && signal.issue && signal.issue.includes('flat_middle')) {
        adjustedScore += 30;
        signal.severity = 'high';
    }
    
    if (phase === 'peak' && signal.issue && signal.issue.includes('missing_peak')) {
        adjustedScore = 100;
        signal.severity = 'critical';
    }
    
    if (phase === 'resolution' && signal.issue && signal.issue.includes('unresolved conflict')) {
        adjustedScore += 30;
        signal.severity = 'high';
    }
    
    adjustedScore = Math.min(100, Math.max(0, adjustedScore));
    let newSeverity = signal.severity;
    
    // Re-calibrate severity unless it's designated critical
    if (newSeverity !== 'critical') {
        if (adjustedScore >= 80) newSeverity = 'high';
        else if (adjustedScore >= 50) newSeverity = 'medium';
        else newSeverity = 'low';
    }
    
    return {
        ...signal,
        intent_adjusted_score: adjustedScore,
        severity: newSeverity,
        suppressed: signal.suppressed || false,
        suppression_reason: signal.suppression_reason || null
    };
}
