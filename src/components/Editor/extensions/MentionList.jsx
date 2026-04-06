/**
 * MentionList — Suggestion dropdown for @character and #plot mentions.
 * Shows existing matches + "Create new" option with keyboard navigation.
 */

import React, { forwardRef, useImperativeHandle, useState, useEffect } from 'react'

const MentionList = forwardRef(({ items, command }, ref) => {
  const [selected, setSelected] = useState(0)

  useEffect(() => {
    setSelected(0)
  }, [items])

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if (event.key === 'ArrowUp') {
        setSelected(s => Math.max(0, s - 1))
        return true
      }
      if (event.key === 'ArrowDown') {
        setSelected(s => Math.min(items.length - 1, s + 1))
        return true
      }
      if (event.key === 'Enter') {
        if (items[selected]) command(items[selected])
        return true
      }
      return false
    }
  }))

  if (!items?.length) return null

  return (
    <div style={{
      background: 'rgba(13,11,18,0.97)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: '8px',
      overflow: 'hidden',
      minWidth: '160px',
      maxWidth: '280px',
      boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
      backdropFilter: 'blur(12px)',
    }}>
      {items.map((item, i) => (
        <button
          key={item.id}
          onClick={() => command(item)}
          style={{
            display: 'block',
            width: '100%',
            textAlign: 'left',
            padding: '7px 12px',
            border: 'none',
            cursor: 'pointer',
            background: i === selected ? 'rgba(196,144,58,0.12)' : 'transparent',
            color: item.isNew ? '#c4903a' : '#e8e0d5',
            fontSize: '12px',
            fontFamily: '"DM Sans", sans-serif',
            transition: 'background 0.1s',
          }}
          onMouseEnter={() => setSelected(i)}
        >
          {item.isNew ? `Create "${item.label}"` : item.label}
        </button>
      ))}
    </div>
  )
})

MentionList.displayName = 'MentionList'

export default MentionList
