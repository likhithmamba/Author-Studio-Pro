/**
 * Author Studio Pro — Chapter Hook Analyzer.
 * Classifies chapter endings and calculates hook strength.
 */

const CLIFFHANGER_WORDS = ['suddenly', 'before she could', 'before he could', 'without warning', 'but then'];
const REVELATION_WORDS = ['realized', 'realised', 'understood', 'knew now', 'had been', 'was actually', 'had always', 'had never told'];
const DECISION_WORDS = ['decided', 'would have to', 'no choice', 'had to choose', 'only one way'];
const EMOTIONAL_WORDS = ['devastated', 'elated', 'furious', 'terrified', 'betrayed', 'heartbroken', 'overwhelmed', 'destroyed'];

/**
 * Analyze chapter hooks (ending strength).
 * @param {Array} chapters - [{title, paragraphs}, ...]
 * @returns {{hooks: Array, strongCount: number, weakCount: number, strongPct: number}}
 */
export function analyzeHooks(chapters) {
    if (!chapters || !Array.isArray(chapters) || chapters.length === 0) {
        return { hooks: [], strongCount: 0, weakCount: 0, strongPct: 0 };
    }

    try {
        const hooks = [];

        for (const chapter of chapters) {
            if (!chapter.paragraphs?.length) continue;

            const nonEmpty = chapter.paragraphs.filter(p => p.trim());
            const lastParas = nonEmpty.slice(-3).join(' ');
            const lowerText = lastParas.toLowerCase();
            const lastParagraph = nonEmpty[nonEmpty.length - 1] || '';

            // Get last sentence
            const sentences = lastParas.split(/[.!?]+/).filter(s => s.trim());
            const lastSentence = sentences[sentences.length - 1]?.trim() || '';

            let hookType = 'weak';
            let score = 2;

            // Check cliffhanger
            const isCliffhanger = lastSentence.endsWith('?') ||
                CLIFFHANGER_WORDS.some(w => lowerText.includes(w)) ||
                lastSentence.split(/\s+/).length < 6;
            if (isCliffhanger) {
                hookType = 'cliffhanger';
                score = 10;
            }

            // Check revelation (only if not already classified higher)
            if (hookType === 'weak' && REVELATION_WORDS.some(w => lowerText.includes(w))) {
                hookType = 'revelation';
                score = 9;
            }

            // Check decision
            if (hookType === 'weak' && DECISION_WORDS.some(w => lowerText.includes(w))) {
                hookType = 'decision';
                score = 8;
            }

            // Check emotional
            if (hookType === 'weak') {
                const hasExclamation = lastParagraph.includes('!');
                const hasEmotionalWord = EMOTIONAL_WORDS.some(w => lowerText.includes(w));
                if (hasExclamation || hasEmotionalWord) {
                    hookType = 'emotional';
                    score = 7;
                }
            }

            hooks.push({
                chapterTitle: chapter.title,
                hookType,
                score,
                lastParagraph: lastParagraph.substring(0, 200),
            });
        }

        const strongCount = hooks.filter(h => h.score >= 7).length;
        const weakCount = hooks.filter(h => h.score < 7).length;
        const strongPct = hooks.length > 0 ? Math.round((strongCount / hooks.length) * 100) : 0;

        return { hooks, strongCount, weakCount, strongPct };
    } catch (err) {
        return { hooks: [], strongCount: 0, weakCount: 0, strongPct: 0, analysisError: err.message };
    }
}
