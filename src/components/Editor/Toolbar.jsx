/**
 * Author Studio Pro — Premium Editor Toolbar v3
 * Minimal, dark, manuscript-grade formatting controls.
 */

import React, { useState, useEffect } from 'react';

export default function Toolbar({
    editor,
    wordCount,
    targetWords: propTargetWords,
    focusMode,
    onToggleFocus,
    typewriterMode,
    onToggleTypewriter
}) {
    const [fontFamily, setFontFamily] = useState(() => {
        try {
            return localStorage.getItem('asp:prefs:fontFamily') || 'Cormorant Garamond';
        } catch { return 'Cormorant Garamond'; }
    });

    const [fontSize, setFontSize] = useState(() => {
        try {
            return localStorage.getItem('asp:prefs:fontSize') || '18';
        } catch { return '18'; }
    });

    const [localTarget, setLocalTarget] = useState(() => {
        try {
            return parseInt(localStorage.getItem('asp:prefs:targetWords')) || propTargetWords || 80000;
        } catch { return propTargetWords || 80000; }
    });

    useEffect(() => {
        try {
            localStorage.setItem('asp:prefs:fontFamily', fontFamily);
            localStorage.setItem('asp:prefs:fontSize', fontSize);
            localStorage.setItem('asp:prefs:targetWords', localTarget);
        } catch {}
        
        const editorContainer = document.querySelector('.novel-editor-content');
        if (editorContainer) {
            editorContainer.style.fontFamily = fontFamily;
            editorContainer.style.fontSize = `${fontSize}px`;
        }
    }, [fontFamily, fontSize, localTarget]);

    const handleTargetClick = () => {
        const val = window.prompt("Enter new word count target:", localTarget);
        if (val && !isNaN(parseInt(val))) {
            setLocalTarget(parseInt(val));
        }
    };

    const insertSceneBreak = () => {
        if (!editor) return;
        editor.chain().focus().setHorizontalRule().run();
    };

    if (!editor) return null;

    const pct = localTarget > 0 ? (wordCount / localTarget) * 100 : 0;
    let barColor = 'rgba(255,255,255,0.06)';
    if (pct >= 100) barColor = '#4caf7d';
    else if (pct >= 80) barColor = '#c9915a';
    else if (pct > 0) barColor = 'rgba(201, 145, 90, 0.4)';

    return (
        <div className="editor-toolbar">
            <div className="editor-toolbar-inner">
                {/* Formatting */}
                <div className="editor-tb-group">
                    <button className={`editor-tb-btn ${editor.isActive('bold') ? 'active' : ''}`} onClick={() => editor.chain().focus().toggleBold().run()} title="Bold" aria-label="Bold">
                        <strong>B</strong>
                    </button>
                    <button className={`editor-tb-btn ${editor.isActive('italic') ? 'active' : ''}`} onClick={() => editor.chain().focus().toggleItalic().run()} title="Italic" aria-label="Italic">
                        <em>I</em>
                    </button>
                    <button className={`editor-tb-btn ${editor.isActive('strike') ? 'active' : ''}`} onClick={() => editor.chain().focus().toggleStrike?.().run()} title="Strikethrough" aria-label="Strikethrough">
                        <s>S</s>
                    </button>
                </div>

                <div className="editor-tb-divider" />

                {/* Structure */}
                <div className="editor-tb-group">
                    <button className={`editor-tb-btn ${editor.isActive('heading', { level: 1 }) ? 'active' : ''}`} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} title="Heading 1" aria-label="Heading 1">H1</button>
                    <button className={`editor-tb-btn ${editor.isActive('heading', { level: 2 }) ? 'active' : ''}`} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="Heading 2" aria-label="Heading 2">H2</button>
                    <button className={`editor-tb-btn ${editor.isActive('blockquote') ? 'active' : ''}`} onClick={() => editor.chain().focus().toggleBlockquote().run()} title="Blockquote" aria-label="Blockquote">"</button>
                    <button className="editor-tb-btn" onClick={insertSceneBreak} title="Scene break" aria-label="Scene break">⁂</button>
                </div>

                <div className="editor-tb-divider" />

                {/* Typography */}
                <div className="editor-tb-group">
                    <select 
                        value={fontFamily} 
                        onChange={e => setFontFamily(e.target.value)}
                        className="editor-tb-select"
                        title="Font"
                    >
                        <option value="Cormorant Garamond">Cormorant</option>
                        <option value="Georgia">Georgia</option>
                        <option value="Courier New">Courier</option>
                        <option value="Lora">Lora</option>
                    </select>

                    <select 
                        value={fontSize} 
                        onChange={e => setFontSize(e.target.value)}
                        className="editor-tb-select"
                        title="Font size"
                    >
                        {[14, 16, 18, 20, 22, 24].map(size => (
                            <option key={size} value={size}>{size}</option>
                        ))}
                    </select>
                </div>

                <div className="editor-tb-divider" />

                {/* Modes */}
                <div className="editor-tb-group">
                    <button className={`editor-tb-btn ${focusMode ? 'active' : ''}`} onClick={onToggleFocus} title="Focus mode (double-Esc to exit)">
                        Focus
                    </button>
                    {window.innerWidth >= 768 && (
                        <button className={`editor-tb-btn ${typewriterMode ? 'active' : ''}`} onClick={onToggleTypewriter} title="Typewriter scroll">
                            Typewriter
                        </button>
                    )}
                </div>

                <div className="editor-tb-spacer" />

                {/* Word Count */}
                <div 
                    className="editor-tb-wordcount"
                    onClick={handleTargetClick}
                    title="Click to set word target"
                >
                    {wordCount.toLocaleString()} / {localTarget.toLocaleString()}
                </div>
            </div>

            {/* Thin progress bar */}
            <div className="editor-tb-progress">
                <div 
                    className="editor-tb-progress-fill" 
                    style={{ 
                        width: `${Math.min(pct, 100)}%`,
                        background: barColor,
                    }} 
                />
            </div>
        </div>
    );
}
