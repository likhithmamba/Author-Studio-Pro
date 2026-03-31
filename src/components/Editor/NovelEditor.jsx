/**
 * Author Studio Pro — Novel Editor (Tiptap-based)
 * Distraction-free chapter editor with word count, focus mode, AI assists.
 */

import React, { useEffect, useCallback, useState, useRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import CharacterCount from '@tiptap/extension-character-count'
import Placeholder from '@tiptap/extension-placeholder'
import Typography from '@tiptap/extension-typography'
import {
    HiOutlineBold, HiOutlineItalic, HiOutlineArrowUturnLeft,
    HiOutlineArrowUturnRight, HiOutlineSparkles, HiOutlineEyeSlash,
    HiOutlineEye, HiOutlineListBullet,
} from 'react-icons/hi2'
import { continueScene, rewriteParagraph, suggestNames } from './editorAI.js'
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
}) {
    const [aiLoading, setAiLoading] = useState(false)
    const [aiResult, setAiResult] = useState(null)
    const [showAiMenu, setShowAiMenu] = useState(false)

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

    if (!editor) return null

    return (
        <div className={`novel-editor ${focusMode ? 'focus-mode' : ''}`}>
            {/* Toolbar */}
            <div className="editor-toolbar">
                <div className="editor-toolbar-group">
                    <button
                        className={`editor-tb-btn ${editor.isActive('bold') ? 'active' : ''}`}
                        onClick={() => editor.chain().focus().toggleBold().run()}
                        title="Bold"
                    ><HiOutlineBold /></button>
                    <button
                        className={`editor-tb-btn ${editor.isActive('italic') ? 'active' : ''}`}
                        onClick={() => editor.chain().focus().toggleItalic().run()}
                        title="Italic"
                    ><HiOutlineItalic /></button>
                    <button
                        className={`editor-tb-btn ${editor.isActive('bulletList') ? 'active' : ''}`}
                        onClick={() => editor.chain().focus().toggleBulletList().run()}
                        title="Bullet List"
                    ><HiOutlineListBullet /></button>
                    <div className="editor-tb-divider" />
                    <button
                        className="editor-tb-btn"
                        onClick={() => editor.chain().focus().undo().run()}
                        disabled={!editor.can().undo()}
                        title="Undo"
                    ><HiOutlineArrowUturnLeft /></button>
                    <button
                        className="editor-tb-btn"
                        onClick={() => editor.chain().focus().redo().run()}
                        disabled={!editor.can().redo()}
                        title="Redo"
                    ><HiOutlineArrowUturnRight /></button>
                </div>

                <div className="editor-toolbar-group">
                    {/* AI Menu */}
                    {hasKey && (
                        <div className="editor-ai-menu-wrap">
                            <button
                                className={`editor-tb-btn editor-ai-btn ${showAiMenu ? 'active' : ''}`}
                                onClick={() => setShowAiMenu(!showAiMenu)}
                                disabled={aiLoading}
                                title="AI Assist"
                            >
                                <HiOutlineSparkles /> {aiLoading ? 'Working...' : 'AI'}
                            </button>
                            {showAiMenu && !aiLoading && (
                                <div className="editor-ai-dropdown">
                                    <button onClick={() => { handleContinue(); setShowAiMenu(false) }}>
                                        ✍️ Continue Scene
                                    </button>
                                    <button onClick={() => { handleRewrite(); setShowAiMenu(false) }}>
                                        🔄 Rewrite Selection
                                    </button>
                                    <button onClick={() => { handleSuggestNames(); setShowAiMenu(false) }}>
                                        🏷️ Suggest Names
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    <button
                        className={`editor-tb-btn ${focusMode ? 'active' : ''}`}
                        onClick={onToggleFocus}
                        title={focusMode ? 'Exit Focus Mode' : 'Focus Mode'}
                    >
                        {focusMode ? <HiOutlineEye /> : <HiOutlineEyeSlash />}
                    </button>
                </div>
            </div>

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

            {/* Status Bar */}
            <div className="editor-statusbar">
                <span>{wordCount.toLocaleString()} words · {charCount.toLocaleString()} characters</span>
                <span className="editor-save-status">
                    {saving ? '💾 Saving...' : lastSaved ? `Saved ${new Date(lastSaved).toLocaleTimeString()}` : 'Not yet saved'}
                </span>
            </div>
        </div>
    )
}
