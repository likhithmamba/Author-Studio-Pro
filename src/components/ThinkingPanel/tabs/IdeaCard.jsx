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
    
    // Live position driven by local state — parent syncs on pointer-up
    const [localX, setLocalX] = useState(x);
    const [localY, setLocalY] = useState(y);

    const dragStart = useRef({ clientX: 0, clientY: 0, baseX: 0, baseY: 0 });

    // Sync from parent only when not dragging
    useEffect(() => {
        if (!isDragging) {
            setLocalX(x);
            setLocalY(y);
        }
    }, [x, y, isDragging]);

    const handlePointerDown = (e) => {
        e.stopPropagation();

        if (e.button === 2) {
            onContextMenu(e, id);
            return;
        }

        onSelect(id);

        if (e.target.closest('.connect-handle')) {
            onConnectStart(id);
            return;
        }

        if (isConnecting) return;

        setIsDragging(true);
        dragStart.current = { clientX: e.clientX, clientY: e.clientY, baseX: localX, baseY: localY };
        e.currentTarget.setPointerCapture(e.pointerId);

        const handlePointerMove = (moveEvent) => {
            const dx = moveEvent.clientX - dragStart.current.clientX;
            const dy = moveEvent.clientY - dragStart.current.clientY;
            const newX = dragStart.current.baseX + dx;
            const newY = dragStart.current.baseY + dy;
            setLocalX(newX);
            setLocalY(newY);
            if (onMove) onMove(id, dx, dy, true);
        };

        const handleWindowPointerUp = () => {
            setIsDragging(false);
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handleWindowPointerUp);
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
                left: localX,
                top: localY,
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
                zIndex: isDragging ? 200 : selected ? 100 : 10,
                transition: isDragging ? 'none' : 'box-shadow 0.2s',
                willChange: isDragging ? 'left, top' : 'auto',
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
