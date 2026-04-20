export function calculateProgressionCurve(storeSnapshot) {
    const { chapters = {}, chapterOrder = [], nodes = {}, conflictStates = {}, progressionMarkers = [] } = storeSnapshot;
    
    if (chapterOrder.length === 0) {
        return { chapterCurves: [], detectedIssues: [], phaseAssignments: { setup: [], escalation: [], peak: [], resolution: [] } };
    }

    const totalChapters = chapterOrder.length;
    const totalEventsAcrossNovel = Object.values(nodes).filter(n => n.node_type === 'event').length;
    const avgEventsPerChapter = totalChapters > 0 ? (totalEventsAcrossNovel / totalChapters) || 1 : 1;

    let chapterCurves = [];
    let detectedIssues = [];
    let phaseAssignments = { setup: [], escalation: [], peak: [], resolution: [] };

    // Grp
    const markersByChapter = {};
    const eventsByChapter = {};
    chapterOrder.forEach(chId => {
        markersByChapter[chId] = [];
        eventsByChapter[chId] = [];
    });

    (progressionMarkers || []).forEach(m => {
        if (m.chapter_id && markersByChapter[m.chapter_id] !== undefined) {
            markersByChapter[m.chapter_id].push(m);
        }
    });

    Object.values(nodes).filter(n => n.node_type === 'event').forEach(n => {
        const refs = n.chapter_refs || [];
        refs.forEach(chId => {
            if (eventsByChapter[chId] !== undefined) eventsByChapter[chId].push(n);
        });
        if (n.chapter_id && eventsByChapter[n.chapter_id] !== undefined) {
            eventsByChapter[n.chapter_id].push(n);
        }
    });

    let cumulativeTotalConflicts = 0;
    const allConflicts = Object.values(conflictStates || {});

    chapterOrder.forEach((chapterId, idx) => {
        const pct = (idx / totalChapters) * 100;
        
        // Setup Density
        const marks = markersByChapter[chapterId] || [];
        const setupCount = marks.filter(m => m.phase === 'setup').length;
        const setupDensity = marks.length > 0 ? setupCount / marks.length : 0;

        // Conflict intensity
        const activeConfs = allConflicts.filter(c => c.chapter_id === chapterId && (c.status === 'active' || c.status === 'escalating'));
        const unresolvedConfsCount = allConflicts.filter(c => ['active', 'escalating'].includes(c.status)).length; 
        
        cumulativeTotalConflicts += activeConfs.length;

        let intensitySum = 0;
        activeConfs.forEach(c => intensitySum += (c.intensity || 0));
        const conflictIntensity = activeConfs.length > 0 ? intensitySum / activeConfs.length : 0;

        // Event Frequency
        const evtsCount = (eventsByChapter[chapterId] || []).length;
        const eventFrequency = evtsCount / avgEventsPerChapter;

        // Resolution Pressure
        const resolutionPressure = cumulativeTotalConflicts > 0 ? (unresolvedConfsCount / cumulativeTotalConflicts) : 0;

        chapterCurves.push({
            chapterId,
            index: idx,
            pct,
            setup_density: setupDensity,
            conflict_intensity: conflictIntensity,
            event_frequency: eventFrequency,
            resolution_pressure: resolutionPressure
        });

        // Phase Assignment
        let dominantPhase = 'setup';
        if (marks.length > 0) {
            const pc = {"setup": 0, "escalation": 0, "peak": 0, "resolution": 0};
            marks.forEach(m => pc[m.phase] = (pc[m.phase]||0) + 1);
            dominantPhase = Object.keys(pc).reduce((a, b) => pc[a] > pc[b] ? a : b);
        } else {
            if (pct < 25) dominantPhase = 'setup';
            else if (pct < 75) dominantPhase = 'escalation';
            else if (pct < 90) dominantPhase = 'peak';
            else dominantPhase = 'resolution';
        }
        if (phaseAssignments[dominantPhase]) phaseAssignments[dominantPhase].push(chapterId);
    });

    // MISSING PEAK
    if (!chapterCurves.some(c => c.conflict_intensity > 0.8)) {
        detectedIssues.push('missing_peak');
    }

    // FLAT MIDDLE
    const middleChaps = chapterCurves.filter(c => c.pct >= 30 && c.pct <= 70);
    let flatCount = 0;
    for (let i = 1; i < middleChaps.length; i++) {
        if (Math.abs(middleChaps[i].conflict_intensity - middleChaps[i-1].conflict_intensity) < 0.1) {
            flatCount++;
            if (flatCount >= 2) {
                detectedIssues.push('flat_middle');
                break;
            }
        } else {
            flatCount = 0;
        }
    }

    // WEAK ESCALATION
    const ch50 = chapterCurves.find(c => c.pct >= 50);
    const ch75 = chapterCurves.find(c => c.pct >= 75);
    if (ch50 && ch75 && ch75.conflict_intensity < ch50.conflict_intensity) {
        detectedIssues.push('weak_escalation');
    }

    // EARLY RESOLUTION
    const before85 = chapterCurves.filter(c => c.pct < 85 && c.pct > 50);
    if (before85.length > 0 && before85.some(c => c.resolution_pressure === 0)) {
        if (cumulativeTotalConflicts > 0) {
            detectedIssues.push('early_resolution');
        }
    }

    return {
        chapterCurves,
        detectedIssues,
        phaseAssignments
    };
}
