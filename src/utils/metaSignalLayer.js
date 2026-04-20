export function mergeToMetaSignals(signals) {
    if (!signals || signals.length === 0) return [];

    let clusters = [];
    let usedIds = new Set();

    for (let i = 0; i < signals.length; i++) {
        if (usedIds.has(signals[i].id)) continue;

        let cluster = [signals[i]];
        usedIds.add(signals[i].id);

        for (let j = i + 1; j < signals.length; j++) {
            if (usedIds.has(signals[j].id)) continue;

            const s1 = signals[i];
            const s2 = signals[j];

            let overlaps = 0;
            
            // region overlap
            const r1 = s1.region?.chapterIds || [];
            const r2 = s2.region?.chapterIds || [];
            const regionOverlap = r1.some(c => r2.includes(c));
            if (regionOverlap) overlaps++;

            // character overlap
            const c1 = s1.characters || [];
            const c2 = s2.characters || [];
            const charOverlap = c1.some(c => c2.includes(c));
            if (charOverlap) overlaps++;

            // phase overlap
            if (s1.progression_phase === s2.progression_phase) overlaps++;

            // CLUSTERING RULE
            if (overlaps >= 2) {
                cluster.push(s2);
                usedIds.add(s2.id);
            }
        }
        clusters.push(cluster);
    }

    const metaSignals = clusters.map(cluster => {
        if (cluster.length === 1) {
            return {
                ...cluster[0],
                is_meta: false
            };
        }

        const allChapters = new Set();
        const allChars = new Set();
        let maxScore = 0;

        cluster.forEach(s => {
            (s.region?.chapterIds || []).forEach(c => allChapters.add(c));
            (s.characters || []).forEach(c => allChars.add(c));
            if (s.intent_adjusted_score > maxScore) maxScore = s.intent_adjusted_score;
        });

        const compositeScore = Math.min(100, maxScore * 1.2);
        const sourceIds = cluster.map(s => s.id);
        const dominantPhase = cluster[0].progression_phase;

        let newSeverity = 'low';
        if (compositeScore >= 80) newSeverity = 'high';
        else if (compositeScore >= 50) newSeverity = 'medium';

        return {
            id: `meta_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            is_meta: true,
            source_signals: sourceIds,
            title: `Structural Clustering: ${dominantPhase.toUpperCase()} Phase`,
            region: { chapterIds: Array.from(allChapters) },
            characters: Array.from(allChars),
            progression_phase: dominantPhase,
            composite_score: compositeScore,
            severity: newSeverity,
            root_cause: `Multiple foundational issues exist in the ${dominantPhase} phase impacting pacing and character arcs.`,
            narrative_impact: `Readers will likely feel disengaged due to compounding structural friction involving ${Array.from(allChars).join(', ')} in this section.`,
            directional_fix: "Perform a structural edit passing over this unified cluster, focusing on tightening pacing while solidifying character intents."
        };
    });

    return metaSignals;
}
