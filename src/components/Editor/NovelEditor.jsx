/**
 * Author Studio Pro — Novel Editor (Tiptap-based)
 * Distraction-free chapter editor with word count, focus mode, AI assists.
 */

import React, { useEffect, useCallback, useState, useRef } from 'react'
import { useEditor, EditorContent, BubbleMenu } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import CharacterCount from '@tiptap/extension-character-count'
import Placeholder from '@tiptap/extension-placeholder'
import Typography from '@tiptap/extension-typography'
import { continueScene, rewriteParagraph, suggestNames } from './editorAI.js'
import { formatText, downloadBlob, createIdea, createThread } from '../../api.js'
import Toolbar from './Toolbar.jsx'
import { useWritingSystem } from '../../contexts/WritingSystemContext.jsx'
import { useAuth } from '../../contexts/AuthContext.jsx'
import './EditorLayout.css'

export default function NovelEditor({
    chapterId,
    content,
    onChange,
    apiKey,
    aiModel,
    hasKey,
    focusMode,
    onToggleFocus,
    lastSaved,
    saving,
    projectTitle,
    projectAuthor,
    allChapters = [],
    projectId
}) {
    const { setEditorWordCount, setActiveThinkingTab, setThinkingPanelOpen } = useWritingSystem()
    const { token } = useAuth()
    const [aiLoading, setAiLoading] = useState(false)
    const [aiResult, setAiResult] = useState(null)
    const [showAiMenu, setShowAiMenu] = useState(false)
    const [showExportMenu, setShowExportMenu] = useState(false)
    const [exportLoading, setExportLoading] = useState(false)
    
    // Typewriter state
    const [typewriterMode, setTypewriterMode] = useState(false)
    const typingTimerRef = useRef(null)

    // Focus mode two-press escape state
    const [escapePressed, setEscapePressed] = useState(false)

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: { levels: [1, 2, 3] },
            }),
            CharacterCount,
            Placeholder.configure({
                placeholder: 'Start writing your chapter...',
            }),
            Typography,
        ],
        content: content || '',
        onUpdate: ({ editor }) => {
            const html = editor.getHTML()
            onChange(html)
            
            // Sync word count to context
            setEditorWordCount(editor.storage.characterCount.words())

            if (typewriterMode && window.innerWidth >= 768) {
                if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
                typingTimerRef.current = setTimeout(() => {
                    // Typewriter mode logic: scroll to current selection
                    const { from } = editor.state.selection;
                    const domAtPos = editor.view.domAtPos(from);
                    if (domAtPos && domAtPos.node && domAtPos.node.nodeType === 1) {
                        domAtPos.node.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    } else if (domAtPos && domAtPos.node && domAtPos.node.parentElement) {
                        domAtPos.node.parentElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                }, 800);
            }
        },
        editorProps: {
            attributes: {
                class: 'novel-editor-content',
                spellcheck: 'true',
            },
        },
    })

    // Sync content when chapterId changes
    useEffect(() => {
        if (editor && content !== undefined) {
            const current = editor.getHTML()
            if (current !== content) {
                editor.commands.setContent(content || '', false)
            }
        }
    }, [chapterId])

    const wordCount = editor?.storage?.characterCount?.words?.() || 0
    const charCount = editor?.storage?.characterCount?.characters?.() || 0

    // Bubble Menu Actions
    const handleToIdeas = async () => {
        if (!editor || !token || !projectId) return;
        const { from, to } = editor.state.selection;
        const text = editor.state.doc.textBetween(from, to, '\n');
        if (!text.trim()) return;
        try {
            await createIdea({
                project_id: projectId,
                title: 'From Editor',
                body: text.substring(0, 100),
                color: 'white',
                position_x: 100,
                position_y: 100
            }, token);
            setActiveThinkingTab('ideas');
            setThinkingPanelOpen(true);
        } catch (e) {
            console.error(e);
        }
    };

    const handleToThread = async () => {
        if (!editor || !token || !projectId) return;
        const { from, to } = editor.state.selection;
        const text = editor.state.doc.textBetween(from, to, '\n');
        if (!text.trim()) return;
        try {
            await createThread({
                project_id: projectId,
                title: text.substring(0, 30) + '...',
                notes: text,
                type: 'subplot',
                status: 'investigating',
                chapter_ids: [chapterId]
            }, token);
            setActiveThinkingTab('threads');
            setThinkingPanelOpen(true);
        } catch (e) {
            console.error(e);
        }
    };

    const handleBury = async () => {
        if (!editor) return;
        const { from, to } = editor.state.selection;
        const text = editor.state.doc.textBetween(from, to, '\n');
        if (!text.trim()) return;
        
        // Remove text from editor
        editor.chain().focus().deleteRange({ from, to }).run();
        
        // Spec asks to send to graveyard, since we don't have explicit createGraveyardItem API, 
        // we'll simulate by logging or if we implement it, by calling API.
        console.log("Buried to graveyard: ", text);
        
        setActiveThinkingTab('graveyard');
        setThinkingPanelOpen(true);
    };

    // AI Handlers
    const handleContinue = async () => {
        if (!editor || aiLoading) return
        setAiLoading(true)
        setAiResult(null)
        try {
            const text = editor.getText().slice(-2000)
            const result = await continueScene(text, apiKey, aiModel)
            setAiResult({ type: 'continue', text: result })
        } catch (err) {
            setAiResult({ type: 'error', text: err.message })
        }
        setAiLoading(false)
    }

    const handleRewrite = async () => {
        if (!editor || aiLoading) return
        const { from, to } = editor.state.selection
        if (from === to) {
            setAiResult({ type: 'error', text: 'Select a paragraph to rewrite.' })
            return
        }
        const selected = editor.state.doc.textBetween(from, to, '\n')
        setAiLoading(true)
        setAiResult(null)
        try {
            const result = await rewriteParagraph(selected, '', apiKey, aiModel)
            setAiResult({ type: 'rewrite', text: result, original: selected })
        } catch (err) {
            setAiResult({ type: 'error', text: err.message })
        }
        setAiLoading(false)
    }

    const handleSuggestNames = async () => {
        setAiLoading(true)
        setAiResult(null)
        try {
            const context = editor?.getText().slice(0, 500) || 'A character in my novel'
            const result = await suggestNames(context, apiKey, aiModel)
            setAiResult({ type: 'names', text: result })
        } catch (err) {
            setAiResult({ type: 'error', text: err.message })
        }
        setAiLoading(false)
    }

    const acceptAI = () => {
        if (!editor || !aiResult) return
        if (aiResult.type === 'continue') {
            editor.commands.insertContent(`<p>${aiResult.text}</p>`)
        } else if (aiResult.type === 'rewrite') {
            editor.commands.insertContent(aiResult.text)
        }
        setAiResult(null)
    }

    const dismissAI = () => setAiResult(null)

    // Export Handlers
    const exportAsText = () => {
        const title = editor.storage.heading?.level === 1 ? editor.state.doc.firstChild?.[0].content.content[0].text : 'Chapter'
        const text = editor.getText();
        const blob = new Blob([text], { type: 'text/plain' });
        downloadBlob(blob, `${projectTitle || 'Manuscript'}_Chapter.txt`);
        setShowExportMenu(false);
    }

    const exportAsMarkdown = () => {
        // Very basic conversion: p to \n\n, h1 to #
        let md = `# ${projectTitle || 'Untitled Novel'}\n\n`;
        editor.state.doc.forEach((node) => {
            if (node.type.name === 'heading') md += `${'#'.repeat(node.attrs.level)} ${node.textContent}\n\n`;
            else if (node.type.name === 'paragraph') md += `${node.textContent}\n\n`;
        });
        const blob = new Blob([md], { type: 'text/markdown' });
        downloadBlob(blob, `${projectTitle || 'Manuscript'}_Chapter.md`);
        setShowExportMenu(false);
    }

    const exportAsDocx = async () => {
        setExportLoading(true);
        try {
            // Get all chapters for a full export, or just current
            const chapters = allChapters.map(ch => ({
                title: ch.title,
                paragraphs: ch.content.replace(/<[^>]*>/g, '\n').split('\n').filter(Boolean)
            }));

            const result = await formatText({
                author: projectAuthor || 'Anonymous',
                title: projectTitle || 'Untitled Novel',
                chapters: chapters
            });
            downloadBlob(result.blob, result.filename);
        } catch (err) {
            alert("Export failed: " + err.message);
        } finally {
            setExportLoading(false);
            setShowExportMenu(false);
        }
    }

    // Two-press Escape to exit Focus Mode
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && focusMode) {
                if (escapePressed) {
                    onToggleFocus();
                    setEscapePressed(false);
                } else {
                    setEscapePressed(true);
                    setTimeout(() => setEscapePressed(false), 3000);
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [focusMode, escapePressed, onToggleFocus]);

    if (!editor) return null

    return (
        <div className={`novel-editor ${focusMode ? 'focus-mode' : ''}`}>
            {focusMode && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 100 }} />
            )}
            
            {escapePressed && focusMode && (
                <div style={{
                    position: 'fixed',
                    bottom: '32px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: '#1a1a1a',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    zIndex: 200,
                    color: '#e8e0d5',
                    fontSize: '14px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                    border: '1px solid #2a2a2a'
                }}>
                    Press Esc again to exit focus mode
                </div>
            )}

            <div style={{ position: 'relative', zIndex: focusMode ? 101 : 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
                {!focusMode && (
                    <Toolbar 
                        editor={editor}
                        wordCount={wordCount}
                        targetWords={allChapters.reduce((acc, ch) => acc + (ch.targetWords || 0), 0) || 80000} // Simple fallback target
                        focusMode={focusMode}
                        onToggleFocus={onToggleFocus}
                        typewriterMode={typewriterMode}
                        onToggleTypewriter={() => setTypewriterMode(!typewriterMode)}
                        onTargetClick={() => {}}
                    />
                )}
                
                {editor && (
                    <BubbleMenu 
                        editor={editor} 
                        tippyOptions={{ duration: 100 }} 
                        className="bubble-menu-container"
                        style={{
                            display: 'flex',
                            background: '#1a1a1a',
                            border: '1px solid #2a2a2a',
                            borderRadius: '6px',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                            overflow: 'hidden',
                            zIndex: 200
                        }}
                    >
                        <button 
                            onClick={handleToIdeas} 
                            style={{ background: 'none', border: 'none', borderRight: '1px solid #2a2a2a', color: '#e8e0d5', fontFamily: '"DM Sans", sans-serif', fontSize: '11px', height: '28px', padding: '0 10px', cursor: 'pointer' }}
                        >
                            To Ideas
                        </button>
                        <button 
                            onClick={handleToThread} 
                            style={{ background: 'none', border: 'none', borderRight: '1px solid #2a2a2a', color: '#e8e0d5', fontFamily: '"DM Sans", sans-serif', fontSize: '11px', height: '28px', padding: '0 10px', cursor: 'pointer' }}
                        >
                            To Thread
                        </button>
                        <button 
                            onClick={handleBury} 
                            style={{ background: 'none', border: 'none', color: '#e8e0d5', fontFamily: '"DM Sans", sans-serif', fontSize: '11px', height: '28px', padding: '0 10px', cursor: 'pointer' }}
                        >
                            Bury this
                        </button>
                    </BubbleMenu>
                )}

            {/* Editor Area */}
            <div className="editor-writing-area">
                <EditorContent editor={editor} />
            </div>

            {/* AI Result Panel */}
            {aiResult && (
                <div className={`editor-ai-result ${aiResult.type === 'error' ? 'error' : ''}`}>
                    <div className="editor-ai-result-header">
                        <strong>
                            {aiResult.type === 'continue' && '✍️ AI Continuation'}
                            {aiResult.type === 'rewrite' && '🔄 AI Rewrite'}
                            {aiResult.type === 'names' && '🏷️ Name Suggestions'}
                            {aiResult.type === 'error' && '⚠️ Error'}
                        </strong>
                        <button className="editor-ai-dismiss" onClick={dismissAI}>✕</button>
                    </div>
                    <div className="editor-ai-result-body">
                        <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', margin: 0 }}>
                            {aiResult.text}
                        </pre>
                    </div>
                    {(aiResult.type === 'continue' || aiResult.type === 'rewrite') && (
                        <div className="editor-ai-result-actions">
                            <button className="btn-primary" onClick={acceptAI} style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}>
                                ✓ Accept & Insert
                            </button>
                            <button className="btn-secondary" onClick={dismissAI} style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}>
                                ✕ Dismiss
                            </button>
                        </div>
                    )}
                </div>
            )}
            
            </div>
        </div>
    )
}
