import { useEffect } from 'react'
import { useStoryStore } from '../store/storyStore'
import { useAuth } from '../contexts/AuthContext'

/**
 * StoreSyncManager — Background component that handles persisting 
 * the Zustand storyStore to the Supabase backend.
 * 
 * It watches for changes in nodes and edges and triggers 
 * a debounced save to ensure the Story Graph is always up-to-date.
 */
export default function StoreSyncManager() {
    const { token } = useAuth()
    const projectId = useStoryStore(state => state.projectId)
    const nodes = useStoryStore(state => state.nodes)
    const edges = useStoryStore(state => state.edges)
    const chapters = useStoryStore(state => state.chapters)
    const chapterOrder = useStoryStore(state => state.chapterOrder)
    const pendingChanges = useStoryStore(state => state.sync.pendingChanges)
    const syncGraph = useStoryStore(state => state.syncGraph)
    const syncManuscript = useStoryStore(state => state.syncManuscript)

    // Debounced Graph Sync — only when there are actual pending changes
    useEffect(() => {
        if (!projectId || !token || pendingChanges === 0) return

        const timer = setTimeout(() => {
            syncGraph(token)
        }, 3000)

        return () => clearTimeout(timer)
    }, [projectId, token, pendingChanges, syncGraph])

    // Debounced Manuscript Sync — only when there are actual pending changes
    useEffect(() => {
        if (!projectId || !token || Object.keys(chapters).length === 0 || pendingChanges === 0) return

        const timer = setTimeout(() => {
            syncManuscript(token)
        }, 5000) // 5s debounce for heavier manuscript sync

        return () => clearTimeout(timer)
    }, [chapters, chapterOrder, projectId, token, pendingChanges, syncManuscript])

    return null // Invisible background component
}
