import React, { useState, useRef, useEffect } from 'react';

const COLORS = {
    white: '#2e2e2e',
    yellow: '#3d3200',
    blue: '#002a3d',
    green: '#0a2e1a',
    red: '#3d0a0a',
    purple: '#1e0a3d'
};

export default function IdeaCard({ 
    id, 
    x, y, 
    width, height, 
    title, body, 
    color, 
    selected,
    onMove, 
    onUpdate, 
    onSelect, 
    onContextMenu,
    isConnecting,
    onConnectStart,
    onConnectEnd
}) {
    const [isDragging, setIsDragging] = useState(false);
    
    // Internal state for optimistically driving drag
    const [localX, setLocalX] = useState(x);
    const [localY, setLocalY] = useState(y);

    const dragStartRel = useRef({ x: 0, y: 0 });

    useEffect(() => {
        if (!isDragging) {
            setLocalX(x);
            setLocalY(y);
        }
    }, [x, y, isDragging]);

    const handlePointerDown = (e) => {
        // Prevent pan on canvas
        e.stopPropagation();
        
        if (e.button === 2) {
            onContextMenu(e, id);
            return;
        }

        onSelect(id);
        
        // Don't drag if we're in connecting mode and tapping on a card to connect TO it
        // Or if we clicked on the connect handle
        if (e.target.closest('.connect-handle')) {
            onConnectStart(id);
            return;
        }

        if (isConnecting) return;

        setIsDragging(true);
        // We need e.clientX/Y to be calculated relative to zoom/pan.
        // We'll calculate the offset relative to the card's current localX, localY
        // But since standard React dnd without a complex library can be tricky with zoom,
        // we emit standard screen events and let the parent handle the scaled delta, 
        // OR we handle it locally. Handling it in parent is often easier for scaled contexts.
        
        // We'll emit onMove on drag end/interval, but parents handle the active dragging.
        // Let's rely on standard HTML5 Drag & Drop or pointer events.
        
        // For simplicity without parent doing everything:
        dragStartRel.current = {
            x: e.clientX,
            y: e.clientY,
            baseX: localX,
            baseY: localY
        };

        const handlePointerMove = (moveEvent) => {
            // Need the scale factor here? If component doesn't know scale, it drags 1:1 screen pixels,
            // which looks wrong when zoomed.
            // Best to let parent handle the actual delta application if we need perfection,
            // but for now, we'll request motion from parent.
            if (onMove) {
                onMove(id, moveEvent.clientX - dragStartRel.current.x, moveEvent.clientY - dragStartRel.current.y, true);
            }
        };

        const handleWindowPointerUp = () => {
            setIsDragging(false);
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handleWindowPointerUp);
            // Parent handles final persist on setIsDragging=false / final onMove
            if (onMove) onMove(id, 0, 0, false);
        };

        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', handleWindowPointerUp);
    };

    const handlePointerUp = (e) => {
        if (isConnecting && onConnectEnd) {
            e.stopPropagation();
            onConnectEnd(id);
        }
    };

    return (
        <div
            id={`card-${id}`}
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            onContextMenu={e => { e.preventDefault(); e.stopPropagation(); onContextMenu(e, id); }}
            style={{
                position: 'absolute',
                left: isDragging ? undefined : x, // If parent manages transform, we just use absolute positioning
                top: isDragging ? undefined : y,
                transform: isDragging ? `translate(${localX}px, ${localY}px)` : `translate(${x}px, ${y}px)`,
                width: width || 220,
                minHeight: height || 120,
                backgroundColor: COLORS[color] || COLORS.white,
                border: `1px solid ${selected ? '#c9915a' : '#444'}`,
                borderRadius: '8px',
                boxShadow: selected ? '0 0 0 2px rgba(201,145,90,0.3)' : '0 4px 12px rgba(0,0,0,0.2)',
                display: 'flex',
                flexDirection: 'column',
                cursor: isDragging ? 'grabbing' : 'grab',
                userSelect: 'none',
                overflow: 'hidden',
                zIndex: selected ? 100 : 10,
                transition: isDragging ? 'none' : 'box-shadow 0.2s',
            }}
        >
            <div style={{
                padding: '8px',
                background: 'rgba(0,0,0,0.2)',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between'
            }}>
                <input 
                    type="text" 
                    value={title}
                    onChange={e => onUpdate(id, { title: e.target.value })}
                    onPointerDown={e => e.stopPropagation()} // Allow editing without dragging
                    style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#e8e0d5',
                        fontWeight: '600',
                        fontSize: '13px',
                        outline: 'none',
                        width: '100%',
                        fontFamily: '"DM Sans", sans-serif'
                    }}
                />
            </div>
            
            <div style={{ flex: 1, padding: '8px', position: 'relative' }}>
                <textarea 
                    value={body}
                    onChange={e => onUpdate(id, { body: e.target.value })}
                    onPointerDown={e => e.stopPropagation()} 
                    style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#bbb',
                        fontSize: '12px',
                        outline: 'none',
                        width: '100%',
                        height: '100%',
                        resize: 'none',
                        fontFamily: '"DM Sans", sans-serif'
                    }}
                />
                
                {/* Connect Handle */}
                <div 
                    className="connect-handle"
                    style={{
                        position: 'absolute',
                        right: '4px',
                        bottom: '4px',
                        width: '16px',
                        height: '16px',
                        borderRadius: '50%',
                        background: '#c9915a',
                        border: '2px solid #1a1a1a',
                        cursor: 'crosshair',
                        opacity: selected ? 1 : 0,
                        transition: 'opacity 0.2s'
                    }}
                    title="Drag to connect"
                />
            </div>
        </div>
    );
}
