import React, { useState, useEffect, useRef } from 'react';
import IdeasTab from './tabs/IdeasTab';
import WhatIfTab from './tabs/WhatIfTab';
import ThreadsTab from './tabs/ThreadsTab';
import BranchesTab from './tabs/BranchesTab';
import GraveyardTab from './tabs/GraveyardTab';

export default function ThinkingPanel({ 
    projectId, 
    width, 
    open, 
    onToggleOpen, 
    activeTab, 
    onTabChange 
}) {
    const scrollPositions = useRef({
        ideas: 0, whatif: 0, threads: 0, branches: 0, graveyard: 0
    });
    
    const panelBodyRef = useRef(null);

    // Tab Scroll Memory
    useEffect(() => {
        // We handle saving scroll position just before tab switch in the tab click handler.
        // On mount or tab change, we restore the saved scroll position.
        if (panelBodyRef.current) {
            panelBodyRef.current.scrollTop = scrollPositions.current[activeTab] || 0;
        }
    }, [activeTab]);

    const handleTabClick = (tab) => {
        if (activeTab === tab) return;
        
        // Save current scroll position
        if (panelBodyRef.current) {
            scrollPositions.current[activeTab] = panelBodyRef.current.scrollTop;
        }
        
        onTabChange(tab);
    };

    if (!open) {
        return (
            <div style={{
                position: 'relative',
                width: 0,
                borderLeft: '1px solid #2a2a2a'
            }}>
                <button
                    onClick={() => onToggleOpen(true)}
                    style={{
                        position: 'absolute',
                        left: '-24px',
                        top: '16px',
                        width: '24px',
                        height: '24px',
                        background: '#1a1a1a',
                        border: '1px solid #2a2a2a',
                        borderRight: 'none',
                        borderTopLeftRadius: '4px',
                        borderBottomLeftRadius: '4px',
                        color: '#6b6560',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 10
                    }}
                >
                    ‹
                </button>
            </div>
        );
    }

    const tabs = [
        { id: 'ideas', label: 'Ideas' },
        { id: 'whatif', label: 'What-If' },
        { id: 'threads', label: 'Threads' },
        { id: 'branches', label: 'Branches' },
        { id: 'graveyard', label: 'Graveyard' }
    ];

    return (
        <div style={{
            width: `${width}px`,
            minWidth: `${width}px`,
            background: '#1a1a1a',
            borderLeft: '1px solid #2a2a2a',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            height: '100%',
            overflow: 'hidden'
        }}>
            <button
                onClick={() => onToggleOpen(false)}
                style={{
                    position: 'absolute',
                    left: 0,
                    top: '16px',
                    width: '24px',
                    height: '24px',
                    background: '#1a1a1a',
                    border: '1px solid #2a2a2a',
                    borderLeft: 'none',
                    borderTopRightRadius: '4px',
                    borderBottomRightRadius: '4px',
                    color: '#6b6560',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 10,
                    transform: 'translateX(-100%)' // Pull it out over the canvas but handle dragging safely
                }}
            >
                ›
            </button>

            {/* Tab Bar */}
            <div style={{
                display: 'flex',
                height: '44px',
                background: '#111',
                borderBottom: '1px solid #2a2a2a',
                flexShrink: 0
            }}>
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => handleTabClick(tab.id)}
                        style={{
                            flex: 1,
                            background: 'transparent',
                            border: 'none',
                            borderBottom: activeTab === tab.id ? '2px solid #c9915a' : '2px solid transparent',
                            color: activeTab === tab.id ? '#c9915a' : '#6b6560',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: activeTab === tab.id ? '600' : '400',
                            transition: 'all 0.2s',
                            padding: '0 4px',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                        }}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Body */}
            <div 
                ref={panelBodyRef}
                style={{
                    flex: 1,
                    overflowY: 'auto',
                    overflowX: 'hidden',
                    display: 'flex',
                    flexDirection: 'column'
                }}
            >
                {activeTab === 'ideas' && <IdeasTab projectId={projectId} />}
                {activeTab === 'whatif' && <WhatIfTab projectId={projectId} />}
                {activeTab === 'threads' && <ThreadsTab projectId={projectId} />}
                {activeTab === 'branches' && <BranchesTab projectId={projectId} />}
                {activeTab === 'graveyard' && <GraveyardTab projectId={projectId} />}
            </div>
        </div>
    );
}
