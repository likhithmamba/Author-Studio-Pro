/**
 * Author Studio Pro — Query Letter Confidence Scorer.
 * 5-dimension scoring with actionable feedback. No competitor has this.
 */

const CONSEQUENCE_PHRASES = ['must', 'forces', 'when', 'after', 'unless', 'or', 'before'];
const STAKES_WORDS = ['must', 'before', 'or', 'unless', 'risks', 'threatens', 'everything', 'only chance', 'no choice', 'will die', 'will lose', 'will never'];
const TOO_FAMOUS = ['stephen king', 'j.k. rowling', 'tolkien', 'j.r.r. tolkien', 'jk rowling'];

/**
 * Score a query letter on 5 dimensions.
 * @param {string} queryText - The query letter text
 * @param {number[]} compYears - Years of comp titles (e.g., [2019, 2012])
 * @returns {Object} - {total, outOf, breakdown, feedback}
 */
export function scoreQuery(queryText, compYears = []) {
    if (!queryText || typeof queryText !== 'string' || queryText.trim().split(/\s+/).length < 50) {
        return {
            total: 0,
            outOf: 50,
            breakdown: { hookStrength: 0, conflictClarity: 0, stakesExplicitness: 0, compScore: 0, lengthScore: 0 },
            feedback: ['Query text is too short to score.'],
        };
    }

    const text = queryText.trim();
    const words = text.split(/\s+/);
    const wordCount = words.length;
    const lowerText = text.toLowerCase();
    const feedback = [];

    // ─── 1. Hook Strength (0-10) ────────────────────────────────────────────
    let hookStrength = 0;
    try {
        // Get first sentence (>4 words, ends with . ! ?)
        const sentences = text.split(/(?<=[.!?])\s+/);
        const firstSentence = sentences.find(s => s.split(/\s+/).length > 4) || sentences[0] || '';
        const fsWords = firstSentence.split(/\s+/);
        const fsLower = firstSentence.toLowerCase();

        // Has proper noun (title-case word not at start)
        const hasProperNoun = fsWords.slice(1).some(w => /^[A-Z][a-z]/.test(w));
        if (hasProperNoun) hookStrength += 3;

        // Has action verb (present tense, not linking)
        const linkingVerbs = ['is', 'are', 'was', 'were', 'has', 'have', 'had', 'be', 'been', 'being'];
        const hasActionVerb = fsWords.some(w => {
            const lower = w.toLowerCase().replace(/[^a-z]/g, '');
            return lower.endsWith('s') && !linkingVerbs.includes(lower) && lower.length > 3;
        });
        if (hasActionVerb) hookStrength += 3;

        // Has consequence phrase
        const hasConsequence = CONSEQUENCE_PHRASES.some(p => fsLower.includes(p));
        if (hasConsequence) hookStrength += 4;

        // Penalty: too long
        if (fsWords.length > 35) hookStrength -= 3;
        hookStrength = Math.max(0, Math.min(10, hookStrength));

        if (hookStrength < 7) {
            feedback.push('Hook: No consequence phrase found in the first sentence. Add a phrase like "must", "forces", or "unless" to show what is at stake.');
        }
    } catch {
        hookStrength = 0;
        feedback.push('Could not score hook — check for unusual formatting.');
    }

    // ─── 2. Conflict Clarity (0-10) ─────────────────────────────────────────
    let conflictClarity = 5;
    try {
        if (lowerText.includes('must')) conflictClarity += 2;

        const first150 = words.slice(0, 150).join(' ').toLowerCase();
        if (['but', 'until', 'however'].some(w => first150.includes(w))) conflictClarity += 2;

        // Passive voice penalty
        const passiveMatches = (lowerText.match(/\bwas\s+\w+ed\b/g) || []).length +
                               (lowerText.match(/\bwere\s+\w+ed\b/g) || []).length;
        conflictClarity -= Math.min(passiveMatches, 4);
        conflictClarity = Math.max(0, Math.min(10, conflictClarity));

        if (conflictClarity < 7) {
            feedback.push('Conflict: The opposition or obstacle is unclear. Use "but" or "however" early to set up what opposes the protagonist.');
        }
    } catch {
        conflictClarity = 0;
        feedback.push('Could not score conflict clarity — check for unusual formatting.');
    }

    // ─── 3. Stakes Explicitness (0-10) ──────────────────────────────────────
    let stakesExplicitness = 0;
    try {
        let stakesCount = 0;
        for (const phrase of STAKES_WORDS) {
            if (lowerText.includes(phrase)) stakesCount++;
        }
        stakesExplicitness = Math.min(stakesCount * 2, 10);

        if (stakesExplicitness < 7) {
            feedback.push('Stakes: The consequences of failure are not explicit enough. Add phrases like "or", "unless", "risks", or "will lose" to make stakes visceral.');
        }
    } catch {
        stakesExplicitness = 0;
        feedback.push('Could not score stakes — check for unusual formatting.');
    }

    // ─── 4. Comp Score (0-10) ───────────────────────────────────────────────
    let compScore = 0;
    try {
        const currentYear = new Date().getFullYear();
        if (!compYears || compYears.length === 0) {
            compScore = 1;
        } else if (compYears.length === 1) {
            compScore = 5;
        } else {
            compScore = 8;
        }

        // Penalty for old comps
        for (const year of (compYears || [])) {
            if (year && currentYear - year > 5) compScore -= 3;
        }

        // Penalty for too-famous comps
        for (const name of TOO_FAMOUS) {
            if (lowerText.includes(name)) compScore -= 2;
        }

        compScore = Math.max(0, Math.min(10, compScore));

        if (compScore < 7) {
            feedback.push('Comps: Use 2 recent comp titles (published within the last 5 years) and avoid mega-famous authors like Stephen King or Tolkien.');
        }
    } catch {
        compScore = 0;
        feedback.push('Could not score comps — check your comparable titles.');
    }

    // ─── 5. Length Score (0-10) ──────────────────────────────────────────────
    let lengthScore = 1;
    try {
        if (wordCount >= 250 && wordCount <= 350) lengthScore = 10;
        else if ((wordCount >= 200 && wordCount < 250) || (wordCount > 350 && wordCount <= 400)) lengthScore = 7;
        else if ((wordCount >= 150 && wordCount < 200) || (wordCount > 400 && wordCount <= 500)) lengthScore = 4;

        if (lengthScore < 7) {
            feedback.push(`Length: Your query is ${wordCount} words. Agents prefer 250-350 words. ${wordCount < 250 ? 'Add more detail about stakes and conflict.' : 'Trim background details and focus on the hook.'}`);
        }
    } catch {
        lengthScore = 1;
    }

    const total = hookStrength + conflictClarity + stakesExplicitness + compScore + lengthScore;

    return {
        total,
        outOf: 50,
        breakdown: { hookStrength, conflictClarity, stakesExplicitness, compScore, lengthScore },
        feedback,
    };
}
