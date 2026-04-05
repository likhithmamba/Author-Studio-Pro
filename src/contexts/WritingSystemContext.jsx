import React, { createContext, useContext, useState } from 'react';

const WritingSystemContext = createContext();

export function WritingSystemProvider({ children }) {
    const [activeChapterId, setActiveChapterId] = useState(null);
    const [activeThinkingTab, setActiveThinkingTab] = useState('ideas');
    const [thinkingPanelOpen, setThinkingPanelOpen] = useState(false);
    const [quickCaptureOpen, setQuickCaptureOpen] = useState(false);
    const [globalSearchOpen, setGlobalSearchOpen] = useState(false);
    const [chapterThreadsMap, setChapterThreadsMap] = useState({});
    const [highlightCardId, setHighlightCardId] = useState(null);
    const [editorWordCount, setEditorWordCount] = useState(0);

    const value = {
        activeChapterId, setActiveChapterId,
        activeThinkingTab, setActiveThinkingTab,
        thinkingPanelOpen, setThinkingPanelOpen,
        quickCaptureOpen, setQuickCaptureOpen,
        globalSearchOpen, setGlobalSearchOpen,
        chapterThreadsMap, setChapterThreadsMap,
        highlightCardId, setHighlightCardId,
        editorWordCount, setEditorWordCount
    };

    return (
        <WritingSystemContext.Provider value={value}>
            {children}
        </WritingSystemContext.Provider>
    );
}

export function useWritingSystem() {
    return useContext(WritingSystemContext);
}
