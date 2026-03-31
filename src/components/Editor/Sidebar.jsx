/**
 * Author Studio Pro — Editor Sidebar
 * Chapter list with drag-to-reorder, add/delete, and word count targets.
 */

import React, { useState } from 'react'
import {
    HiOutlinePlusCircle, HiOutlineTrash, HiOutlineBars3,
    HiOutlineChevronLeft, HiOutlineChevronRight, HiOutlinePencil,
} from 'react-icons/hi2'
import './EditorLayout.css'

export default function Sidebar({
    chapters,
    activeChapterId,
    onSelectChapter,
    onAddChapter,
    onDeleteChapter,
    onRenameChapter,
    onReorderChapters,
    collapsed,
    onToggleCollapse,
    totalWords,
    targetWords,
}) {
    const [editingId, setEditingId] = useState(null)
    const [editTitle, setEditTitle] = useState('')
    const [dragIdx, setDragIdx] = useState(null)

    const handleStartRename = (ch) => {
        setEditingId(ch.id)
        setEditTitle(ch.title)
    }

    const handleFinishRename = () => {
        if (editingId && editTitle.trim()) {
            onRenameChapter(editingId, editTitle.trim())
        }
        setEditingId(null)
        setEditTitle('')
    }

    const handleDragStart = (idx) => setDragIdx(idx)
    const handleDragOver = (e, idx) => {
        e.preventDefault()
        if (dragIdx === null || dragIdx === idx) return
        const newChapters = [...chapters]
        const [moved] = newChapters.splice(dragIdx, 1)
        newChapters.splice(idx, 0, moved)
        onReorderChapters(newChapters)
        setDragIdx(idx)
    }
    const handleDragEnd = () => setDragIdx(null)

    const progressPct = targetWords > 0 ? Math.min(100, Math.round((totalWords / targetWords) * 100)) : 0

    if (collapsed) {
        return (
            <div className="editor-sidebar collapsed">
                <button className="sidebar-toggle" onClick={onToggleCollapse} title="Expand sidebar">
                    <HiOutlineChevronRight />
                </button>
            </div>
        )
    }

    return (
        <div className="editor-sidebar">
            <div className="sidebar-header">
                <h3 className="sidebar-title">Chapters</h3>
                <button className="sidebar-toggle" onClick={onToggleCollapse} title="Collapse sidebar">
                    <HiOutlineChevronLeft />
                </button>
            </div>

            {/* Word Count Progress */}
            <div className="sidebar-progress">
                <div className="sidebar-progress-label">
                    <span>{totalWords.toLocaleString()} words</span>
                    {targetWords > 0 && <span>{progressPct}% of {targetWords.toLocaleString()}</span>}
                </div>
                {targetWords > 0 && (
                    <div className="sidebar-progress-bar">
                        <div className="sidebar-progress-fill" style={{
                            width: `${progressPct}%`,
                            background: progressPct >= 100 ? '#22c55e' : progressPct >= 75 ? '#3b82f6' : 'var(--gold-primary)',
                        }} />
                    </div>
                )}
            </div>

            {/* Chapter List */}
            <div className="sidebar-chapters">
                {chapters.map((ch, idx) => (
                    <div
                        key={ch.id}
                        className={`sidebar-chapter ${ch.id === activeChapterId ? 'active' : ''}`}
                        draggable
                        onDragStart={() => handleDragStart(idx)}
                        onDragOver={(e) => handleDragOver(e, idx)}
                        onDragEnd={handleDragEnd}
                        onClick={() => onSelectChapter(ch.id)}
                    >
                        <HiOutlineBars3 className="sidebar-drag-handle" />
                        {editingId === ch.id ? (
                            <input
                                className="sidebar-rename-input"
                                value={editTitle}
                                onChange={e => setEditTitle(e.target.value)}
                                onBlur={handleFinishRename}
                                onKeyDown={e => e.key === 'Enter' && handleFinishRename()}
                                autoFocus
                                onClick={e => e.stopPropagation()}
                            />
                        ) : (
                            <span className="sidebar-chapter-title">{ch.title}</span>
                        )}
                        <span className="sidebar-chapter-words">
                            {(ch.wordCount || 0).toLocaleString()}
                        </span>
                        <div className="sidebar-chapter-actions">
                            <button
                                className="sidebar-action-btn"
                                onClick={e => { e.stopPropagation(); handleStartRename(ch) }}
                                title="Rename"
                            >
                                <HiOutlinePencil />
                            </button>
                            {chapters.length > 1 && (
                                <button
                                    className="sidebar-action-btn sidebar-action-delete"
                                    onClick={e => { e.stopPropagation(); onDeleteChapter(ch.id) }}
                                    title="Delete chapter"
                                >
                                    <HiOutlineTrash />
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Add Chapter */}
            <button className="sidebar-add-btn" onClick={onAddChapter}>
                <HiOutlinePlusCircle /> New Chapter
            </button>
        </div>
    )
}
