/**
 * Author Studio Pro — Editor Sidebar
 * Chapter list with drag-to-reorder, add/delete, and word count targets.
 */

import React, { useState } from 'react'
import {
    HiOutlinePlusCircle, HiOutlineTrash, HiOutlineBars3,
    HiOutlineChevronLeft, HiOutlineChevronRight, HiOutlinePencil,
} from 'react-icons/hi2'
import { useWritingSystem } from '../../contexts/WritingSystemContext'
import './EditorLayout.css'

const TYPE_COLORS = {
    subplot: { bg: 'rgba(90, 123, 201, 0.25)', border: '#5a7bc9' },
    theme: { bg: 'rgba(201, 145, 90, 0.25)', border: '#c9915a' },
    character_arc: { bg: 'rgba(123, 201, 90, 0.25)', border: '#7bc95a' },
    foreshadowing: { bg: 'rgba(201, 90, 123, 0.25)', border: '#c95a7b' },
    motif: { bg: 'rgba(145, 90, 201, 0.25)', border: '#915ac9' }
};

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
    const { 
        setActiveChapterId, 
        chapterThreadsMap, 
        setActiveThinkingTab, 
        setThinkingPanelOpen, 
        setHighlightCardId 
    } = useWritingSystem()

    const [editingId, setEditingId] = useState(null)
    const [editTitle, setEditTitle] = useState('')
    const [dragIdx, setDragIdx] = useState(null)

    const handleChapterClick = (id) => {
        onSelectChapter(id);
        setActiveChapterId(id);
    };

    const handlePillClick = (e, threadId) => {
        e.stopPropagation();
        setActiveThinkingTab('threads');
        setThinkingPanelOpen(true);
        setHighlightCardId(threadId);
    };

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
                <button className="sidebar-toggle" onClick={onToggleCollapse} title="Expand sidebar" aria-label="Expand sidebar" aria-expanded="false" style={{ marginTop: '1rem' }}>
                    <HiOutlineChevronRight />
                </button>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', alignItems: 'center', marginTop: '2rem' }}>
                    {chapters.map((ch) => (
                        <div 
                            key={ch.id}
                            title={ch.title}
                            onClick={() => handleChapterClick(ch.id)}
                            style={{
                                width: '8px', height: '8px', borderRadius: '50%',
                                background: ch.id === activeChapterId ? 'var(--gold-primary)' : 'rgba(255,255,255,0.1)',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                        />
                    ))}
                </div>
            </div>
        )
    }

    return (
        <div className="editor-sidebar">
            <div className="sidebar-header">
                <h3 className="sidebar-title">Manuscript</h3>
                <button className="sidebar-toggle" onClick={onToggleCollapse} title="Collapse sidebar" aria-label="Collapse sidebar" aria-expanded="true" style={{ background: 'none', color: 'var(--text-muted)' }}>
                    <HiOutlineChevronLeft />
                </button>
            </div>

            {/* Word Count Progress */}
            <div className="sidebar-progress">
                <div className="sidebar-progress-label">
                    <span style={{ fontWeight: 600 }}>{totalWords.toLocaleString()} <span style={{ opacity: 0.5, fontWeight: 400 }}>words</span></span>
                    {targetWords > 0 && <span style={{ opacity: 0.6 }}>{progressPct}%</span>}
                </div>
                {targetWords > 0 && (
                    <div className="sidebar-progress-bar">
                        <div className="sidebar-progress-fill" style={{ width: `${progressPct}%` }} />
                    </div>
                )}
            </div>

            <div className="sidebar-chapters">
                {chapters.map((ch, idx) => {
                    const threads = chapterThreadsMap[ch.id] || [];
                    const visibleThreads = threads.slice(0, 3);
                    
                    return (
                        <div
                            key={ch.id}
                            className={`sidebar-chapter ${ch.id === activeChapterId ? 'active' : ''}`}
                            draggable
                            onDragStart={() => handleDragStart(idx)}
                            onDragOver={(e) => handleDragOver(e, idx)}
                            onDragEnd={handleDragEnd}
                            onClick={() => handleChapterClick(ch.id)}
                        >
                            <div style={{ width: '100%' }}>
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', marginBottom: threads.length > 0 ? '0.5rem' : 0 }}>
                                    {editingId === ch.id ? (
                                        <input
                                            className="sidebar-rename-input"
                                            value={editTitle}
                                            onChange={e => setEditTitle(e.target.value)}
                                            onBlur={handleFinishRename}
                                            onKeyDown={e => e.key === 'Enter' && handleFinishRename()}
                                            autoFocus
                                            onClick={e => e.stopPropagation()}
                                            style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--gold-primary)', color: '#fff', borderRadius: '4px', padding: '2px 4px', fontSize: '0.9rem', width: '100%' }}
                                        />
                                    ) : (
                                        <span className="sidebar-chapter-title">{ch.title}</span>
                                    )}
                                    <span className="sidebar-chapter-words">
                                        {((ch.wordCount || 0) / 1000).toFixed(1)}k
                                    </span>
                                </div>
                                
                                {threads.length > 0 && (
                                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                        {visibleThreads.map(thread => {
                                            const color = TYPE_COLORS[thread.type] || TYPE_COLORS['subplot'];
                                            return (
                                                <div 
                                                    key={thread.threadId}
                                                    onClick={(e) => handlePillClick(e, thread.threadId)}
                                                    style={{
                                                        height: '4px', width: '20px', borderRadius: '2px',
                                                        background: color.border, opacity: 0.6,
                                                        cursor: 'pointer'
                                                    }}
                                                    title={thread.threadTitle}
                                                />
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Add Chapter */}
            <button className="sidebar-add-btn" onClick={onAddChapter}>
                <HiOutlinePlusCircle /> <span>New Chapter</span>
            </button>
        </div>
    )
}
