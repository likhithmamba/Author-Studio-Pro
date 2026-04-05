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
            return localStorage.getItem('asp:prefs:fontFamily') || 'Georgia';
        } catch { return 'Georgia'; }
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

    // Handle Scene Break
    const insertSceneBreak = () => {
        if (!editor) return;
        editor.chain().focus().insertContent('<p style="text-align: center;">* * *</p><p></p>').run();
    };

    if (!editor) return null;

    const pct = localTarget > 0 ? (wordCount / localTarget) * 100 : 0;
    let barColor = '#2a2a2a';
    if (pct >= 100) barColor = '#4caf7d';
    else if (pct >= 80) barColor = '#c9915a';

    return (
        <div style={{ position: 'sticky', top: 0, zIndex: 40, background: '#111', borderBottom: '1px solid #2a2a2a' }}>
            <div style={{
                display: 'flex',
                alignItems: 'center',
                height: '44px',
                padding: '0 8px',
                overflowX: 'auto',
                whiteSpace: 'nowrap',
                gap: '8px'
            }}>
                {/* Group 1: Formatting */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                    <button className={`editor-tb-btn ${editor.isActive('bold') ? 'active' : ''}`} onClick={() => editor.chain().focus().toggleBold().run()}>B</button>
                    <button className={`editor-tb-btn ${editor.isActive('italic') ? 'active' : ''}`} onClick={() => editor.chain().focus().toggleItalic().run()}>I</button>
                    <button className={`editor-tb-btn ${editor.isActive('underline') ? 'active' : ''}`} onClick={() => editor.chain().focus().toggleUnderline?.().run()}>U</button>
                    <button className={`editor-tb-btn ${editor.isActive('strike') ? 'active' : ''}`} onClick={() => editor.chain().focus().toggleStrike?.().run()}>S</button>
                    
                    <select 
                        value={fontFamily} 
                        onChange={e => setFontFamily(e.target.value)}
                        style={{ background: '#1a1a1a', color: '#e8e0d5', border: '1px solid #2a2a2a', borderRadius: '4px', padding: '2px 4px', fontSize: '12px', marginLeft: '4px' }}
                    >
                        <option value="Cormorant Garamond">Cormorant Garamond</option>
                        <option value="Georgia">Georgia</option>
                        <option value="Courier New">Courier New</option>
                    </select>

                    <select 
                        value={fontSize} 
                        onChange={e => setFontSize(e.target.value)}
                        style={{ background: '#1a1a1a', color: '#e8e0d5', border: '1px solid #2a2a2a', borderRadius: '4px', padding: '2px 4px', fontSize: '12px', marginLeft: '4px' }}
                    >
                        {[12, 14, 16, 18, 20, 24, 28, 32].map(size => (
                            <option key={size} value={size}>{size}px</option>
                        ))}
                    </select>
                </div>

                <div className="editor-tb-divider" />

                {/* Group 2: Structure */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                    <button className={`editor-tb-btn ${editor.isActive('heading', { level: 1 }) ? 'active' : ''}`} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>H1</button>
                    <button className={`editor-tb-btn ${editor.isActive('heading', { level: 2 }) ? 'active' : ''}`} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>H2</button>
                    <button className={`editor-tb-btn ${editor.isActive('heading', { level: 3 }) ? 'active' : ''}`} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>H3</button>
                    
                    <button className={`editor-tb-btn ${editor.isActive('blockquote') ? 'active' : ''}`} onClick={() => editor.chain().focus().toggleBlockquote().run()}>”</button>
                    <button className={`editor-tb-btn ${editor.isActive('bulletList') ? 'active' : ''}`} onClick={() => editor.chain().focus().toggleBulletList().run()}>•</button>
                    <button className={`editor-tb-btn ${editor.isActive('orderedList') ? 'active' : ''}`} onClick={() => editor.chain().focus().toggleOrderedList?.().run()}>1.</button>
                    <button className="editor-tb-btn" onClick={() => editor.chain().focus().setHorizontalRule().run()}>—</button>
                    <button className="editor-tb-btn" onClick={insertSceneBreak}>Element</button>
                </div>

                <div className="editor-tb-divider" />

                {/* Group 3: Writer Tools */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button className={`editor-tb-btn ${focusMode ? 'active' : ''}`} onClick={onToggleFocus}>Focus Mode</button>
                    <button className={`editor-tb-btn ${typewriterMode ? 'active' : ''}`} onClick={onToggleTypewriter} style={{ display: window.innerWidth < 768 ? 'none' : 'block' }}>Typewriter</button>
                    
                    <div 
                        onClick={handleTargetClick}
                        style={{ fontSize: '12px', color: '#c9915a', cursor: 'pointer', marginLeft: 'auto', paddingLeft: '8px' }}
                        title="Click to edit target words"
                    >
                        {wordCount} / {localTarget}
                    </div>
                </div>
            </div>

            {/* Progress Bar */}
            <div style={{ width: '100%', height: '2px', background: '#2a2a2a' }}>
                <div style={{ height: '100%', background: barColor, width: `${Math.min(pct, 100)}%`, transition: 'width 0.3s' }} />
            </div>
        </div>
    );
}
