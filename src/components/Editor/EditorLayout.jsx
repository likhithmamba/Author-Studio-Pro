/**
 * Author Studio Pro — Editor Layout
 * Container connecting Sidebar, NovelEditor, and chapter state management.
 * Uses localStorage for project/chapter persistence.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react'
import Sidebar from './Sidebar.jsx'
import NovelEditor from './NovelEditor.jsx'
import StatusBar from './StatusBar.jsx'
import ThinkingPanel from '../ThinkingPanel/ThinkingPanel.jsx'
import { useChapterSave } from './useChapterSave.js'
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts.js'
import { HiOutlineCog6Tooth } from 'react-icons/hi2'
import { useWritingSystem } from '../../contexts/WritingSystemContext.jsx'
import './EditorLayout.css'

const STORAGE_KEY = 'asp_editor_project'

function loadProject() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (!raw) return null
        return JSON.parse(raw)
    } catch { return null }
}

function saveProject(project) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(project))
    } catch { /* silently fail */ }
}

function createDefaultProject() {
    const ch1Id = `ch_${Date.now()}`
    return {
        id: `project_${Date.now()}`,
        author: 'Jane Doe',
        title: 'Untitled Novel',
        targetWords: 80000,
        chapters: [
            { id: ch1Id, title: 'Chapter 1', content: '', wordCount: 0, order: 0 },
        ],
        activeChapterId: ch1Id,
        createdAt: new Date().toISOString(),
    }
}

export default function EditorLayout({ apiKey, aiModel, hasKey, settings }) {
    const [project, setProject] = useState(() => loadProject() || createDefaultProject())
    const [focusMode, setFocusMode] = useState(false)
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
    const [showSettings, setShowSettings] = useState(false)

    // Context State
    const { 
        setActiveChapterId, 
        thinkingPanelOpen, setThinkingPanelOpen, 
        activeThinkingTab, setActiveThinkingTab 
    } = useWritingSystem();

    // Sync active chapter to global context for panels
    useEffect(() => {
        setActiveChapterId(project.activeChapterId);
    }, [project.activeChapterId, setActiveChapterId]);

    const [panelWidth, setPanelWidth] = useState(() => {
        try {
            const w = localStorage.getItem(`asp:project:${project.id}:panelWidth`);
            return w ? parseInt(w, 10) : 320;
        } catch { return 320; }
    });
    const [userPrefersOpen, setUserPrefersOpen] = useState(true);

    // Persist Panel State
    useEffect(() => {
        try {
            localStorage.setItem(`asp:project:${project.id}:panel`, JSON.stringify({ open: thinkingPanelOpen, activeTab: activeThinkingTab }));
            if (thinkingPanelOpen) setUserPrefersOpen(true);
        } catch {}
    }, [thinkingPanelOpen, activeThinkingTab, project.id]);

    useEffect(() => {
        try {
            localStorage.setItem(`asp:project:${project.id}:panelWidth`, panelWidth);
        } catch {}
    }, [panelWidth, project.id]);

    // Viewport Collapse
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth < 1100) {
                if (thinkingPanelOpen) {
                    setThinkingPanelOpen(false);
                }
            } else {
                if (userPrefersOpen && !thinkingPanelOpen) {
                    setThinkingPanelOpen(true);
                }
            }
        };
        window.addEventListener('resize', handleResize);
        handleResize();
        return () => window.removeEventListener('resize', handleResize);
    }, [userPrefersOpen, thinkingPanelOpen, setThinkingPanelOpen]);

    // Resize Handle Drag
    const isDraggingRef = useRef(false);
    const handleResizeDragStart = useCallback((e) => {
        e.preventDefault();
        isDraggingRef.current = true;
        document.body.style.cursor = 'col-resize';
        
        const handleDrag = (moveEvent) => {
            if (!isDraggingRef.current) return;
            // Calculate width from right edge of window
            const newWidth = document.body.clientWidth - moveEvent.clientX;
            if (newWidth >= 260 && newWidth <= 420) {
                setPanelWidth(newWidth);
            }
        };
        
        const handleDragEnd = () => {
            isDraggingRef.current = false;
            document.body.style.cursor = '';
            window.removeEventListener('mousemove', handleDrag);
            window.removeEventListener('mouseup', handleDragEnd);
        };
        
        window.addEventListener('mousemove', handleDrag);
        window.addEventListener('mouseup', handleDragEnd);
    }, []);

    useKeyboardShortcuts({
        onTabSwitch: setActiveThinkingTab,
        panelOpen: thinkingPanelOpen,
        setPanelOpen: setThinkingPanelOpen
    });

    // Save project to localStorage whenever it changes
    useEffect(() => { saveProject(project) }, [project])

    const activeChapter = project.chapters.find(ch => ch.id === project.activeChapterId) || project.chapters[0]
    const totalWords = project.chapters.reduce((sum, ch) => sum + (ch.wordCount || 0), 0)

    // Chapter content change handler
    const handleContentChange = useCallback((html) => {
        setProject(prev => ({
            ...prev,
            chapters: prev.chapters.map(ch =>
                ch.id === prev.activeChapterId
                    ? { ...ch, content: html, wordCount: html ? html.replace(/<[^>]*>/g, ' ').split(/\s+/).filter(Boolean).length : 0 }
                    : ch
            ),
        }))
    }, [])

    // Chapter auto-save
    const { lastSaved, saving, forceSave } = useChapterSave(
        activeChapter?.id,
        activeChapter?.content || '',
        (restoredContent) => {
            // Only restore if current content is empty
            if (!activeChapter?.content && restoredContent) {
                handleContentChange(restoredContent)
            }
        }
    )

    // Chapter management
    const handleSelectChapter = (id) => {
        setProject(prev => ({ ...prev, activeChapterId: id }))
    }

    const handleAddChapter = () => {
        const newId = `ch_${Date.now()}`
        const newOrder = project.chapters.length
        setProject(prev => ({
            ...prev,
            chapters: [...prev.chapters, {
                id: newId,
                title: `Chapter ${newOrder + 1}`,
                content: '',
                wordCount: 0,
                order: newOrder,
            }],
            activeChapterId: newId,
        }))
    }

    const handleDeleteChapter = (id) => {
        if (project.chapters.length <= 1) return
        setProject(prev => {
            const newChapters = prev.chapters.filter(ch => ch.id !== id)
            const newActive = prev.activeChapterId === id ? newChapters[0]?.id : prev.activeChapterId
            return { ...prev, chapters: newChapters, activeChapterId: newActive }
        })
    }

    const handleRenameChapter = (id, newTitle) => {
        setProject(prev => ({
            ...prev,
            chapters: prev.chapters.map(ch => ch.id === id ? { ...ch, title: newTitle } : ch),
        }))
    }

    const handleReorderChapters = (newChapters) => {
        setProject(prev => ({
            ...prev,
            chapters: newChapters.map((ch, i) => ({ ...ch, order: i })),
        }))
    }

    return (
        <div className={`editor-layout ${focusMode ? 'focus-mode' : ''}`}>
            {!focusMode && (
                <Sidebar
                    chapters={project.chapters}
                    activeChapterId={project.activeChapterId}
                    onSelectChapter={handleSelectChapter}
                    onAddChapter={handleAddChapter}
                    onDeleteChapter={handleDeleteChapter}
                    onRenameChapter={handleRenameChapter}
                    onReorderChapters={handleReorderChapters}
                    collapsed={sidebarCollapsed}
                    onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
                    totalWords={totalWords}
                    targetWords={project.targetWords}
                />
            )}

            <div className="editor-main">
                {/* Project header (hidden in focus mode) */}
                {!focusMode && (
                    <div className="editor-project-header">
                        <input
                            className="editor-project-title-input"
                            value={project.title}
                            onChange={e => setProject(prev => ({ ...prev, title: e.target.value }))}
                            placeholder="Untitled Novel"
                        />
                        <div className="editor-project-actions">
                            <button
                                className="editor-settings-btn"
                                onClick={() => setShowSettings(!showSettings)}
                                title="Project Settings"
                            >
                                <HiOutlineCog6Tooth />
                            </button>
                        </div>
                    </div>
                )}

                {/* Project Settings Panel */}
                {showSettings && !focusMode && (
                    <div className="editor-settings-panel glass-card" style={{ padding: '1rem', marginBottom: '1rem' }}>
                        <h4 style={{ margin: '0 0 0.75rem' }}>Project Settings</h4>
                        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                            <label style={{ fontSize: '0.85rem' }}>
                                Word Count Target:
                                <input
                                    type="number"
                                    className="tool-input"
                                    value={project.targetWords}
                                    onChange={e => setProject(prev => ({ ...prev, targetWords: parseInt(e.target.value) || 0 }))}
                                    style={{ width: '120px', marginLeft: '0.5rem' }}
                                />
                            </label>
                            <label style={{ fontSize: '0.85rem' }}>
                                Author Name:
                                <input
                                    className="tool-input"
                                    value={project.author}
                                    onChange={e => setProject(prev => ({ ...prev, author: e.target.value }))}
                                    style={{ width: '200px', marginLeft: '0.5rem' }}
                                />
                            </label>
                        </div>
                    </div>
                )}

                {/* Chapter title */}
                {!focusMode && activeChapter && (
                    <div className="editor-chapter-title">
                        {activeChapter.title}
                    </div>
                )}

                {/* Editor */}
                <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                    <NovelEditor
                        key={activeChapter?.id}
                        chapterId={activeChapter?.id}
                        content={activeChapter?.content || ''}
                        onChange={handleContentChange}
                        apiKey={apiKey}
                        aiModel={aiModel}
                        hasKey={hasKey}
                        focusMode={focusMode}
                        onToggleFocus={() => setFocusMode(!focusMode)}
                        lastSaved={lastSaved}
                        saving={saving}
                        projectTitle={project.title}
                        projectAuthor={project.author}
                        allChapters={project.chapters}
                        projectId={project.id}
                    />
                </div>

                {!focusMode && activeChapter && (
                    <StatusBar
                        chapterName={activeChapter.title}
                        wordCount={activeChapter.wordCount}
                        characterCount={activeChapter.content?.replace(/<[^>]*>/g, '').length || 0}
                        saving={saving}
                        lastSaved={lastSaved}
                    />
                )}
            </div>

            {!focusMode && thinkingPanelOpen && (
                <div
                    className="panel-resize-handle"
                    onMouseDown={handleResizeDragStart}
                    style={{ width: '4px', cursor: 'col-resize', background: '#2a2a2a', flexShrink: 0, zIndex: 50 }}
                />
            )}

            {!focusMode && (
                <ThinkingPanel
                    projectId={project.id}
                    width={thinkingPanelOpen ? panelWidth : 0}
                    open={thinkingPanelOpen}
                    onToggleOpen={setThinkingPanelOpen}
                    activeTab={activeThinkingTab}
                    onTabChange={setActiveThinkingTab}
                />
            )}
        </div>
    )
}
