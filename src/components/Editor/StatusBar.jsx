import React, { useState, useEffect } from 'react';
import { useStoryStore } from '../../store/storyStore.js';

export default function StatusBar({ chapterName, wordCount, characterCount, saving, lastSaved }) {
    const readingTime = Math.ceil((wordCount || 0) / 200);
    const syncStatus = useStoryStore(state => state.sync.status);
    const syncLastSaved = useStoryStore(state => state.sync.lastSaved);
    const [now, setNow] = useState(Date.now());

    // Update "Xs ago" display every 5 seconds
    useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), 5000);
        return () => clearInterval(timer);
    }, []);

    // Prefer Zustand sync status, fall back to props
    let saveStatus = 'Saved';
    let saveColor = 'rgba(76,175,125,0.7)';

    if (syncStatus === 'saving' || saving) {
        saveStatus = 'Saving...';
        saveColor = '#c4903a';
    } else if (syncStatus === 'error') {
        saveStatus = 'Save failed';
        saveColor = '#ef4444';
    } else if (syncLastSaved) {
        const seconds = Math.round((now - syncLastSaved) / 1000);
        if (seconds < 5) {
            saveStatus = 'Just saved';
        } else if (seconds < 60) {
            saveStatus = `Saved ${seconds}s ago`;
        } else {
            saveStatus = `Saved ${Math.round(seconds / 60)}m ago`;
        }
        saveColor = 'rgba(76,175,125,0.7)';
    } else if (!lastSaved && !saving) {
        saveStatus = 'Waiting to save...';
        saveColor = '#6b6560';
    } else if (lastSaved === 'failed') {
        saveStatus = 'Save failed';
        saveColor = '#ef4444';
    }

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            height: '32px',
            background: '#111',
            color: '#6b6560',
            fontFamily: '"DM Mono", monospace',
            fontSize: '11px',
            padding: '0 16px',
            flexShrink: 0,
            borderTop: '1px solid #2a2a2a',
            zIndex: 10
        }}>
            <div style={{ flex: 1, textAlign: 'left', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {chapterName || 'No Chapter Selected'}
            </div>
            
            <div style={{ flex: 2, display: 'flex', justifyContent: 'center', gap: '24px' }}>
                <span>{wordCount || 0} words</span>
                <span>{characterCount || 0} chars</span>
                <span>{readingTime} min read</span>
            </div>

            <div style={{ flex: 1, textAlign: 'right', color: saveColor, transition: 'color 0.3s' }}>
                {syncStatus === 'saving' && (
                    <span style={{ marginRight: '4px', display: 'inline-block', animation: 'pulse 1s infinite' }}>●</span>
                )}
                {saveStatus}
            </div>
        </div>
    );
}
