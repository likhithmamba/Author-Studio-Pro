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
import { useSyncEngine } from './useChapterSave.js'
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts.js'
import { HiOutlineCog6Tooth } from 'react-icons/hi2'
import { useWritingSystem } from '../../contexts/WritingSystemContext.jsx'
import { useStoryStore } from '../../store/storyStore.js'
import { loadNodes } from '../../api.js'
import { useAuth } from '../../contexts/AuthContext.jsx'
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
    const [focusMode, setFocusMode] = useState(false)
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
    const [showSettings, setShowSettings] = useState(false)

    // Context & Store State
    const { 
        thinkingPanelOpen, setThinkingPanelOpen, 
        activeThinkingTab, setActiveThinkingTab 
    } = useWritingSystem();
    
    const { token } = useAuth();
    
    // Store Actions & State
    const { 
        projectTitle, setProject, 
        chapters, chapterOrder, 
        editor, setActiveChapter,
        addChapter, removeChapter, updateChapterTitle, reorderChapters,
        updateChapterContent,
        isRehydrating,
        sync
    } = useStoryStore();

    const activeChapterId = editor.activeChapterId;
    const activeChapter = chapters[activeChapterId] || chapters[chapterOrder[0]];

    const totalWords = Object.values(chapters).reduce((sum, ch) => sum + (ch.wordCount || 0), 0);

    // Sidebar Handlers
    const handleAddChapter = () => addChapter('New Chapter');
    const handleDeleteChapter = (id) => removeChapter(id);
    const handleRenameChapter = (id, title) => updateChapterTitle(id, title);
    const handleReorderChapters = (newIds) => reorderChapters(newIds);
    const handleSelectChapter = (id) => setActiveChapter(id);

    // Editor Handler
    const handleContentChange = useCallback((html) => {
        const wc = html ? html.replace(/<[^>]*>/g, ' ').split(/\s+/).filter(Boolean).length : 0;
        updateChapterContent(activeChapterId, html, wc);
    }, [activeChapterId, updateChapterContent]);

    // UI Configuration Persistence (Panel Width etc.)
    const [panelWidth, setPanelWidth] = useState(320);

    return (
        <div className={`editor-layout ${focusMode ? 'focus-mode' : ''}`}>
            {!focusMode && (
                <Sidebar
                    chapters={chapterOrder.map(id => chapters[id])}
                    activeChapterId={activeChapterId}
                    onSelectChapter={handleSelectChapter}
                    onAddChapter={handleAddChapter}
                    onDeleteChapter={handleDeleteChapter}
                    onRenameChapter={handleRenameChapter}
                    onReorderChapters={(newList) => handleReorderChapters(newList.map(c => c.id))}
                    collapsed={sidebarCollapsed}
                    onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
                    totalWords={totalWords}
                    targetWords={settings?.targetWords || 80000}
                />
            )}

            <div className="editor-main">
                {/* Project header (hidden in focus mode) */}
                {!focusMode && (
                    <div className="editor-project-header">
                        <input
                            className="editor-project-title-input"
                            value={projectTitle}
                            onChange={e => setProject(useStoryStore.getState().projectId, e.target.value)}
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

                {/* Chapter title */}
                {!focusMode && activeChapter && (
                    <div className="editor-chapter-title">
                        {activeChapter.title}
                    </div>
                )}

                {/* Editor */}
                <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                    <NovelEditor
                        key={activeChapterId}
                        chapterId={activeChapterId}
                        content={activeChapter?.content || ''}
                        onChange={handleContentChange}
                        apiKey={apiKey}
                        aiModel={aiModel}
                        hasKey={hasKey}
                        focusMode={focusMode}
                        onToggleFocus={() => setFocusMode(!focusMode)}
                        lastSaved={sync.lastSaved}
                        saving={sync.status === 'saving'}
                        projectTitle={projectTitle}
                        projectId={useStoryStore.getState().projectId}
                    />
                </div>

                {!focusMode && activeChapter && (
                    <StatusBar
                        chapterName={activeChapter.title}
                        wordCount={activeChapter.wordCount}
                        characterCount={activeChapter.content?.replace(/<[^>]*>/g, '').length || 0}
                        saving={sync.status === 'saving'}
                        lastSaved={sync.lastSaved}
                    />
                )}
            </div>

            {!focusMode && thinkingPanelOpen && (
                <ThinkingPanel
                    projectId={useStoryStore.getState().projectId}
                    width={activeThinkingTab === 'graph' ? Math.max(panelWidth, 500) : panelWidth}
                    open={thinkingPanelOpen}
                    onToggleOpen={setThinkingPanelOpen}
                    activeTab={activeThinkingTab}
                    onTabChange={setActiveThinkingTab}
                />
            )}
        </div>
    )
}
