/**
 * Inkforge — Zustand State Store
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
    chapterSceneMap: {}, // chapter_id -> scene_id for the main scene

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
      isSyncing: false,
      dirtyEntities: new Set(),
    },

    isRehydrating: false,

    // ─── Intelligence Analysis State ──────────────────────────────
    analysis: {
      status: 'idle',        // 'idle' | 'running' | 'complete' | 'error'
      lastRun: null,
      result: null,          // Output from ssoOrchestrator.runLocalAnalysis
      healthScore: null,
    },

    // ─── Narrative Intelligence State (deterministic engines) ─────────
    narrativeIntel: {
      status: 'idle',          // 'idle' | 'running' | 'complete' | 'error'
      lastRun: null,
      versionHash: null,       // Cache key — skip re-analysis if unchanged
      fromCache: false,
      fingerprint: null,       // Engine 01: 5-axis stylometric profile
      tension: null,           // Engine 02: Narrative tension waveform
      voiceDivergence: null,   // Engine 03: Character voice similarity
      gunTracker: null,        // Engine 04: Chekhov's Gun tracking
      entropy: null,           // Engine 05: Scene entropy map
      iceberg: null,           // Engine 07: Show-vs-tell ratio
      temporal: null,          // Engine 08: Timeline coherence
      coldOpen: null,          // Engine 09: Opening chapter readiness
      errors: {},
      completedEngines: [],
    },

    // ─── Writing Goals ────────────────────────────────────────────────
    streak: 0,

    // ─── Actions ──────────────────────────────────────────────────────

    setProject: (id, title) => set({ projectId: id, projectTitle: title }),

    // ─── Intelligence Pipeline ────────────────────────────────────
    runAnalysis: () => {
      const state = get()
      if (!state.projectId || state.chapterOrder.length === 0) return

      set(s => ({ analysis: { ...s.analysis, status: 'running' } }))

      try {
        // Dynamic import to avoid circular deps and keep bundle split
        import('../utils/ssoOrchestrator.js').then(({ runLocalAnalysis }) => {
          const result = runLocalAnalysis(state)
          set(s => ({
            analysis: {
              status: 'complete',
              lastRun: new Date().toISOString(),
              result,
              healthScore: result.healthScore,
            }
          }))
        })
      } catch (err) {
        console.error('Analysis pipeline error:', err)
        set(s => ({ analysis: { ...s.analysis, status: 'error' } }))
      }
    },

    // ─── Narrative Intelligence Actions ────────────────────────────────
    // Extracts full text from chapters and sends to backend engines

    _extractManuscriptText: () => {
      const state = get()
      const parts = []
      for (const chId of state.chapterOrder) {
        const ch = state.chapters[chId]
        if (!ch) continue
        parts.push(`Chapter: ${ch.title || 'Untitled'}`)
        // Get content from the scene if available, otherwise from the chapter
        const sceneId = state.chapterSceneMap?.[chId]
        const scene = sceneId ? state.scenes[sceneId] : null
        const content = scene?.content || ch.content || ''
        if (content.trim()) parts.push(content)
      }
      return parts.join('\n\n')
    },

    runNarrativeQuick: async () => {
      const state = get()
      if (!state.projectId || state.chapterOrder.length === 0) return
      if (state.narrativeIntel.status === 'running') return

      set(s => ({ narrativeIntel: { ...s.narrativeIntel, status: 'running' } }))

      try {
        const { narrativeQuick } = await import('../api.js')
        const token = localStorage.getItem('inkforge_token')
        const rawText = get()._extractManuscriptText()
        if (!rawText || rawText.length < 100) {
          set(s => ({ narrativeIntel: { ...s.narrativeIntel, status: 'idle' } }))
          return
        }

        const result = await narrativeQuick({
          rawText,
          manuscriptId: state.projectId,
          genre: 'default',
        }, token)

        // Skip update if hash unchanged (server returned cache)
        set(s => ({
          narrativeIntel: {
            ...s.narrativeIntel,
            status: 'complete',
            lastRun: new Date().toISOString(),
            versionHash: result.version_hash,
            fromCache: result._from_cache || false,
            fingerprint: result.fingerprint,
            tension: result.tension,
            errors: result.errors || {},
            completedEngines: result._completed_engines || [],
          }
        }))
      } catch (err) {
        console.error('Narrative quick analysis error:', err)
        set(s => ({ narrativeIntel: { ...s.narrativeIntel, status: 'error' } }))
      }
    },

    runNarrativeFull: async () => {
      const state = get()
      if (!state.projectId || state.chapterOrder.length === 0) return
      if (state.narrativeIntel.status === 'running') return

      set(s => ({ narrativeIntel: { ...s.narrativeIntel, status: 'running' } }))

      try {
        const { narrativeFull } = await import('../api.js')
        const token = localStorage.getItem('inkforge_token')
        const rawText = get()._extractManuscriptText()
        if (!rawText || rawText.length < 100) {
          set(s => ({ narrativeIntel: { ...s.narrativeIntel, status: 'idle' } }))
          return
        }

        // Build chapter title map
        const chapterTitles = {}
        state.chapterOrder.forEach((chId, idx) => {
          const ch = state.chapters[chId]
          if (ch) chapterTitles[idx] = ch.title || null
        })

        const result = await narrativeFull({
          rawText,
          manuscriptId: state.projectId,
          genre: 'default',
          chapterTitles,
        }, token)

        set(s => ({
          narrativeIntel: {
            status: 'complete',
            lastRun: new Date().toISOString(),
            versionHash: result.version_hash,
            fromCache: result._from_cache || false,
            fingerprint: result.fingerprint,
            tension: result.tension,
            voiceDivergence: result.voice_divergence,
            gunTracker: result.gun_tracker,
            entropy: result.entropy,
            iceberg: result.iceberg,
            temporal: result.temporal,
            coldOpen: result.cold_open,
            errors: result.errors || {},
            completedEngines: result._completed_engines || [],
          }
        }))
      } catch (err) {
        console.error('Narrative full analysis error:', err)
        set(s => ({ narrativeIntel: { ...s.narrativeIntel, status: 'error' } }))
      }
    },

    runNarrativeSubmission: async () => {
      const state = get()
      if (!state.projectId || state.chapterOrder.length === 0) return
      if (state.narrativeIntel.status === 'running') return

      set(s => ({ narrativeIntel: { ...s.narrativeIntel, status: 'running' } }))

      try {
        const { narrativeSubmission } = await import('../api.js')
        const token = localStorage.getItem('inkforge_token')
        const rawText = get()._extractManuscriptText()
        if (!rawText || rawText.length < 100) {
          set(s => ({ narrativeIntel: { ...s.narrativeIntel, status: 'idle' } }))
          return
        }

        const result = await narrativeSubmission({
          rawText,
          manuscriptId: state.projectId,
          genre: 'default',
        }, token)

        set(s => ({
          narrativeIntel: {
            ...s.narrativeIntel,
            status: 'complete',
            lastRun: new Date().toISOString(),
            versionHash: result.version_hash,
            fromCache: result._from_cache || false,
            gunTracker: result.gun_tracker,
            temporal: result.temporal,
            coldOpen: result.cold_open,
            errors: result.errors || {},
            completedEngines: result._completed_engines || [],
          }
        }))
      } catch (err) {
        console.error('Narrative submission analysis error:', err)
        set(s => ({ narrativeIntel: { ...s.narrativeIntel, status: 'error' } }))
      }
    },


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

    loadStreak: async () => {
      try {
        const { fetchStreak } = await import('../api');
        const token = localStorage.getItem('inkforge_token');
        const data = await fetchStreak(token);
        if (data && typeof data.streak === 'number') {
          set({ streak: data.streak });
        }
      } catch (e) {
        console.error("Failed to load streak", e);
      }
    },

    applyTemplate: async (templateId) => {
      try {
        const { default: tpl } = await import(`../data/templates/${templateId}.json`);
        const chapters = tpl.chapters || [];
        const state = get();
        
        const newChapters = { ...state.chapters };
        const newChapterOrder = [...state.chapterOrder];
        const newScenes = { ...state.scenes };
        
        let lastChapterId = null;
        
        chapters.forEach((ch, idx) => {
          const id = `ch_${Date.now()}_${idx}`;
          const scId = `sc_${Date.now()}_${idx}`;
          
          newChapters[id] = { id, title: ch.title, content: '', wordCount: 0, order: newChapterOrder.length };
          newChapterOrder.push(id);
          lastChapterId = id;
          
          newScenes[scId] = {
            id: scId,
            chapter_id: id,
            title: ch.title,
            content: `**${ch.title}**\n\n${ch.description}\n`,
            position: 0
          };
        });
        
        set({
          chapters: newChapters,
          chapterOrder: newChapterOrder,
          scenes: newScenes,
          editor: { ...state.editor, activeChapterId: lastChapterId || state.editor.activeChapterId }
        });
        
        // Ensure changes are synced
        set(s => {
            const dirty = new Set(s.sync.dirtyEntities);
            dirty.add('chapters');
            dirty.add('scenes');
            return { sync: { ...s.sync, pendingChanges: s.sync.pendingChanges + 1, dirtyEntities: dirty } };
        });
        
      } catch (err) {
        console.error("Failed to load template", err);
      }
    },

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
      sync: { ...state.sync, pendingChanges: state.sync.pendingChanges + 1, dirtyEntities: new Set([...state.sync.dirtyEntities, 'scenes']) }
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
      sync: { ...state.sync, pendingChanges: state.sync.pendingChanges + 1, dirtyEntities: new Set([...state.sync.dirtyEntities, 'characters']) }
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
      sync: { ...state.sync, pendingChanges: state.sync.pendingChanges + 1, dirtyEntities: new Set([...state.sync.dirtyEntities, 'locations']) }
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
        sync: { ...state.sync, pendingChanges: state.sync.pendingChanges + 1, dirtyEntities: new Set([...state.sync.dirtyEntities, 'timeline_events']) }
      }
    }),
    
    removeTimelineEvent: (id) => set(state => ({ 
      timelineEvents: state.timelineEvents.filter(e => e.id !== id),
      sync: { ...state.sync, pendingChanges: state.sync.pendingChanges + 1 }
    })),

    setResearchNotes: (notes) => set({ researchNotes: notes }),
    
    upsertResearchNote: (note) => set(state => ({
      researchNotes: [...state.researchNotes.filter(n => n.id !== note.id), note],
      sync: { ...state.sync, pendingChanges: state.sync.pendingChanges + 1, dirtyEntities: new Set([...state.sync.dirtyEntities, 'research_notes']) }
    })),
    
    removeResearchNote: (id) => set(state => ({ 
      researchNotes: state.researchNotes.filter(n => n.id !== id),
      sync: { ...state.sync, pendingChanges: state.sync.pendingChanges + 1 }
    })),

    // ─── Debounced Graph Sync ──────────────────────────────────────────
    
    syncGraph: async (token) => {
      const state = get()
      if (!state.projectId || !token) return
      
      set(state => ({ sync: { ...state.sync, status: 'saving', isSyncing: true } }))
      
      try {
        const { saveNodes, saveEdges, saveCharacterState, saveConflictState, saveProgressionMarker, saveEditorData } = await import('../api.js')
        const { toDbCharacter, toDbLocation, toDbTimelineEvent, toDbResearchNote } = await import('./editorMappers.js')
        
        const nodes = Object.values(state.nodes)
        
        const dirty = state.sync.dirtyEntities
        const pid = state.projectId
        
        await Promise.all([
          saveNodes(state.projectId, nodes, token),
          saveEdges(state.projectId, state.edges, token),
          ...Object.values(state.characterStates).map(c => saveCharacterState(c, token)),
          ...Object.values(state.conflictStates).map(c => saveConflictState(c, token)),
          ...state.progressionMarkers.map(p => saveProgressionMarker(p, token)),
          saveEditorData(state.projectId, {
              scenes: dirty.has('scenes') ? Object.values(state.scenes || {}).map(s => { const { content, ...meta } = s; return meta; }) : undefined,
              characters: dirty.has('characters') ? Object.values(state.characters || {}).map(c => toDbCharacter(c, pid)) : undefined,
              locations: dirty.has('locations') ? Object.values(state.locations || {}).map(l => toDbLocation(l, pid)) : undefined,
              timeline_events: dirty.has('timeline_events') ? (state.timelineEvents || []).map(e => toDbTimelineEvent(e, pid)) : undefined,
              research_notes: dirty.has('research_notes') ? (state.researchNotes || []).map(n => toDbResearchNote(n, pid)) : undefined
          }, token)
        ])
        
        set(state => ({ 
          sync: { ...state.sync, status: 'idle', isSyncing: false, pendingChanges: 0, dirtyEntities: new Set(), lastSaved: new Date().toISOString() } 
        }))
      } catch (err) {
        console.error("Graph sync failed:", err)
        set(state => ({ sync: { ...state.sync, status: 'error', isSyncing: false } }))
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
        
        const chapterSceneMap = {}
        for (const chId of finalChapterOrder) {
          const mainScene = eData.scenes?.find(s => s.chapter_id === chId && s.title === '__main__')
          if (mainScene) {
            chapterSceneMap[chId] = mainScene.id
          } else {
            try {
               const content = finalChapters[chId]?.content || ''
               const res = await api.createScene({
                 project_id: projectId,
                 chapter_id: chId,
                 title: '__main__',
                 content: content
               }, token)
               if (res && res.id) {
                 chapterSceneMap[chId] = res.id
                 scenesById[res.id] = res
                 sceneOrderArr.push(res.id)
               }
            } catch (err) {
               console.warn("Failed to create __main__ scene:", err)
            }
          }
        }
        
        set({ 
          nodes: byId, 
          edges: graphData?.edges || [],
          chapters: finalChapters,
          chapterOrder: finalChapterOrder,
          chapterSceneMap,
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
        // Only saving titles and order now, content is in scenes
        const chaptersWithoutContent = {}
        for (const [id, ch] of Object.entries(state.chapters)) {
           const { content, ...rest } = ch
           chaptersWithoutContent[id] = rest
        }
        const payload = {
          chapters: chaptersWithoutContent,
          chapterOrder: state.chapterOrder
        }
        
        await saveManuscript(state.projectId, payload, token)
        
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
