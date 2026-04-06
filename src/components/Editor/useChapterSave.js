/**
 * Author Studio Pro — Chapter auto-save hook + Sync Engine.
 * useChapterSave: Legacy hook, saves chapter content to IndexedDB every 5 seconds.
 * useSyncEngine: New debounced sync, subscribes to Zustand store and flushes 1s after last change.
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import { saveChapterDraft, loadChapterDraft } from '../../utils/localCache.js'
import { useStoryStore } from '../../store/storyStore.js'

// ─── Sync Engine (Phase 4) ──────────────────────────────────────────────────
// Subscribes to Zustand pendingChanges, debounces 1s for local flush.
// All dirty chapters written to IndexedDB in parallel.

const DEBOUNCE_LOCAL_MS = 1000

export function useSyncEngine(projectId) {
    const localTimer = useRef(null)
    const setSyncStatus = useStoryStore(state => state.setSyncStatus)

    const flushLocal = useCallback(async () => {
        const chapters = useStoryStore.getState().chapters
        const dirty = Object.values(chapters).filter(ch => ch.isDirty)
        if (dirty.length === 0) return

        setSyncStatus('saving')
        try {
            await Promise.all(dirty.map(ch =>
                saveChapterDraft(ch.id, ch.content)
                    .then(() => {
                        // Mark chapter clean in store after successful save
                        const current = useStoryStore.getState().chapters[ch.id]
                        if (current) {
                            useStoryStore.getState().markChapterClean(ch.id)
                        }
                    })
            ))
            setSyncStatus('idle', Date.now())
        } catch {
            setSyncStatus('error')
        }
    }, [setSyncStatus])

    useEffect(() => {
        const unsub = useStoryStore.subscribe(
            state => state.sync.pendingChanges,
            (pendingChanges) => {
                if (pendingChanges === 0) return
                if (localTimer.current) clearTimeout(localTimer.current)
                localTimer.current = setTimeout(flushLocal, DEBOUNCE_LOCAL_MS)
            }
        )
        return () => {
            unsub()
            if (localTimer.current) clearTimeout(localTimer.current)
        }
    }, [flushLocal])
}

// ─── Legacy Chapter Save Hook ───────────────────────────────────────────────
// Kept for backward compatibility — used by EditorLayout for restore-on-mount.

/**
 * @param {string} chapterId - Unique chapter identifier
 * @param {string} content - Current editor content
 * @param {Function} onRestore - Called with saved content on mount
 * @returns {{ lastSaved: number|null, saving: boolean, forceSave: Function }}
 */
export function useChapterSave(chapterId, content, onRestore) {
    const [lastSaved, setLastSaved] = useState(null)
    const [saving, setSaving] = useState(false)
    const contentRef = useRef(content)
    const lastSavedContentRef = useRef('')
    const timerRef = useRef(null)

    useEffect(() => {
        contentRef.current = content
    }, [content])

    // Restore on mount / chapter change
    useEffect(() => {
        if (!chapterId) return
        let cancelled = false
        loadChapterDraft(chapterId).then(cached => {
            if (cancelled) return
            if (cached?.content && onRestore) {
                onRestore(cached.content)
                lastSavedContentRef.current = cached.content
                setLastSaved(cached.savedAt || null)
            }
        }).catch(() => { })
        return () => { cancelled = true }
    }, [chapterId])

    // Auto-save every 5 seconds if content changed (legacy fallback)
    useEffect(() => {
        if (!chapterId) return
        timerRef.current = setInterval(async () => {
            const current = contentRef.current
            if (current && current !== lastSavedContentRef.current) {
                setSaving(true)
                try {
                    await saveChapterDraft(chapterId, current)
                    lastSavedContentRef.current = current
                    setLastSaved(Date.now())
                } catch {
                    // silently fail
                }
                setSaving(false)
            }
        }, 5000)

        return () => {
            if (timerRef.current) clearInterval(timerRef.current)
        }
    }, [chapterId])

    const forceSave = useCallback(async () => {
        if (!chapterId || !contentRef.current) return
        setSaving(true)
        try {
            await saveChapterDraft(chapterId, contentRef.current)
            lastSavedContentRef.current = contentRef.current
            setLastSaved(Date.now())
        } catch {
            // silently fail
        }
        setSaving(false)
    }, [chapterId])

    return { lastSaved, saving, forceSave }
}
