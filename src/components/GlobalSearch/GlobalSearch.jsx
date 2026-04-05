import React, { useState, useEffect, useRef } from 'react';
import { HiOutlineDocumentText, HiOutlineLightBulb, HiOutlineQuestionMarkCircle, HiOutlineBars3CenterLeft, HiOutlineArrowUturnRight } from 'react-icons/hi2';

export default function GlobalSearch({ open, onClose }) {
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef(null);

    // Mock search results
    const allResults = [
        { id: '1', type: 'Manuscript', title: 'Chapter 1', snippet: 'The sun set over the ruins...', icon: <HiOutlineDocumentText /> },
        { id: '2', type: 'Idea', title: 'Hero Origin', snippet: 'Discovers power in the ruins.', icon: <HiOutlineLightBulb /> },
        { id: '3', type: 'What-If', title: 'Mentor dies?', snippet: 'Forces hero to learn on the fly.', icon: <HiOutlineQuestionMarkCircle /> },
        { id: '4', type: 'Thread', title: 'Find the relic', snippet: 'Located in the old temple', icon: <HiOutlineBars3CenterLeft /> },
        { id: '5', type: 'Branch', title: 'If he takes the money', snippet: 'He buys the ship.', icon: <HiOutlineArrowUturnRight /> },
    ];

    const results = query.trim() ? allResults.filter(r => 
        r.title.toLowerCase().includes(query.toLowerCase()) || 
        r.snippet.toLowerCase().includes(query.toLowerCase())
    ) : [];

    useEffect(() => {
        if (open) {
            setQuery('');
            setSelectedIndex(0);
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [open]);

    // Handle Escape for GlobalSearch
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (!open) return;
            
            if (e.key === 'Escape') {
                e.preventDefault();
                onClose();
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex(prev => Math.max(prev - 1, 0));
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (results[selectedIndex]) {
                    handleSelect(results[selectedIndex]);
                }
            }
        };
        
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [open, results, selectedIndex, onClose]);

    const handleSelect = (item) => {
        alert(`Navigating to ${item.type}: ${item.title}`);
        onClose();
    };

    if (!open) return null;

    return (
        <div style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.6)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            paddingTop: '10vh'
        }} onClick={onClose}>
            <div style={{
                background: '#1a1a1a',
                border: '1px solid #2a2a2a',
                borderRadius: '12px',
                width: '100%',
                maxWidth: '600px',
                boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
            }} onClick={e => e.stopPropagation()}>
                
                {/* Input */}
                <input
                    ref={inputRef}
                    value={query}
                    onChange={e => { setQuery(e.target.value); setSelectedIndex(0); }}
                    placeholder="Search manuscript, ideas, and scenarios..."
                    style={{
                        width: '100%',
                        background: 'transparent',
                        border: 'none',
                        borderBottom: '1px solid #2a2a2a',
                        padding: '16px 24px',
                        fontSize: '18px',
                        color: '#e8e0d5',
                        outline: 'none',
                        fontFamily: '"DM Sans", sans-serif',
                        boxSizing: 'border-box'
                    }}
                />

                {/* Results List */}
                {results.length > 0 && (
                    <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                        {results.map((result, idx) => {
                            const isSelected = idx === selectedIndex;
                            return (
                                <div 
                                    key={result.id}
                                    onClick={() => handleSelect(result)}
                                    onMouseEnter={() => setSelectedIndex(idx)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        padding: '12px 24px',
                                        background: isSelected ? 'rgba(201,145,90,0.1)' : 'transparent',
                                        borderLeft: `3px solid ${isSelected ? '#c9915a' : 'transparent'}`,
                                        cursor: 'pointer',
                                        gap: '16px'
                                    }}
                                >
                                    <div style={{ color: '#c9915a', fontSize: '20px', display: 'flex' }}>
                                        {result.icon}
                                    </div>
                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                        <div style={{ color: isSelected ? '#e8e0d5' : '#bbb', fontSize: '14px', fontWeight: 'bold' }}>
                                            {result.title}
                                        </div>
                                        <div style={{ color: '#6b6560', fontSize: '12px' }}>
                                            {result.snippet}
                                        </div>
                                    </div>
                                    <div style={{ fontSize: '10px', color: '#6b6560', padding: '2px 6px', border: '1px solid #2a2a2a', borderRadius: '4px', textTransform: 'uppercase' }}>
                                        {result.type}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
                
                {query.trim() && results.length === 0 && (
                    <div style={{ padding: '32px', textAlign: 'center', color: '#6b6560', fontSize: '14px' }}>
                        No results found for "{query}"
                    </div>
                )}
            </div>
        </div>
    );
}
