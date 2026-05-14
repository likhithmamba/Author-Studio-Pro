import React, { useState, useRef, useEffect, useMemo } from 'react';
import IdeaCard from './IdeaCard';
import { HiOutlinePlus, HiOutlineMagnifyingGlassMinus, HiOutlineMagnifyingGlassPlus, HiOutlineArrowsPointingOut } from 'react-icons/hi2';
import { useAuth } from '../../../contexts/AuthContext';
import { getIdeas, createIdea, updateIdea, deleteIdea, createIdeaConnection } from '../../../api';
import { useStoryStore } from '../../../store/storyStore';
import { runSignalEngine } from '../../../utils/signalEngine';
import { mergeToMetaSignals } from '../../../utils/metaSignalLayer';

export default function IdeasTab({ projectId }) {
    const { token } = useAuth();
    
    // Canvas State
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [isPanning, setIsPanning] = useState(false);
    
    // Data State
    const [cards, setCards] = useState([]);
    const [connections, setConnections] = useState([]);
    const [signalIdeas, setSignalIdeas] = useState([]);

    // ⚡ Bolt Optimization: O(1) card lookups for high-frequency render loops (pan/zoom)
    const cardMap = useMemo(() => {
        const map = {};
        for (let i = 0; i < cards.length; i++) {
            if (!map[cards[i].id]) {
                map[cards[i].id] = cards[i];
            }
        }
        return map;
    }, [cards]);

    useEffect(() => {
        if (!projectId || !token) return;
        getIdeas(projectId, token).then(data => {
            if (data.cards) setCards(data.cards.map(c => ({...c, x: c.position_x || 0, y: c.position_y || 0})));
            if (data.connections) setConnections(data.connections);
        }).catch(err => console.error("Failed to load ideas:", err));

        // SSO signal-driven ideas
        try {
            const snapshot = useStoryStore.getState();
            const signals = runSignalEngine(snapshot);
            const metas = mergeToMetaSignals(signals);
            const topIdeas = (metas.length > 0 ? metas : signals).slice(0, 3);
            setSignalIdeas(topIdeas);
        } catch(e) { console.warn('Signal Engine Error:', e); }

    }, [projectId, token]);

    const [selectedCardId, setSelectedCardId] = useState(null);
    const [connectingMode, setConnectingMode] = useState(null); // { sourceId, targetPos: {x,y} }
    const [contextMenu, setContextMenu] = useState(null); // { type, x, y, cardId, canvasX, canvasY }
    
    const canvasRef = useRef(null);
    const panStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

    // Handle Wheel Zoom
    const handleWheel = (e) => {
        if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            const zoomDelta = e.deltaY > 0 ? -0.1 : 0.1;
            setZoom(z => Math.min(Math.max(0.2, z + zoomDelta), 3));
        } else {
            // Trackpad panning
            setPan(p => ({ x: p.x - e.deltaX, y: p.y - e.deltaY }));
        }
    };

    // Canvas Panning
    const handlePointerDown = (e) => {
        if (contextMenu) setContextMenu(null);
        if (e.button === 1 || e.button === 0) {
            setIsPanning(true);
            panStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
            setSelectedCardId(null);
        }
    };

    const handlePointerMove = (e) => {
        if (isPanning) {
            const dx = e.clientX - panStart.current.x;
            const dy = e.clientY - panStart.current.y;
            setPan({ x: panStart.current.panX + dx, y: panStart.current.panY + dy });
        } else if (connectingMode) {
            // Update temporary connection arrow line end point
            const rect = canvasRef.current.getBoundingClientRect();
            setConnectingMode({
                ...connectingMode,
                targetPos: {
                    x: (e.clientX - rect.left - pan.x) / zoom,
                    y: (e.clientY - rect.top - pan.y) / zoom
                }
            });
        }
    };

    const handlePointerUp = () => {
        setIsPanning(false);
        if (connectingMode) {
            setConnectingMode(null); // Dropped connection
        }
    };

    // Card Actions
    const handleCardMove = (id, dx, dy, isFinal) => {
        setCards(prevCards => {
            const nextCards = prevCards.map(c => c.id === id ? { ...c, x: c.x + (dx/zoom), y: c.y + (dy/zoom) } : c);
            if (isFinal && token) {
                const movedCard = nextCards.find(c => c.id === id);
                if (movedCard && !String(id).startsWith('new_')) {
                    updateIdea(id, { position_x: Math.round(movedCard.x), position_y: Math.round(movedCard.y) }, token)
                        .catch(err => console.error('Failed to sync card position', err));
                }
            }
            return nextCards;
        });
    };

    const handleCardUpdate = (id, updates) => {
        setCards(cards.map(c => c.id === id ? { ...c, ...updates } : c));
        if (token && !String(id).startsWith('new_')) {
            updateIdea(id, updates, token).catch(err => console.error('Sync failed', err));
        }
    };

    const handleConnectStart = (id) => {
        setConnectingMode({ sourceId: id, targetPos: null });
    };

    const handleConnectEnd = (targetId) => {
        if (connectingMode && connectingMode.sourceId !== targetId) {
            const newConn = {
                id: `c_${Date.now()}`,
                from: connectingMode.sourceId,
                to: targetId
            };
            setConnections([...connections, { ...newConn }]);
            if (token) {
                createIdeaConnection({ project_id: projectId, from_card_id: newConn.from, to_card_id: newConn.to }, token)
                    .catch(err => console.error('Failed to link', err));
            }
        }
        setConnectingMode(null);
    };

    // New Card
    const addNewCard = (xPos, yPos, title = 'New Idea', body = '') => {
        const optimisticId = `new_${Date.now()}`;
        const x = xPos !== undefined ? xPos : -pan.x/zoom + 100;
        const y = yPos !== undefined ? yPos : -pan.y/zoom + 100;
        const newCard = { id: optimisticId, x, y, title, body, color: 'white' };
        setCards([...cards, newCard]);
        setSelectedCardId(optimisticId);
        
        if (token && projectId) {
            createIdea({ project_id: projectId, title, body, color: 'white', position_x: Math.round(x), position_y: Math.round(y) }, token)
                .then(res => {
                    if (res && res.id) {
                        setCards(prev => prev.map(c => c.id === optimisticId ? { ...c, id: res.id } : c));
                        setSelectedCardId(res.id);
                    }
                }).catch(err => console.error('Failed to save new card', err));
        }
    };

    // Context Menus
    const handleCanvasContextMenu = (e) => {
        e.preventDefault();
        const rect = canvasRef.current.getBoundingClientRect();
        const canvasX = (e.clientX - rect.left - pan.x) / zoom;
        const canvasY = (e.clientY - rect.top - pan.y) / zoom;
        setContextMenu({ type: 'canvas', x: e.clientX, y: e.clientY, canvasX, canvasY });
    };

    const handleCardContextMenu = (e, id) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenu({ type: 'card', x: e.clientX, y: e.clientY, cardId: id });
    };

    const deleteCard = (id) => {
        setCards(cards.filter(c => c.id !== id));
        setConnections(connections.filter(c => c.from !== id && c.to !== id));
        setContextMenu(null);
        if (token && !String(id).startsWith('new_')) {
            deleteIdea(id, token).catch(err => console.error('Failed to delete card', err));
        }
    };

    const changeCardColor = (id, color) => {
        handleCardUpdate(id, { color });
        setContextMenu(null);
    };

    // Fit All
    const fitAll = () => {
        setPan({ x: 0, y: 0 });
        setZoom(1);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#07050A' }}>
            {/* Toolbar */}
            <div style={{
                height: '40px', background: '#111', borderBottom: '1px solid #2a2a2a',
                display: 'flex', alignItems: 'center', padding: '0 12px', gap: '8px'
            }}>
                <button onClick={addNewCard} className="btn-secondary" style={{ padding: '4px 8px', fontSize: '12px' }}>
                    <HiOutlinePlus /> New Card
                </button>
                <div style={{ flex: 1 }} />
                <button onClick={() => setZoom(z => Math.max(0.2, z - 0.1))} style={{ background:'none', border:'none', color:'#6b6560', cursor:'pointer' }} title="Zoom Out" aria-label="Zoom Out"><HiOutlineMagnifyingGlassMinus /></button>
                <span style={{ color: '#6b6560', fontSize: '12px', minWidth: '40px', textAlign: 'center' }}>{Math.round(zoom * 100)}%</span>
                <button onClick={() => setZoom(z => Math.min(3, z + 0.1))} style={{ background:'none', border:'none', color:'#6b6560', cursor:'pointer' }} title="Zoom In" aria-label="Zoom In"><HiOutlineMagnifyingGlassPlus /></button>
                <button onClick={fitAll} style={{ background:'none', border:'none', color:'#6b6560', cursor:'pointer', marginLeft: '8px' }} title="Fit All" aria-label="Fit All"><HiOutlineArrowsPointingOut /></button>
            </div>

            {/* Canvas */}
            <div 
                ref={canvasRef}
                onWheel={handleWheel}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onContextMenu={handleCanvasContextMenu}
                style={{
                    flex: 1,
                    overflow: 'hidden',
                    position: 'relative',
                    cursor: isPanning ? 'grabbing' : 'grab'
                }}
            >
                <div style={{
                    transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                    transformOrigin: '0 0',
                    width: '100%', height: '100%',
                    position: 'absolute'
                }}>
                    {/* SVG Layer for Connections */}
                    <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', overflow: 'visible', pointerEvents: 'none', zIndex: 1 }}>
                        <defs>
                            <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                                <polygon points="0 0, 10 3.5, 0 7" fill="#6b6560" />
                            </marker>
                        </defs>
                        {connections.map(c => {
                            const source = cardMap[c.from];
                            const target = cardMap[c.to];
                            if (!source || !target) return null;
                            const sx = source.x + 110;
                            const sy = source.y + 60;
                            const tx = target.x + 110;
                            const ty = target.y + 60;
                            return (
                                <line 
                                    key={c.id} 
                                    x1={sx} y1={sy} x2={tx} y2={ty} 
                                    stroke="#6b6560" strokeWidth="2"
                                    markerEnd="url(#arrowhead)"
                                />
                            );
                        })}
                        {connectingMode && connectingMode.targetPos && (() => {
                            const source = cardMap[connectingMode.sourceId];
                            if (!source) return null;
                            return (
                                <line 
                                    x1={source.x + 110} y1={source.y + 60} 
                                    x2={connectingMode.targetPos.x} y2={connectingMode.targetPos.y} 
                                    stroke="#c9915a" strokeWidth="2" strokeDasharray="4"
                                />
                            );
                        })()}
                    </svg>

                    {/* HTML Layer for Cards */}
                    <div style={{ position: 'absolute', top: 0, left: 0, zIndex: 2 }}>
                        {cards.map(card => (
                            <IdeaCard
                                key={card.id}
                                {...card}
                                selected={selectedCardId === card.id}
                                onSelect={setSelectedCardId}
                                onMove={handleCardMove}
                                onUpdate={handleCardUpdate}
                                onContextMenu={handleCardContextMenu}
                                isConnecting={!!connectingMode}
                                onConnectStart={handleConnectStart}
                                onConnectEnd={handleConnectEnd}
                            />
                        ))}
                    </div>
                </div>
            </div>

            {/* Context Menus */}
            {contextMenu && contextMenu.type === 'canvas' && (
                <div style={{
                    position: 'fixed', top: contextMenu.y, left: contextMenu.x, zIndex: 1000,
                    background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '8px',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.5)', padding: '4px', minWidth: '150px'
                }}>
                    <div style={{ padding: '4px 8px', fontSize: '11px', color: '#6b6560', textTransform: 'uppercase' }}>Templates</div>
                    <button style={cmBtnStyle} onClick={() => { addNewCard(contextMenu.canvasX, contextMenu.canvasY); setContextMenu(null); }}>Blank Card</button>
                    <button style={cmBtnStyle} onClick={() => { addNewCard(contextMenu.canvasX, contextMenu.canvasY, 'Character Want', 'What do they want right now?'); setContextMenu(null); }}>Character Want</button>
                    <button style={cmBtnStyle} onClick={() => { addNewCard(contextMenu.canvasX, contextMenu.canvasY, 'Scene Beat', 'Action -> Reaction -> Decision'); setContextMenu(null); }}>Scene Beat</button>
                    <button style={cmBtnStyle} onClick={() => { addNewCard(contextMenu.canvasX, contextMenu.canvasY, 'Plot Question', 'Will the hero...?'); setContextMenu(null); }}>Plot Question</button>
                </div>
            )}

            {contextMenu && contextMenu.type === 'card' && (
                <div style={{
                    position: 'fixed', top: contextMenu.y, left: contextMenu.x, zIndex: 1000,
                    background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '8px',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.5)', padding: '4px', minWidth: '150px'
                }}>
                    <div style={{ display: 'flex', gap: '4px', padding: '8px' }}>
                        {['white', 'yellow', 'blue', 'green', 'red', 'purple'].map(c => (
                            <button key={c} onClick={() => changeCardColor(contextMenu.cardId, c)} title={`Set card color to ${c}`} aria-label={`Set card color to ${c}`} style={{
                                width: '16px', height: '16px', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.2)',
                                background: {white: '#2e2e2e', yellow: '#3d3200', blue: '#002a3d', green: '#0a2e1a', red: '#3d0a0a', purple: '#1e0a3d'}[c],
                                cursor: 'pointer'
                            }} />
                        ))}
                    </div>
                    <hr style={{ border: 'none', borderTop: '1px solid #2a2a2a', margin: '4px 0' }} />
                    <button style={{...cmBtnStyle, color: '#ef4444'}} onClick={() => deleteCard(contextMenu.cardId)}>Delete</button>
                </div>
            )}

            {/* Signal-Driven Ideas Overlay */}
            <div style={{
                position: 'absolute', top: 50, left: 16, zIndex: 10,
                display: 'flex', flexDirection: 'column', gap: '8px', width: '260px'
            }}>
                {signalIdeas.map((sig, i) => (
                    <div key={i} className="glass-card" style={{ background: 'rgba(20,20,25,0.95)', padding: '12px', borderLeft: '3px solid #9B7EC8', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
                        <div style={{ fontSize: '10px', color: '#9B7EC8', textTransform: 'uppercase', marginBottom: '4px' }}>Strategic Insight</div>
                        <strong style={{ fontSize: '12px', color: '#e8e0d5', display: 'block', marginBottom: '4px', lineHeight: '1.4' }}>{sig.is_meta ? sig.title : sig.issue}</strong>
                        <p style={{ fontSize: '11px', color: '#bbb', margin: '0 0 10px 0', lineHeight: '1.4' }}>{sig.directional_fix}</p>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button className="btn-primary" style={{ padding: '6px 8px', fontSize: '11px', flex: 1, borderRadius: '4px' }} 
                                onClick={() => {
                                    addNewCard(undefined, undefined, sig.is_meta ? sig.title : sig.issue, sig.directional_fix);
                                    setSignalIdeas(prev => prev.filter((_, idx) => idx !== i));
                                }}>Accept as Idea</button>
                            <button style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#bbb', padding: '6px 8px', fontSize: '11px', borderRadius: '4px', cursor: 'pointer' }}
                                onClick={() => setSignalIdeas(prev => prev.filter((_, idx) => idx !== i))}>Dismiss</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

const cmBtnStyle = {
    display: 'block', width: '100%', textAlign: 'left', padding: '6px 12px',
    background: 'none', border: 'none', color: '#e8e0d5', fontSize: '13px',
    cursor: 'pointer', fontFamily: '"DM Sans", sans-serif', borderRadius: '4px'
};
