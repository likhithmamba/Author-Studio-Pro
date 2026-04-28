/**
 * Author Studio Pro — Local persistence via IndexedDB (idb-keyval).
 * All functions are async, wrapped in try/catch, and return null on failure.
 * If IndexedDB is unavailable (private browsing, quota), stub functions are used.
 */

let _idbModule = null;
let _initPromise = null;

function _init() {
    if (_initPromise) return _initPromise;
    _initPromise = import('idb-keyval')
        .then(mod => { _idbModule = mod; })
        .catch(() => { _idbModule = null; });
    return _initPromise;
}

async function safeGet(key) {
    try {
        await _init();
        if (!_idbModule) return undefined;
        return await _idbModule.get(key);
    } catch {
        return undefined;
    }
}

async function safeSet(key, value) {
    try {
        await _init();
        if (!_idbModule) return;
        await _idbModule.set(key, value);
    } catch {
        // silently fail
    }
}

async function safeDel(key) {
    try {
        await _init();
        if (!_idbModule) return;
        await _idbModule.del(key);
    } catch {
        // silently fail
    }
}

async function safeEntries() {
    try {
        await _init();
        if (!_idbModule) return [];
        return await _idbModule.entries();
    } catch {
        return [];
    }
}

// ─── Analysis Results ────────────────────────────────────────────────────────
export async function saveAnalysisResult(projectId, data) {
    await safeSet(`analysis:${projectId}`, { ...data, _savedAt: new Date().toISOString() });
}

export async function loadAnalysisResult(projectId) {
    const cached = await safeGet(`analysis:${projectId}`);
    return cached || null;
}

// ─── Draft Query ─────────────────────────────────────────────────────────────
export async function saveDraftQuery(projectId, formData) {
    if (formData === null) {
        await safeDel(`draft_query:${projectId}`);
        return;
    }
    await safeSet(`draft_query:${projectId}`, formData);
}

export async function loadDraftQuery(projectId) {
    const cached = await safeGet(`draft_query:${projectId}`);
    return cached || null;
}

// ─── Last Opened Project ────────────────────────────────────────────────────
export async function saveLastOpenedProject(projectId) {
    await safeSet('last_project', projectId);
}

export async function loadLastOpenedProject() {
    const id = await safeGet('last_project');
    return id || null;
}

// ─── Chapter Scroll Position ────────────────────────────────────────────────
export async function saveChapterScrollY(chapterId, y) {
    await safeSet(`scroll:${chapterId}`, y);
}

export async function loadChapterScrollY(chapterId) {
    const y = await safeGet(`scroll:${chapterId}`);
    return typeof y === 'number' ? y : 0;
}

// ─── Chapter Draft ──────────────────────────────────────────────────────────
export async function saveChapterDraft(chapterId, content) {
    await safeSet(`draft:${chapterId}`, { content, savedAt: Date.now() });
}

export async function loadChapterDraft(chapterId) {
    const cached = await safeGet(`draft:${chapterId}`);
    return cached || null;
}

// ─── Clear Project Cache ────────────────────────────────────────────────────
export async function clearProjectCache(projectId) {
    await safeDel(`analysis:${projectId}`);
    await safeDel(`draft_query:${projectId}`);
    try {
        const allEntries = await safeEntries();
        for (const [key] of allEntries) {
            if (typeof key === 'string' && (key.startsWith('scroll:') || key.startsWith('draft:'))) {
                await safeDel(key);
            }
        }
    } catch {
        // silently fail
    }
}

// ─── Shared Manuscript ───────────────────────────────────────────────────────
export async function saveManuscript(data) {
    // data: { filename, parsed, wordCount, file? (File object) }
    const toStore = {
        filename: data.filename,
        parsed: data.parsed,
        wordCount: data.wordCount,
        lastUploaded: new Date().toISOString(),
    };
    // Store the original .docx binary so AI query can send a real .docx later
    if (data.file && data.file instanceof File) {
        try {
            toStore.fileBuffer = await data.file.arrayBuffer();
            toStore.fileType = data.file.type || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        } catch {
            // Can't read file — store without binary
        }
    }
    await safeSet('shared_manuscript', toStore);
}

export async function loadManuscript() {
    const cached = await safeGet('shared_manuscript');
    return cached || null;
}

/**
 * Retrieve the original .docx File from IndexedDB cache.
 * Returns a File object suitable for FormData upload, or null.
 */
export async function loadManuscriptFile() {
    const cached = await safeGet('shared_manuscript');
    if (!cached || !cached.fileBuffer) return null;
    try {
        const blob = new Blob([cached.fileBuffer], {
            type: cached.fileType || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        });
        return new File([blob], cached.filename || 'manuscript.docx', { type: blob.type });
    } catch {
        return null;
    }
}

// ─── Cache Size ─────────────────────────────────────────────────────────────
export async function getCacheSize() {
    const allEntries = await safeEntries();
    return allEntries.length;
}
