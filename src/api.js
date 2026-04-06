/**
 * Author Studio Pro — API Service Layer
 * All backend calls go through this module.
 * Implements request signing, error normalisation, and response caching.
 */

const API_BASE = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api'
import { loadApiKey, getDeviceFingerprint } from './utils/keyStorage'

// ─── Error normalisation ───────────────────────────────────────────────────
class APIError extends Error {
    constructor(message, status, detail) {
        super(message)
        this.name = 'APIError'
        this.status = status
        this.detail = detail
    }
}

async function fetchJSON(path, options = {}) {
    const headers = {
        'Accept': 'application/json',
        ...options.headers,
    }
    try {
        const res = await fetch(`${API_BASE}${path}`, { ...options, headers })
        if (!res.ok) {
            let detail = ''
            try { detail = (await res.json()).detail || '' } catch { }
            throw new APIError(`API error: ${res.status}`, res.status, detail)
        }
        return await res.json()
    } catch (e) {
        if (e.name === 'APIError') throw e;
        if (e.name === 'TypeError' && e.message === 'Failed to fetch') {
            throw new APIError('Network timeout or connection refused. Please ensure the backend server is running and reachable.', 0, 'Network Error')
        }
        throw e;
    }
}

async function fetchBlob(path, options = {}) {
    try {
        const res = await fetch(`${API_BASE}${path}`, options)
        if (!res.ok) {
            let detail = ''
            try { detail = (await res.json()).detail || '' } catch { }
            throw new APIError(`API error: ${res.status}`, res.status, detail)
        }
        return { blob: await res.blob(), headers: res.headers }
    } catch (e) {
        if (e.name === 'APIError') throw e;
        if (e.name === 'TypeError' && e.message === 'Failed to fetch') {
            throw new APIError('Network timeout or connection refused. Please ensure the backend server is running and reachable.', 0, 'Network Error')
        }
        throw e;
    }
}

// ─── Health ────────────────────────────────────────────────────────────────
export async function getHealth() {
    return fetchJSON('/health')
}

// ─── Templates ────────────────────────────────────────────────────────────
let templatesCache = null
export async function getTemplates() {
    if (templatesCache) return templatesCache
    templatesCache = await fetchJSON('/templates')
    return templatesCache
}

// ─── Genres ───────────────────────────────────────────────────────────────
let genresCache = null
export async function getGenres() {
    if (genresCache) return genresCache
    genresCache = await fetchJSON('/genres')
    return genresCache
}

export async function getMarketData(genreId) {
    return fetchJSON(`/market/${genreId}`)
}

export async function getWordCountAssessment(genreId, wordCount) {
    return fetchJSON(`/genre/${genreId}/word-count?word_count=${wordCount}`)
}

// ─── Format ───────────────────────────────────────────────────────────────
export async function formatManuscript({ file, author, title, templateKey, overrides, useAI, aiModel }) {
    const form = new FormData()
    form.append('file', file)
    form.append('author', author)
    form.append('title', title)
    form.append('template_key', templateKey || 'traditional')
    form.append('overrides', JSON.stringify(overrides || {}))
    form.append('use_ai', String(useAI || false))

    // Always pull key securely from keyStorage instead of args explicitly
    const localKey = loadApiKey(getDeviceFingerprint()) || ''
    form.append('api_key', localKey)
    form.append('ai_model', aiModel || 'mistralai/mistral-7b-instruct:free')

    const { blob, headers } = await fetchBlob('/format', { method: 'POST', body: form })

    return {
        blob,
        filename: _extractFilename(headers, 'formatted.docx'),
        wordCount: parseInt(headers.get('x-word-count') || '0'),
        warnings: JSON.parse(headers.get('x-warnings') || '[]'),
        aiFixes: JSON.parse(headers.get('x-ai-fixes') || '[]'),
        templateApplied: headers.get('x-template-applied'),
    }
}

// ─── Analyse ──────────────────────────────────────────────────────────────
export async function analyseManuscript({ file, genre, useAI, aiModel }) {
    const form = new FormData()
    form.append('file', file)
    form.append('genre', genre || 'literary_fiction')
    form.append('use_ai', String(useAI || false))

    const localKey = loadApiKey(getDeviceFingerprint()) || ''
    form.append('api_key', localKey)
    form.append('ai_model', aiModel || 'mistralai/mistral-7b-instruct:free')

    return fetchJSON('/analyse', { method: 'POST', body: form })
}

// ─── Query — Manual ───────────────────────────────────────────────────────
export async function generateQueryManual(payload) {
    const form = new FormData()
    form.append('data', JSON.stringify(payload))

    const { blob, headers } = await fetchBlob('/query/manual', { method: 'POST', body: form })
    return {
        blob,
        filename: _extractFilename(headers, 'submission_package.zip'),
    }
}

// ─── Query — AI ───────────────────────────────────────────────────────────
export async function generateQueryAI({ file, payload }) {
    const form = new FormData()
    form.append('file', file)

    const localKey = loadApiKey(getDeviceFingerprint()) || ''
    const updatedPayload = { ...payload, api_key: localKey }
    form.append('data', JSON.stringify(updatedPayload))

    const { blob, headers } = await fetchBlob('/query/ai', { method: 'POST', body: form })
    let storyIntelligence = null
    try { storyIntelligence = JSON.parse(headers.get('x-story-intelligence') || 'null') } catch { }

    return {
        blob,
        filename: _extractFilename(headers, 'AI_submission_package.zip'),
        storyIntelligence,
    }
}

// ─── Helpers ──────────────────────────────────────────────────────────────
function _extractFilename(headers, fallback = 'download') {
    const cd = headers.get('content-disposition') || ''
    const match = cd.match(/filename="([^"]+)"/)
    return match ? match[1] : fallback
}

export function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
}

// ─── Auth ─────────────────────────────────────────────────────────────────
export async function authRegister(email, password) {
    return fetchJSON('/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
    })
}

export async function authLogin(email, password) {
    return fetchJSON('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
    })
}

export async function authMe(token) {
    return fetchJSON('/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` },
    })
}

// ─── Payment ──────────────────────────────────────────────────────────────
export async function createOrder(planId, token) {
    return fetchJSON('/create-order', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ plan_id: planId }),
    })
}

export async function verifyPayment(paymentData, token) {
    return fetchJSON('/verify-payment', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(paymentData),
    })
}

// ─── AI Key Validation ────────────────────────────────────────────────────
export async function validateAIKey(apiKey, provider = 'openrouter') {
    return fetchJSON('/ai/validate-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: apiKey, provider }),
    })
}

export { APIError }

// ─── Analyse Text (browser-side parsing) ──────────────────────────────────
export async function analyseText({ rawText, chapters, totalWords, genre, useAI, apiKey, aiModel }) {
    return fetchJSON('/analyse-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            raw_text: rawText,
            chapters,
            total_words: totalWords,
            genre: genre || 'literary_fiction',
            use_ai: useAI || false,
            api_key: apiKey || '',
            ai_model: aiModel || 'deepseek/deepseek-chat:free',
        }),
    })
}

export async function formatText({ author, title, templateKey, overrides, chapters }) {
    const { blob, headers } = await fetchBlob('/format-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            author,
            title,
            template_key: templateKey || 'us_standard',
            overrides: overrides || {},
            chapters,
        }),
    })

    return {
        blob,
        filename: _extractFilename(headers, 'editor_export.docx'),
        wordCount: parseInt(headers.get('x-word-count') || '0'),
        warnings: JSON.parse(headers.get('x-warnings') || '[]'),
        aiFixes: JSON.parse(headers.get('x-ai-fixes') || '[]'),
        templateApplied: headers.get('x-template-applied'),
    }
}


// ─── Thinking Layer API  ──────────────────────────────────────────────────

function _authHeaders(token) {
    return { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
}

export async function getThinkingCaptures(projectId, token) {
    const url = projectId ? `/thinking/captures?project_id=${projectId}` : '/thinking/captures'
    return fetchJSON(url, { headers: _authHeaders(token) })
}

export async function createThinkingCapture(data, token) {
    return fetchJSON('/thinking/captures', { method: 'POST', headers: _authHeaders(token), body: JSON.stringify(data) })
}

export async function deleteThinkingCapture(id, token) {
    return fetchJSON(`/thinking/captures/${id}`, { method: 'DELETE', headers: _authHeaders(token) })
}

export async function getIdeas(projectId, token) {
    return fetchJSON(`/thinking/ideas/${projectId}`, { headers: _authHeaders(token) })
}

export async function createIdea(data, token) {
    return fetchJSON('/thinking/ideas', { method: 'POST', headers: _authHeaders(token), body: JSON.stringify(data) })
}

export async function updateIdea(id, data, token) {
    return fetchJSON(`/thinking/ideas/${id}`, { method: 'PUT', headers: _authHeaders(token), body: JSON.stringify(data) })
}

export async function deleteIdea(id, token) {
    return fetchJSON(`/thinking/ideas/${id}`, { method: 'DELETE', headers: _authHeaders(token) })
}

export async function createIdeaConnection(data, token) {
    return fetchJSON('/thinking/connections', { method: 'POST', headers: _authHeaders(token), body: JSON.stringify(data) })
}

export async function getWhatIfs(projectId, token) {
    return fetchJSON(`/thinking/whatifs/${projectId}`, { headers: _authHeaders(token) })
}

export async function createWhatIf(data, token) {
    return fetchJSON('/thinking/whatifs', { method: 'POST', headers: _authHeaders(token), body: JSON.stringify(data) })
}

export async function updateWhatIf(id, data, token) {
    return fetchJSON(`/thinking/whatifs/${id}`, { method: 'PUT', headers: _authHeaders(token), body: JSON.stringify(data) })
}

export async function deleteWhatIf(id, token) {
    return fetchJSON(`/thinking/whatifs/${id}`, { method: 'DELETE', headers: _authHeaders(token) })
}

export async function getThreads(projectId, token) {
    return fetchJSON(`/thinking/threads/${projectId}`, { headers: _authHeaders(token) })
}

export async function createThread(data, token) {
    return fetchJSON('/thinking/threads', { method: 'POST', headers: _authHeaders(token), body: JSON.stringify(data) })
}

export async function updateThread(id, data, token) {
    return fetchJSON(`/thinking/threads/${id}`, { method: 'PUT', headers: _authHeaders(token), body: JSON.stringify(data) })
}

export async function deleteThread(id, token) {
    return fetchJSON(`/thinking/threads/${id}`, { method: 'DELETE', headers: _authHeaders(token) })
}

export async function getBranches(projectId, token) {
    return fetchJSON(`/thinking/branches/${projectId}`, { headers: _authHeaders(token) })
}

export async function createBranch(data, token) {
    return fetchJSON('/thinking/branches', { method: 'POST', headers: _authHeaders(token), body: JSON.stringify(data) })
}

export async function updateBranch(id, data, token) {
    return fetchJSON(`/thinking/branches/${id}`, { method: 'PUT', headers: _authHeaders(token), body: JSON.stringify(data) })
}

export async function deleteBranch(id, token) {
    return fetchJSON(`/thinking/branches/${id}`, { method: 'DELETE', headers: _authHeaders(token) })
}

export async function createBranchPath(data, token) {
    return fetchJSON('/thinking/paths', { method: 'POST', headers: _authHeaders(token), body: JSON.stringify(data) })
}

export async function updateBranchPath(id, data, token) {
    return fetchJSON(`/thinking/paths/${id}`, { method: 'PUT', headers: _authHeaders(token), body: JSON.stringify(data) })
}

export async function deleteBranchPath(id, token) {
    return fetchJSON(`/thinking/paths/${id}`, { method: 'DELETE', headers: _authHeaders(token) })
}

export async function getGraveyard(projectId, token) {
    return fetchJSON(`/thinking/graveyard/${projectId}`, { headers: _authHeaders(token) })
}

export async function deleteGraveyardItem(id, token) {
    return fetchJSON(`/thinking/graveyard/${id}`, { method: 'DELETE', headers: _authHeaders(token) })
}

export async function emptyGraveyard(projectId, token) {
    return fetchJSON(`/thinking/graveyard/empty/${projectId}`, { method: 'DELETE', headers: _authHeaders(token) })
}

// ─── Story Graph API ──────────────────────────────────────────────────────

export async function loadNodes(projectId, token) {
    return fetchJSON(`/thinking/nodes/${projectId}`, { headers: _authHeaders(token) })
}

export async function saveNodes(projectId, nodes, token) {
    return fetchJSON('/thinking/nodes', {
        method: 'POST',
        headers: _authHeaders(token),
        body: JSON.stringify({ project_id: projectId, nodes }),
    })
}

export async function saveEdges(projectId, edges, token) {
    return fetchJSON('/thinking/edges', {
        method: 'POST',
        headers: _authHeaders(token),
        body: JSON.stringify({ project_id: projectId, edges }),
    })
}

export async function deleteNode(nodeId, token) {
    return fetchJSON(`/thinking/nodes/${nodeId}`, { method: 'DELETE', headers: _authHeaders(token) })
}

export async function deleteEdge(edgeId, token) {
    return fetchJSON(`/thinking/edges/${edgeId}`, { method: 'DELETE', headers: _authHeaders(token) })
}

