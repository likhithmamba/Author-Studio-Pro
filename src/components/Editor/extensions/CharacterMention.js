/**
 * CharacterMention — TipTap Mention extension for @character tokens.
 * Typing @Name shows a dropdown of known characters; selecting one
 * creates or references a character node in the Zustand store.
 */

import Mention from '@tiptap/extension-mention'
import { ReactRenderer } from '@tiptap/react'
import tippy from 'tippy.js'
import { useStoryStore } from '../../../store/storyStore.js'
import MentionList from './MentionList.jsx'

export const CharacterMention = Mention.extend({
  name: 'characterMention',
}).configure({
  HTMLAttributes: {
    class: 'character-mention',
  },
  suggestion: {
    char: '@',
    items: ({ query }) => {
      const nodes = Object.values(useStoryStore.getState().nodes)
        .filter(n => n.type === 'character')
        .filter(n => n.label.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 8)
      if (nodes.length > 0) return nodes
      if (query.trim()) return [{ id: `new-${query}`, label: query, isNew: true }]
      return []
    },
    render: () => {
      let component, popup

      return {
        onStart: (props) => {
          component = new ReactRenderer(MentionList, {
            props,
            editor: props.editor,
          })

          if (!props.clientRect) return

          popup = tippy('body', {
            getReferenceClientRect: props.clientRect,
            appendTo: () => document.body,
            content: component.element,
            showOnCreate: true,
            interactive: true,
            trigger: 'manual',
            placement: 'bottom-start',
          })
        },
        onUpdate: (props) => {
          component?.updateProps(props)
          if (!props.clientRect) return
          popup?.[0]?.setProps({
            getReferenceClientRect: props.clientRect,
          })
        },
        onKeyDown: (props) => {
          if (props.event.key === 'Escape') {
            popup?.[0]?.hide()
            return true
          }
          return component?.ref?.onKeyDown(props) ?? false
        },
        onExit: () => {
          popup?.[0]?.destroy()
          component?.destroy()
        },
      }
    },
    command: ({ editor, range, props }) => {
      const store = useStoryStore.getState()
      const nodeId = props.isNew ? `n_${Date.now()}` : props.id

      if (props.isNew) {
        store.upsertNode({
          id: nodeId,
          type: 'character',
          label: props.label || props.id,
          chapterRefs: [store.editor.activeChapterId].filter(Boolean),
          position: { x: Math.random() * 400, y: Math.random() * 300 },
          createdAt: Date.now(),
        })
      } else {
        const existing = store.nodes[nodeId]
        if (existing && !existing.chapterRefs?.includes(store.editor.activeChapterId)) {
          store.upsertNode({
            ...existing,
            chapterRefs: [...(existing.chapterRefs || []), store.editor.activeChapterId].filter(Boolean)
          })
        }
      }

      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertContent([
          { type: 'characterMention', attrs: { id: nodeId, label: props.label || props.id } },
          { type: 'text', text: ' ' },
        ])
        .run()
    },
  },
})
