/**
 * Author Studio Pro — Editor Layout v3
 * Container connecting Sidebar, NovelEditor, ThinkingPanel.
 * Clean three-panel layout. No modals — formatting is in Publishing Tools.
 */

import React, { useState, useCallback } from 'react'
import Sidebar from './Sidebar.jsx'
import NovelEditor from './NovelEditor.jsx'
import StatusBar from './StatusBar.jsx'
import StoryCurve from './StoryCurve.jsx'
import ThinkingPanel from '../ThinkingPanel/ThinkingPanel.jsx'
import { HiOutlineCog6Tooth } from 'react-icons/hi2'
import { useWritingSystem } from '../../contexts/WritingSystemContext.jsx'
import { useStoryStore } from '../../store/storyStore.js'
import { useAuth } from '../../contexts/AuthContext.jsx'
import './EditorLayout.css'

export default function EditorLayout({ apiKey, aiModel, hasKey, settings }) {
    const [focusMode, setFocusMode] = useState(false)
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
    const [showSettings, setShowSettings] = useState(false)
    const [viewMode, setViewMode] = useState('editor') // 'editor' | 'curve'

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

    // UI Configuration
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
                {/* Project header */}
                {!focusMode && (
                    <div className="editor-project-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
                            <input
                                className="editor-project-title-input"
                                value={projectTitle}
                                onChange={e => setProject(useStoryStore.getState().projectId, e.target.value)}
                                placeholder="Untitled Novel"
                            />
                            <div style={{ display: 'flex', gap: '2px', background: 'rgba(255,255,255,0.03)', padding: '3px', borderRadius: '6px' }}>
                                <button
                                    onClick={() => setViewMode('editor')}
                                    className={`editor-tb-btn ${viewMode === 'editor' ? 'active' : ''}`}
                                    style={{ fontSize: '0.7rem' }}
                                >Editor</button>
                                <button
                                    onClick={() => setViewMode('curve')}
                                    className={`editor-tb-btn ${viewMode === 'curve' ? 'active' : ''}`}
                                    style={{ fontSize: '0.7rem' }}
                                >Story Curve</button>
                            </div>
                        </div>
                        <div className="editor-project-actions">
                            <button
                                onClick={() => setThinkingPanelOpen(!thinkingPanelOpen)}
                                className={`editor-tb-btn ${thinkingPanelOpen ? 'active' : ''}`}
                                title="Toggle Intelligence Panel"
                                style={{ fontSize: '0.75rem', padding: '0.4rem 0.8rem' }}
                            >
                                ✦ Intelligence
                            </button>
                        </div>
                    </div>
                )}

                {/* Chapter title strip */}
                {!focusMode && activeChapter && viewMode === 'editor' && (
                    <div className="editor-chapter-title">
                        {activeChapter.title}
                    </div>
                )}

                {/* Main View Area */}
                <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                    {viewMode === 'editor' ? (
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
                    ) : (
                        <StoryCurve />
                    )}
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
                <div className="thinking-panel-wrap">
                    <ThinkingPanel
                        projectId={useStoryStore.getState().projectId}
                        width={activeThinkingTab === 'graph' ? Math.max(panelWidth, 500) : panelWidth}
                        open={thinkingPanelOpen}
                        onToggleOpen={setThinkingPanelOpen}
                        activeTab={activeThinkingTab}
                        onTabChange={setActiveThinkingTab}
                    />
                </div>
            )}
        </div>
    )
}
