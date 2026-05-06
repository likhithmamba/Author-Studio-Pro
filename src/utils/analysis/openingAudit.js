/**
 * Inkforge — Opening Page Audit.
 * 7-condition audit of the first 1,000 words. Catches agent red flags.
 */

const WEATHER_WORDS = ['rain', 'sun', 'cloud', 'wind', 'sky', 'storm', 'fog', 'snow', 'mist'];
const BACKSTORY_PHRASES = ['had been', 'had known', 'had always', 'had never'];
const TENSION_WORDS = ['but', 'however', 'wrong', 'strange', 'odd', 'problem', 'suddenly', 'must', 'never'];

/**
 * Audit the opening of a manuscript.
 * @param {string} openingText - First ~1,000 words of the manuscript
 * @returns {{score: number, flags: Array, verdict: string}}
 */
export function auditOpening(openingText) {
    if (!openingText || typeof openingText !== 'string' || openingText.trim().length < 50) {
        return { score: 100, flags: [], verdict: 'Not enough text to audit.' };
    }

    try {
        const text = openingText.trim();
        const words = text.split(/\s+/);
        const truncated = words.slice(0, 1000).join(' ');
        const lowerText = truncated.toLowerCase();
        const first200 = lowerText.substring(0, 200);
        const first500Words = words.slice(0, 500).join(' ').toLowerCase();

        // Get first sentence
        const firstSentenceMatch = truncated.match(/^[^.!?]+[.!?]/);
        const firstSentence = firstSentenceMatch ? firstSentenceMatch[0].toLowerCase() : lowerText.substring(0, 100);

        const flags = [];

        // 1. Dream opening (critical)
        if (/\bwoke\b/.test(first200) || /\bdream\b/.test(first200)) {
            flags.push({
                type: 'dream_opening',
                found: true,
                quote: first200.substring(0, 60),
                severity: 'critical',
            });
        }

        // 2. Weather opening (high)
        if (WEATHER_WORDS.some(w => firstSentence.includes(w))) {
            flags.push({
                type: 'weather_opening',
                found: true,
                quote: firstSentence.substring(0, 60),
                severity: 'high',
            });
        }

        // 3. Wake-up opening (critical)
        if (first200.includes('woke up') || (first200.includes('alarm') && first200.includes('bed'))) {
            flags.push({
                type: 'wakeup_opening',
                found: true,
                quote: first200.substring(0, 60),
                severity: 'critical',
            });
        }

        // 4. No named character (high)
        const titleCaseWords = words.slice(0, 500)
            .filter((w, i) => i > 0 && /^[A-Z][a-z]/.test(w))
            .map(w => w.replace(/[^a-zA-Z]/g, ''));
        const nameCounts = {};
        for (const w of titleCaseWords) {
            nameCounts[w] = (nameCounts[w] || 0) + 1;
        }
        const hasNamedChar = Object.values(nameCounts).some(c => c > 2);
        if (!hasNamedChar) {
            flags.push({
                type: 'no_named_character',
                found: true,
                quote: 'No character name appears more than twice in the first 500 words.',
                severity: 'high',
            });
        }

        // 5. No dialogue (medium)
        if (!/["'\u201C\u201D]/.test(truncated)) {
            flags.push({
                type: 'no_dialogue',
                found: true,
                quote: 'No speech marks found in the opening.',
                severity: 'medium',
            });
        }

        // 6. Heavy backstory (high)
        let backstoryCount = 0;
        for (const phrase of BACKSTORY_PHRASES) {
            const matches = first500Words.split(phrase).length - 1;
            backstoryCount += matches;
        }
        if (backstoryCount > 3) {
            flags.push({
                type: 'heavy_backstory',
                found: true,
                quote: `Found ${backstoryCount} past-perfect constructions ("had been", "had known", etc.)`,
                severity: 'high',
            });
        }

        // 7. No tension (medium)
        const hasTension = TENSION_WORDS.some(w => first500Words.includes(w));
        if (!hasTension) {
            flags.push({
                type: 'no_tension',
                found: true,
                quote: 'No conflict or tension markers found in the first 500 words.',
                severity: 'medium',
            });
        }

        // ─── Scoring ────────────────────────────────────────────────────────
        let score = 100;
        for (const flag of flags) {
            if (flag.severity === 'critical') score -= 25;
            else if (flag.severity === 'high') score -= 15;
            else if (flag.severity === 'medium') score -= 8;
        }
        score = Math.max(0, score);

        let verdict;
        if (score >= 85) verdict = 'Strong opening';
        else if (score >= 70) verdict = 'Good, minor issues';
        else if (score >= 50) verdict = 'Needs revision';
        else verdict = 'Significant issues found';

        return { score, flags, verdict };
    } catch (err) {
        return { score: 0, flags: [], verdict: 'Audit error', analysisError: err.message };
    }
}
