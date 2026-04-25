/**
 * Author Studio Pro — Zustand State Store
 * Single runtime source of truth for chapters, story nodes, edges, and sync status.
 * WritingSystemContext continues to handle UI state (panel open/closed, active tab, etc.)
 */

import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'

export const useStoryStore = create(
  subscribeWithSelector((set, get) => ({

    // ─── Project ──────────────────────────────────────────────────────
    projectId: null,
    projectTitle: 'Untitled Novel',

    // ─── Chapters (by-id map + ordered list) ──────────────────────────
    chapters: {},
    chapterOrder: [],

    // ─── Story Graph ──────────────────────────────────────────────────
    nodes: {},
    edges: [],

    // ─── SSO Extended Data ────────────────────────────────────────────
    characterStates: {},
    conflictStates: {},
    progressionMarkers: [],

    // ─── Midnight Chronicle Editor Data ───────────────────────────────
    scenes: {},
    sceneOrder: [],
    characters: {},
    locations: {},
    timelineEvents: [],
    researchNotes: [],

    // ─── Editor State ─────────────────────────────────────────────────
    editor: {
      activeChapterId: null,
      isTyping: false,
      wordCount: 0,
    },

    // ─── Sync State ───────────────────────────────────────────────────
    sync: {
      status: 'idle',        // 'idle' | 'saving' | 'error'
      lastSaved: null,
      pendingChanges: 0,
    },

    isRehydrating: false,

    // ─── Actions ──────────────────────────────────────────────────────

    setProject: (id, title) => set({ projectId: id, projectTitle: title }),

    loadChapters: (chapters) => {
      const byId = {}
      const order = []
      chapters.forEach(ch => {
        byId[ch.id] = { ...ch, isDirty: false }
        order.push(ch.id)
      })
      set({ chapters: byId, chapterOrder: order })
    },

    setActiveChapter: (id) =>
      set(state => ({ editor: { ...state.editor, activeChapterId: id } })),

    updateChapterContent: (id, content, wordCount) =>
      set(state => ({
        chapters: {
          ...state.chapters,
          [id]: { ...state.chapters[id], content, wordCount, isDirty: true }
        },
        editor: { ...state.editor, wordCount },
        sync: { ...state.sync, pendingChanges: state.sync.pendingChanges + 1 }
      })),

    addChapter: (title) => set(state => {
      const id = `ch_${Date.now()}`
      const newOrder = state.chapterOrder.length
      return {
        chapters: { ...state.chapters, [id]: { id, title, content: '', wordCount: 0, order: newOrder } },
        chapterOrder: [...state.chapterOrder, id],
        editor: { ...state.editor, activeChapterId: id }
      }
    }),

    removeChapter: (id) => set(state => {
      if (state.chapterOrder.length <= 1) return state
      const { [id]: removed, ...remain } = state.chapters
      const newOrder = state.chapterOrder.filter(cid => cid !== id)
      const newActive = state.editor.activeChapterId === id ? newOrder[0] : state.editor.activeChapterId
      return { chapters: remain, chapterOrder: newOrder, editor: { ...state.editor, activeChapterId: newActive } }
    }),

    reorderChapters: (newOrder) => set({ chapterOrder: newOrder }),

    updateChapterTitle: (id, title) =>
      set(state => ({
        chapters: {
          ...state.chapters,
          [id]: { ...state.chapters[id], title }
        }
      })),

    // ─── Story Graph Actions ──────────────────────────────────────────

    upsertNode: (node) =>
      set(state => ({
        nodes: { ...state.nodes, [node.id]: { node_type: 'event', confidence_score: 0.8, ...node } }
      })),

    upsertCharacterState: (stateUpdate) =>
      set(state => ({
        characterStates: { ...state.characterStates, [stateUpdate.character_id]: { ...state.characterStates[stateUpdate.character_id], ...stateUpdate } },
        sync: { ...state.sync, pendingChanges: state.sync.pendingChanges + 1 }
      })),

    upsertConflictState: (conflictUpdate) =>
      set(state => ({
        conflictStates: { ...state.conflictStates, [conflictUpdate.conflict_id]: { ...state.conflictStates[conflictUpdate.conflict_id], ...conflictUpdate } },
        sync: { ...state.sync, pendingChanges: state.sync.pendingChanges + 1 }
      })),

    addProgressionMarker: (marker) =>
      set(state => ({
        progressionMarkers: [...state.progressionMarkers.filter(m => m.marker_id !== marker.marker_id), marker],
        sync: { ...state.sync, pendingChanges: state.sync.pendingChanges + 1 }
      })),

    removeProgressionMarker: (markerId) =>
      set(state => ({
        progressionMarkers: state.progressionMarkers.filter(m => m.marker_id !== markerId),
        sync: { ...state.sync, pendingChanges: state.sync.pendingChanges + 1 }
      })),

    removeNode: (nodeId) =>
      set(state => {
        const { [nodeId]: _, ...rest } = state.nodes
        return {
          nodes: rest,
          edges: state.edges.filter(e => e.source !== nodeId && e.target !== nodeId)
        }
      }),

    addEdge: (edge) =>
      set(state => ({ edges: [...state.edges, edge] })),

    removeEdge: (edgeId) =>
      set(state => ({ edges: state.edges.filter(e => e.id !== edgeId) })),

    loadGraph: (nodes, edges) => {
      const byId = {}
      nodes.forEach(n => { byId[n.id] = n })
      set({ nodes: byId, edges })
    },

    // ─── Sync Actions ─────────────────────────────────────────────────

    setSyncStatus: (status, lastSaved = null) =>
      set(state => ({
        sync: {
          ...state.sync,
          status,
          lastSaved: lastSaved || state.sync.lastSaved,
          pendingChanges: status === 'idle' ? 0 : state.sync.pendingChanges
        }
      })),

    markChapterClean: (id) =>
      set(state => ({
        chapters: {
          ...state.chapters,
          [id]: { ...state.chapters[id], isDirty: false }
        }
      })),

    // ─── Midnight Chronicle Editor Actions ────────────────────────────
    
    setScenes: (scenesList) => {
      const byId = {}
      const order = []
      scenesList.forEach(s => {
        byId[s.id] = s
        order.push(s.id)
      })
      set({ scenes: byId, sceneOrder: order })
    },
    
    upsertScene: (scene) => set(state => ({
      scenes: { ...state.scenes, [scene.id]: { ...state.scenes[scene.id], ...scene } },
      sync: { ...state.sync, pendingChanges: state.sync.pendingChanges + 1 }
    })),
    
    removeScene: (id) => set(state => {
      const { [id]: _, ...remain } = state.scenes
      return { scenes: remain, sceneOrder: state.sceneOrder.filter(x => x !== id), sync: { ...state.sync, pendingChanges: state.sync.pendingChanges + 1 } }
    }),

    setCharacters: (chars) => {
      const byId = {}
      chars.forEach(c => { byId[c.id] = c })
      set({ characters: byId })
    },
    
    upsertCharacter: (char) => set(state => ({ 
      characters: { ...state.characters, [char.id]: char },
      sync: { ...state.sync, pendingChanges: state.sync.pendingChanges + 1 }
    })),
    
    removeCharacter: (id) => set(state => {
      const { [id]: _, ...remain } = state.characters
      return { characters: remain, sync: { ...state.sync, pendingChanges: state.sync.pendingChanges + 1 } }
    }),

    setLocations: (locs) => {
      const byId = {}
      locs.forEach(l => { byId[l.id] = l })
      set({ locations: byId })
    },
    
    upsertLocation: (loc) => set(state => ({ 
      locations: { ...state.locations, [loc.id]: loc },
      sync: { ...state.sync, pendingChanges: state.sync.pendingChanges + 1 }
    })),
    
    removeLocation: (id) => set(state => {
      const { [id]: _, ...remain } = state.locations
      return { locations: remain, sync: { ...state.sync, pendingChanges: state.sync.pendingChanges + 1 } }
    }),

    setTimelineEvents: (events) => set({ timelineEvents: events }),
    
    upsertTimelineEvent: (event) => set(state => {
      const existing = state.timelineEvents.filter(e => e.id !== event.id)
      return { 
        timelineEvents: [...existing, event].sort((a,b) => (a.sort_order || 0) - (b.sort_order || 0)),
        sync: { ...state.sync, pendingChanges: state.sync.pendingChanges + 1 }
      }
    }),
    
    removeTimelineEvent: (id) => set(state => ({ 
      timelineEvents: state.timelineEvents.filter(e => e.id !== id),
      sync: { ...state.sync, pendingChanges: state.sync.pendingChanges + 1 }
    })),

    setResearchNotes: (notes) => set({ researchNotes: notes }),
    
    upsertResearchNote: (note) => set(state => ({
      researchNotes: [...state.researchNotes.filter(n => n.id !== note.id), note],
      sync: { ...state.sync, pendingChanges: state.sync.pendingChanges + 1 }
    })),
    
    removeResearchNote: (id) => set(state => ({ 
      researchNotes: state.researchNotes.filter(n => n.id !== id),
      sync: { ...state.sync, pendingChanges: state.sync.pendingChanges + 1 }
    })),

    // ─── Debounced Graph Sync ──────────────────────────────────────────
    
    syncGraph: async (token) => {
      const state = get()
      if (!state.projectId || !token) return
      
      set(state => ({ sync: { ...state.sync, status: 'saving' } }))
      
      try {
        const { saveNodes, saveEdges, saveCharacterState, saveConflictState, saveProgressionMarker, saveEditorData } = await import('../api.js')
        const nodes = Object.values(state.nodes)
        
        await Promise.all([
          saveNodes(state.projectId, nodes, token),
          saveEdges(state.projectId, state.edges, token),
          ...Object.values(state.characterStates).map(c => saveCharacterState(c, token)),
          ...Object.values(state.conflictStates).map(c => saveConflictState(c, token)),
          ...state.progressionMarkers.map(p => saveProgressionMarker(p, token)),
          saveEditorData(state.projectId, {
              scenes: Object.values(state.scenes || {}),
              characters: Object.values(state.characters || {}),
              locations: Object.values(state.locations || {}),
              timeline_events: state.timelineEvents || [],
              research_notes: state.researchNotes || []
          }, token)
        ])
        
        set(state => ({ 
          sync: { ...state.sync, status: 'idle', lastSaved: new Date().toISOString() } 
        }))
      } catch (err) {
        console.error("Graph sync failed:", err)
        set(state => ({ sync: { ...state.sync, status: 'error' } }))
      }
    },

    initializeProject: async (projectId, token) => {
      if (!projectId || !token) return
      set({ isRehydrating: true, projectId })
      
      try {
        const api = await import('../api.js')
        
        // Load each data source independently — one failure should not block others
        let graphData = { nodes: [], edges: [] }
        let manuscriptData = { chapters: {}, chapterOrder: [] }
        let charStates = []
        let confStates = []
        let progMarkers = []
        let editorData = { scenes: [], characters: [], locations: [], timeline_events: [], research_notes: [] }

        try { graphData = await api.loadNodes(projectId, token) } catch (e) { console.warn("Graph load failed:", e.message) }
        try { manuscriptData = await api.loadManuscript(projectId, token) } catch (e) { console.warn("Manuscript load failed:", e.message) }
        try { charStates = await api.loadCharacterStates(projectId, token) } catch (e) { console.warn("Character states load failed:", e.message) }
        try { confStates = await api.loadConflictStates(projectId, token) } catch (e) { console.warn("Conflict states load failed:", e.message) }
        try { progMarkers = await api.loadProgressionMarkers(projectId, token) } catch (e) { console.warn("Progression markers load failed:", e.message) }
        try { editorData = await api.loadEditorData(projectId, token) } catch (e) { console.warn("Editor data load failed:", e.message) }
        
        const byId = {}
        if (graphData?.nodes) graphData.nodes.forEach(n => { byId[n.id] = n })
        
        const charsById = {}
        if (charStates && Array.isArray(charStates)) charStates.forEach(c => { charsById[c.character_id] = c })
        
        const confsById = {}
        if (confStates && Array.isArray(confStates)) confStates.forEach(c => { confsById[c.conflict_id] = c })
        
        // Editor Data
        const eData = editorData || {}
        const scenesById = {}
        const sceneOrderArr = []
        if (eData.scenes && Array.isArray(eData.scenes)) {
          eData.scenes.forEach(s => {
            scenesById[s.id] = s
            sceneOrderArr.push(s.id)
          })
        }
        
        const editorChars = {}
        if (eData.characters && Array.isArray(eData.characters)) eData.characters.forEach(c => { editorChars[c.id] = c })
        
        const editorLocs = {}
        if (eData.locations && Array.isArray(eData.locations)) eData.locations.forEach(l => { editorLocs[l.id] = l })

        // Seed a default chapter if manuscript has no chapters
        let finalChapters = manuscriptData?.chapters || {}
        let finalChapterOrder = manuscriptData?.chapterOrder || []
        if (Object.keys(finalChapters).length === 0) {
          const defaultChId = `ch_${Date.now()}`
          finalChapters = { [defaultChId]: { id: defaultChId, title: 'Chapter 1', content: '', wordCount: 0, order: 0 } }
          finalChapterOrder = [defaultChId]
        }
        
        set({ 
          nodes: byId, 
          edges: graphData?.edges || [],
          chapters: finalChapters,
          chapterOrder: finalChapterOrder,
          characterStates: charsById,
          conflictStates: confsById,
          progressionMarkers: progMarkers || [],
          scenes: scenesById,
          sceneOrder: sceneOrderArr,
          characters: editorChars,
          locations: editorLocs,
          timelineEvents: eData.timeline_events || [],
          researchNotes: eData.research_notes || [],
          editor: { activeChapterId: finalChapterOrder[0] || null, isTyping: false, wordCount: 0 },
          isRehydrating: false 
        })
      } catch (err) {
        console.error("Project initialization failed:", err)
        // Seed a default chapter so the editor always has something to show
        const defaultChId = `ch_${Date.now()}`
        set({
          isRehydrating: false,
          chapters: { [defaultChId]: { id: defaultChId, title: 'Chapter 1', content: '', wordCount: 0, order: 0 } },
          chapterOrder: [defaultChId],
          editor: { activeChapterId: defaultChId, isTyping: false, wordCount: 0 }
        })
      }
    },

    syncManuscript: async (token) => {
      const state = get()
      if (!state.projectId || !token) return
      
      set(state => ({ sync: { ...state.sync, status: 'saving' } }))
      
      try {
        const { saveManuscript } = await import('../api.js')
        const content = {
          chapters: state.chapters,
          chapterOrder: state.chapterOrder
        }
        
        await saveManuscript(state.projectId, content, token)
        
        set(state => ({ 
          sync: { ...state.sync, status: 'idle', lastSaved: new Date().toISOString() } 
        }))
      } catch (err) {
        console.error("Manuscript sync failed:", err)
        set(state => ({ sync: { ...state.sync, status: 'error' } }))
      }
    }
  }))
)
