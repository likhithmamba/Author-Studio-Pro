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
    const res = await fetch(`${API_BASE}${path}`, { ...options, headers })
    if (!res.ok) {
        let detail = ''
        try { detail = (await res.json()).detail || '' } catch { }
        throw new APIError(`API error: ${res.status}`, res.status, detail)
    }
    return res.json()
}

async function fetchBlob(path, options = {}) {
    const res = await fetch(`${API_BASE}${path}`, options)
    if (!res.ok) {
        let detail = ''
        try { detail = (await res.json()).detail || '' } catch { }
        throw new APIError(`API error: ${res.status}`, res.status, detail)
    }
    return { blob: await res.blob(), headers: res.headers }
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
    form.append('template_key', templateKey || 'us_standard')
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
        templateApplied: headers.get('x-template-applied'),
    }
}

// ─── Analyse ──────────────────────────────────────────────────────────────
export async function analyseManuscript({ file, genre, useAI, aiModel }) {
    const form = new FormData()
    form.append('file', file)
    form.append('genre', genre || 'literary')
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
