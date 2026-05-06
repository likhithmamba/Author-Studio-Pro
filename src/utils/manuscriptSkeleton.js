/**
 * Inkforge — Manuscript Skeleton Builder.
 * Builds a compressed text representation under 3,500 words for AI query generation.
 */

/**
 * @param {Array} chapters - Array from parseDocx: [{title, paragraphs, wordCount}, ...]
 * @returns {string} - Compressed manuscript skeleton
 */
export function buildSkeleton(chapters) {
    if (!chapters || chapters.length === 0) return '';

    let totalWords = 0;
    const parts = [];

    // ─── Opening: first 3 non-empty paragraphs of chapter 1 ────────────────
    const ch1 = chapters[0];
    if (ch1?.paragraphs?.length) {
        const opening = ch1.paragraphs.slice(0, 3).join('\n');
        const openingWords = opening.split(/\s+/).length;
        const truncatedOpening = openingWords > 1200
            ? opening.split(/\s+/).slice(0, 1200).join(' ')
            : opening;
        parts.push(`OPENING (first 3 paragraphs of "${ch1.title}"):\n${truncatedOpening}`);
        totalWords += Math.min(openingWords, 1200);
    }

    // ─── Chapter endings: last paragraph of each chapter ────────────────────
    const endings = [];
    for (const ch of chapters) {
        if (totalWords >= 3000) break;
        if (!ch.paragraphs?.length) continue;
        const lastPara = ch.paragraphs[ch.paragraphs.length - 1] || '';
        const paraWords = lastPara.split(/\s+/).length;
        if (totalWords + paraWords > 3500) break;
        endings.push(`${ch.title}: ${lastPara}`);
        totalWords += paraWords;
    }
    if (endings.length > 0) {
        parts.push(`\nCHAPTER ENDINGS:\n${endings.join('\n')}`);
    }

    // ─── Dialogue sample: first 4 lines with speech marks from ch1 ─────────
    if (ch1?.paragraphs) {
        const speechLines = ch1.paragraphs
            .filter(p => /["'\u201C\u201D]/.test(p))
            .slice(0, 4);
        if (speechLines.length > 0) {
            const dialogueSample = speechLines.join('\n');
            const dialogueWords = dialogueSample.split(/\s+/).length;
            if (totalWords + dialogueWords <= 3500) {
                parts.push(`\nDIALOGUE SAMPLE:\n${dialogueSample}`);
            }
        }
    }

    return parts.join('\n\n');
}
