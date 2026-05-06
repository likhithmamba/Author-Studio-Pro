import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { createThinkingCapture } from '../../api';

export default function QuickCapture({ open, onClose }) {
    const { token } = useAuth();
    const [content, setContent] = useState('');
    const [type, setType] = useState('note');
    const [tagInput, setTagInput] = useState('');
    const [tags, setTags] = useState([]);
    const [showDiscard, setShowDiscard] = useState(false);

    const textareaRef = useRef(null);

    useEffect(() => {
        if (open) {
            setContent('');
            setTags([]);
            setType('note');
            setTagInput('');
            setShowDiscard(false);
            setTimeout(() => {
                textareaRef.current?.focus();
            }, 100);
        }
    }, [open]);

    // Handle Escape Key
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (!open) return;
            if (e.key === 'Escape') {
                if (content.trim().length > 0) {
                    setShowDiscard(true);
                } else {
                    onClose();
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [open, content, onClose]);

    if (!open) return null;

    const handleSave = async () => {
        if (!content.trim()) return;
        
        // Find current project ID (this is a simplified implementation for the UI shell)
        // In full app, we would use a Router hook or Zustand store
        let projectId = null;
        try {
            const raw = localStorage.getItem('inkforge_editor_project');
            if (raw) projectId = JSON.parse(raw).id;
        } catch {}

        try {
            if (token) {
                createThinkingCapture({ project_id: projectId, content: content.trim(), tags, type }, token)
                    .catch(err => console.error('Failed to capture', err));
            }
            // Mock toast
            alert(projectId ? "Captured → Inbox" : "Saved to Global Inbox");
            onClose();
        } catch (err) {
            alert("Save failed.");
        }
    };

    const handleTagKeydown = (e) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            const tag = tagInput.trim();
            if (tag && !tags.includes(tag)) {
                setTags([...tags, tag]);
            }
            setTagInput('');
        }
    };

    const removeTag = (t) => setTags(tags.filter(tag => tag !== t));

    return (
        <div style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.6)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
        }} onClick={() => {}}>
            <div style={{
                background: '#1a1a1a',
                border: '1px solid #2a2a2a',
                borderRadius: '12px',
                width: '100%',
                maxWidth: '480px',
                boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
                display: 'flex',
                flexDirection: 'column'
            }} onClick={e => e.stopPropagation()}>
                
                {/* Header */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px',
                    borderBottom: '1px solid #2a2a2a'
                }}>
                    <h2 style={{ margin: 0, fontFamily: '"Cormorant Garamond", serif', fontSize: '18px', color: '#e8e0d5' }}>
                        Quick Capture
                    </h2>
                    <button onClick={() => content.trim() ? setShowDiscard(true) : onClose()} style={{
                        background: 'none', border: 'none', color: '#6b6560', cursor: 'pointer', fontSize: '16px'
                    }}>✕</button>
                </div>

                {/* Body */}
                <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    
                    {/* Textarea */}
                    <div style={{ position: 'relative' }}>
                        <textarea
                            ref={textareaRef}
                            value={content}
                            onChange={e => setContent(e.target.value)}
                            placeholder="Type to capture an idea..."
                            maxLength={2000}
                            style={{
                                width: '100%',
                                minHeight: '120px',
                                background: '#111',
                                border: '1px solid #2a2a2a',
                                borderRadius: '8px',
                                padding: '12px',
                                color: '#e8e0d5',
                                fontFamily: '"DM Sans", sans-serif',
                                fontSize: '14px',
                                resize: 'vertical',
                                boxSizing: 'border-box'
                            }}
                        />
                        <div style={{
                            position: 'absolute',
                            bottom: '8px',
                            right: '12px',
                            fontSize: '11px',
                            color: content.length >= 1800 ? '#c9915a' : '#6b6560',
                            fontFamily: '"DM Mono", monospace'
                        }}>
                            {content.length}/2000
                        </div>
                        
                        {showDiscard && (
                            <div style={{
                                marginTop: '8px', padding: '8px 12px', background: 'rgba(255,0,0,0.1)', 
                                border: '1px solid rgba(255,0,0,0.2)', borderRadius: '6px',
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '13px'
                            }}>
                                <span style={{ color: '#e8e0d5' }}>Discard this capture?</span>
                                <div>
                                    <button onClick={onClose} style={{
                                        background: 'transparent', border: '1px solid #ef4444', color: '#ef4444', 
                                        borderRadius: '4px', padding: '4px 8px', cursor: 'pointer', marginRight: '8px'
                                    }}>Discard</button>
                                    <button onClick={() => setShowDiscard(false)} style={{
                                        background: '#2a2a2a', border: '1px solid #444', color: '#e8e0d5', 
                                        borderRadius: '4px', padding: '4px 8px', cursor: 'pointer'
                                    }}>Keep Edit</button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Types */}
                    <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
                        {['note', 'scene_fragment', 'character_thought', 'plot_idea', 'research'].map(t => (
                            <button key={t} onClick={() => setType(t)} style={{
                                background: type === t ? 'rgba(201,145,90,0.1)' : '#111',
                                border: `1px solid ${type === t ? '#c9915a' : '#2a2a2a'}`,
                                color: type === t ? '#c9915a' : '#6b6560',
                                borderRadius: '16px',
                                padding: '4px 12px',
                                fontSize: '12px',
                                cursor: 'pointer',
                                whiteSpace: 'nowrap'
                            }}>
                                {t.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                            </button>
                        ))}
                    </div>

                    {/* Tags */}
                    <div>
                        <input
                            type="text"
                            value={tagInput}
                            onChange={e => setTagInput(e.target.value)}
                            onKeyDown={handleTagKeydown}
                            placeholder="Add tags, comma separated"
                            style={{
                                width: '100%',
                                background: '#111',
                                border: '1px solid #2a2a2a',
                                borderRadius: '6px',
                                padding: '8px 12px',
                                color: '#e8e0d5',
                                boxSizing: 'border-box'
                            }}
                        />
                        {tags.length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                                {tags.map(tag => (
                                    <span key={tag} style={{
                                        display: 'inline-flex', alignItems: 'center', background: 'rgba(201,145,90,0.1)',
                                        border: '1px solid #c9915a', color: '#c9915a', borderRadius: '4px', padding: '2px 6px', fontSize: '11px'
                                    }}>
                                        {tag}
                                        <button onClick={() => removeTag(tag)} style={{
                                            background: 'none', border: 'none', color: '#c9915a', marginLeft: '4px', cursor: 'pointer', padding: 0
                                        }}>×</button>
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Save Button */}
                <button 
                    onClick={handleSave}
                    disabled={!content.trim()}
                    style={{
                        width: '100%',
                        height: '40px',
                        background: '#c9915a',
                        color: '#07050A',
                        border: 'none',
                        borderBottomLeftRadius: '11px', /* to fit within modal's 12px */
                        borderBottomRightRadius: '11px',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: content.trim() ? 'pointer' : 'not-allowed',
                        opacity: content.trim() ? 1 : 0.5
                    }}
                >
                    Save Capture
                </button>
            </div>
        </div>
    );
}
