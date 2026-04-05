import React from 'react';

export default function StatusBar({ chapterName, wordCount, characterCount, saving, lastSaved }) {
    const readingTime = Math.ceil((wordCount || 0) / 200);

    let saveStatus = 'Saved';
    if (saving) {
        saveStatus = 'Saving...';
    } else if (!lastSaved && !saving) {
        saveStatus = 'Waiting to save...';
    } else if (lastSaved === 'failed') {
        saveStatus = 'Save failed';
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

            <div style={{ flex: 1, textAlign: 'right' }}>
                {saveStatus}
            </div>
        </div>
    );
}
