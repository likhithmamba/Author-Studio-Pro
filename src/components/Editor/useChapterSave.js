/**
 * Author Studio Pro — Chapter auto-save hook.
 * Saves chapter content to IndexedDB every 5 seconds while typing.
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import { saveChapterDraft, loadChapterDraft } from '../../utils/localCache.js'

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

    // Auto-save every 5 seconds if content changed
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
