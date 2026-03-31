/**
 * Author Studio Pro — Browser-side DOCX parser using mammoth.js.
 * Extracts text, detects chapter headings, returns structured data.
 * The .docx binary never goes to the backend — only extracted text does.
 */

import mammoth from 'mammoth'

/**
 * Parse a .docx file in the browser.
 * @param {File} file - Browser File object
 * @returns {Promise<Object>} - Parsed data or {error: string}
 */
export async function parseDocx(file) {
    if (!file) return { error: 'No file provided' };
    if (!file.name?.toLowerCase().endsWith('.docx')) return { error: 'Only .docx files are supported' };
    if (file.size > 30 * 1024 * 1024) return { error: 'File too large. Maximum size is 30MB' };

    let buf;
    try {
        buf = await file.arrayBuffer();
    } catch {
        return { error: 'Could not read the file.' };
    }

    let result;
    try {
        result = await mammoth.extractRawText({ arrayBuffer: buf });
    } catch {
        return { error: 'File could not be parsed. Ensure it is a valid .docx file.' };
    }

    const lines = result.value.split('\n');
    const warnings = [];

    // ─── Chapter heading detection ──────────────────────────────────────────
    const chapterRegex = /^chapter\s+\w+/i;
    const numberedRegex = /^\d+\.\s/;

    function isChapterHeading(line) {
        const trimmed = line.trim();
        if (!trimmed) return false;
        if (chapterRegex.test(trimmed)) return true;
        if (trimmed === trimmed.toUpperCase() && trimmed.length >= 3 && trimmed.length <= 60 && !/[.!?]$/.test(trimmed)) return true;
        if (numberedRegex.test(trimmed) && trimmed.length < 60) return true;
        return false;
    }

    // ─── Build chapters ─────────────────────────────────────────────────────
    const chapters = [];
    let currentChapter = null;

    for (const line of lines) {
        const trimmed = line.trim();
        if (isChapterHeading(trimmed)) {
            if (currentChapter) chapters.push(currentChapter);
            currentChapter = { title: trimmed, paragraphs: [], wordCount: 0 };
        } else if (trimmed) {
            if (!currentChapter) {
                currentChapter = { title: 'Manuscript', paragraphs: [], wordCount: 0 };
            }
            currentChapter.paragraphs.push(trimmed);
            currentChapter.wordCount += trimmed.split(/\s+/).length;
        }
    }
    if (currentChapter) chapters.push(currentChapter);

    // Fallback: no chapters detected
    if (chapters.length === 0) {
        const allText = lines.filter(l => l.trim()).join('\n');
        chapters.push({
            title: 'Manuscript',
            paragraphs: lines.filter(l => l.trim()),
            wordCount: allText.split(/\s+/).length,
        });
    }

    // ─── Compute totals ─────────────────────────────────────────────────────
    const rawText = result.value;
    const totalWords = rawText.split(/\s+/).filter(Boolean).length;
    const totalParagraphs = chapters.reduce((sum, ch) => sum + ch.paragraphs.length, 0);

    if (chapters.length === 1 && chapters[0].title === 'Manuscript') {
        warnings.push('No chapter headings detected — treated as single document.');
    }
    if (totalWords < 1000) {
        warnings.push('Very short document — analysis may be limited.');
    }

    return {
        rawText,
        chapters,
        totalWords,
        totalParagraphs,
        totalChapters: chapters.length,
        warnings,
    };
}
