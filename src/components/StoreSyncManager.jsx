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
    const syncGraph = useStoryStore(state => state.syncGraph)

    // Debounced Graph Sync
    useEffect(() => {
        if (!projectId || !token || Object.keys(nodes).length === 0) return

        const timer = setTimeout(() => {
            syncGraph(token)
        }, 3000) // 3s debounce for background sync

        return () => clearTimeout(timer)
    }, [nodes, edges, projectId, token, syncGraph])

    return null // Invisible background component
}
