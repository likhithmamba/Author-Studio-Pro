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

    addChapter: (chapter) =>
      set(state => ({
        chapters: { ...state.chapters, [chapter.id]: { ...chapter, isDirty: false } },
        chapterOrder: [...state.chapterOrder, chapter.id]
      })),

    removeChapter: (id) =>
      set(state => {
        const { [id]: _, ...rest } = state.chapters
        return {
          chapters: rest,
          chapterOrder: state.chapterOrder.filter(cid => cid !== id)
        }
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
        nodes: { ...state.nodes, [node.id]: node }
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
  }))
)
