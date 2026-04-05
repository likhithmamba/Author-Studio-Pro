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
            <div className="editor-sidebar collapsed" style={{ paddingTop: '16px', alignItems: 'center' }}>
                <button className="sidebar-toggle" onClick={onToggleCollapse} title="Expand sidebar" style={{ marginBottom: '16px' }}>
                    <HiOutlineChevronRight />
                </button>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', alignItems: 'center' }}>
                    {chapters.map((ch, idx) => (
                        <div 
                            key={ch.id}
                            title={ch.title}
                            onClick={() => handleChapterClick(ch.id)}
                            style={{
                                width: '10px', height: '10px', borderRadius: '50%',
                                background: ch.id === activeChapterId ? '#c9915a' : '#444',
                                cursor: 'pointer'
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

            <div className="sidebar-chapters">
                {chapters.map((ch, idx) => {
                    const threads = chapterThreadsMap[ch.id] || [];
                    const visibleThreads = threads.slice(0, 3);
                    const overflow = threads.length - 3;
                    
                    return (
                        <div
                            key={ch.id}
                            className={`sidebar-chapter ${ch.id === activeChapterId ? 'active' : ''}`}
                            style={{ flexDirection: 'column', alignItems: 'stretch' }}
                            draggable
                            onDragStart={() => handleDragStart(idx)}
                            onDragOver={(e) => handleDragOver(e, idx)}
                            onDragEnd={handleDragEnd}
                            onClick={() => handleChapterClick(ch.id)}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
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
                            
                            {threads.length > 0 && (
                                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', paddingLeft: '24px', marginTop: '4px' }}>
                                    {visibleThreads.map(thread => {
                                        const color = TYPE_COLORS[thread.type] || TYPE_COLORS['subplot'];
                                        return (
                                            <div 
                                                key={thread.threadId}
                                                onClick={(e) => handlePillClick(e, thread.threadId)}
                                                style={{
                                                    height: '16px', padding: '2px 6px', borderRadius: '3px',
                                                    fontSize: '10px', fontFamily: '"DM Sans", sans-serif',
                                                    background: color.bg, border: `1px solid ${color.border}`,
                                                    color: '#e8e0d5', cursor: 'pointer',
                                                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                                    maxWidth: '120px'
                                                }}
                                            >
                                                {thread.threadTitle.length > 12 ? thread.threadTitle.substring(0, 12) + '...' : thread.threadTitle}
                                            </div>
                                        );
                                    })}
                                    {overflow > 0 && (
                                        <div style={{
                                            height: '16px', padding: '2px 6px', borderRadius: '3px',
                                            fontSize: '10px', fontFamily: '"DM Sans", sans-serif',
                                            color: '#6b6560', cursor: 'default'
                                        }}>
                                            +{overflow}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Add Chapter */}
            <button className="sidebar-add-btn" onClick={onAddChapter}>
                <HiOutlinePlusCircle /> New Chapter
            </button>
        </div>
    )
}
