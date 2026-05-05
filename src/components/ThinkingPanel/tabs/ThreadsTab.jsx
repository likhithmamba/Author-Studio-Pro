import React, { useState, useEffect } from 'react';
import { HiOutlinePlus, HiOutlineTrash } from 'react-icons/hi2';
import { useAuth } from '../../../contexts/AuthContext';
import { getThreads, createThread, updateThread, deleteThread } from '../../../api';
import { useStoryStore } from '../../../store/storyStore';

export default function ThreadsTab({ projectId }) {
    const { token } = useAuth();
    const { editor, addEdge, edges, removeEdge } = useStoryStore();
    const [cards, setCards] = useState([]);
    const [draggingId, setDraggingId] = useState(null);

    useEffect(() => {
        if (!projectId || !token) return;
        getThreads(projectId, token).then(data => {
            setCards(data.map(d => ({...d, body: d.notes})));
        }).catch(err => console.error(err));
    }, [projectId, token]);

    const columns = [
        { id: 'todo', title: 'TODO' },
        { id: 'in_progress', title: 'DEVELOPING' },
        { id: 'resolved', title: 'RESOLVED' }
    ];

    // ⚡ Bolt: Group thread cards by column for faster rendering
    // Eliminates repeated O(N) array filtering within the O(C) columns render loop
    // by using a single O(N) pre-computed grouping map.
    const columnsData = React.useMemo(() => {
        const grouped = { todo: [], in_progress: [], resolved: [] };
        for (const card of cards) {
            if (grouped[card.status]) {
                grouped[card.status].push(card);
            }
        }
        return grouped;
    }, [cards]);

    const handleDragStart = (e, id) => {
        setDraggingId(id);
        e.dataTransfer.setData('text/plain', id);
        e.dataTransfer.effectAllowed = 'move';
        // Small delay to prevent visual pop immediately
        setTimeout(() => e.target.style.opacity = '0.5', 0);
    };

    const handleDragEnd = (e) => {
        setDraggingId(null);
        e.target.style.opacity = '1';
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e, status) => {
        e.preventDefault();
        const droppedId = e.dataTransfer.getData('text/plain');
        if (droppedId) {
            setCards(cards.map(c => c.id === droppedId ? { ...c, status } : c));
            if (token && !String(droppedId).startsWith('t_')) {
                updateThread(droppedId, { status }, token).catch(err => console.error(err));
            }
            // SSO Sync
            if (status === 'resolved') {
                const edge = edges.find(ed => ed.id === `edge_${droppedId}`);
                if (edge) {
                    removeEdge(edge.id);
                    addEdge({ ...edge, resolved: true, edge_type: 'causality' });
                }
            } else if (status === 'in_progress') {
                const card = cards.find(c => c.id === droppedId);
                const edgeExists = edges.find(ed => ed.id === `edge_${droppedId}`);
                if (!edgeExists && editor.activeChapterId) {
                     addEdge({ id: `edge_${droppedId}`, source: editor.activeChapterId, target: `thread_${droppedId}`, edge_type: 'causality', label: card?.title || 'Thread' });
                }
            }
        }
    };

    const addCard = (status) => {
        const optimisticId = `t_${Date.now()}`;
        setCards([{ id: optimisticId, title: 'New Thread', body: '', status }, ...cards]);
        if (token && projectId) {
            createThread({ project_id: projectId, title: 'New Thread', notes: '', status }, token)
                .then(res => {
                    if (res && res.id) setCards(prev => prev.map(c => c.id === optimisticId ? { ...c, id: res.id } : c));
                }).catch(err => console.error(err));
        }
        if (status === 'in_progress' && editor.activeChapterId) {
             addEdge({ id: `edge_${optimisticId}`, source: editor.activeChapterId, target: `thread_${optimisticId}`, edge_type: 'causality', label: 'New Thread' });
        }
    };

    const updateCard = (id, updates) => {
        setCards(cards.map(c => c.id === id ? { ...c, ...updates } : c));
        if (token && !String(id).startsWith('t_')) {
            const apiUpdates = { ...updates };
            if (apiUpdates.body !== undefined) {
                apiUpdates.notes = apiUpdates.body;
                delete apiUpdates.body;
            }
            updateThread(id, apiUpdates, token).catch(err => console.error(err));
        }
        // SSO Sync
        if (updates.title) {
            const edgeExists = edges.find(ed => ed.id === `edge_${id}`);
            if (edgeExists) {
                removeEdge(edgeExists.id);
                addEdge({ ...edgeExists, label: updates.title });
            }
        }
    };

    const deleteCard = (id) => {
        setCards(cards.filter(c => c.id !== id));
        if (token && !String(id).startsWith('t_')) {
            deleteThread(id, token).catch(err => console.error(err));
        }
        removeEdge(`edge_${id}`);
    };

    return (
        <div style={{ display: 'flex', height: '100%', background: '#07050A', padding: '16px', gap: '16px', overflowX: 'auto' }}>
            {columns.map(col => (
                <div 
                    key={col.id}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, col.id)}
                    style={{
                        minWidth: '260px', flex: 1, display: 'flex', flexDirection: 'column', 
                        background: '#111', border: '1px solid #2a2a2a', borderRadius: '8px', 
                        padding: '12px'
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                        <h3 style={{ margin: 0, fontSize: '13px', color: '#c9915a', fontWeight: 'bold' }}>{col.title}</h3>
                        <button onClick={() => addCard(col.id)} style={{ background: 'none', border: 'none', color: '#6b6560', cursor: 'pointer' }}>
                            <HiOutlinePlus />
                        </button>
                    </div>

                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto', paddingRight: '4px' }}>
                        {columnsData[col.id]?.map(card => (
                            <div 
                                key={card.id}
                                draggable
                                onDragStart={(e) => handleDragStart(e, card.id)}
                                onDragEnd={handleDragEnd}
                                style={{
                                    background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '6px',
                                    padding: '12px', cursor: 'grab', display: 'flex', flexDirection: 'column', gap: '8px',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                                    <input 
                                        type="text" 
                                        value={card.title}
                                        onChange={e => updateCard(card.id, { title: e.target.value })}
                                        className="invisible-input" // Requires css addition, doing inline here
                                        style={{
                                            background: 'transparent', border: 'none', color: '#e8e0d5', fontSize: '14px', 
                                            fontWeight: 'bold', width: '100%', outline: 'none'
                                        }}
                                    />
                                    <button onClick={() => deleteCard(card.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0 0 0 8px' }}>
                                        <HiOutlineTrash />
                                    </button>
                                </div>
                                <textarea
                                    value={card.body}
                                    onChange={e => updateCard(card.id, { body: e.target.value })}
                                    style={{
                                        background: 'transparent', border: 'none', color: '#bbb', fontSize: '12px', 
                                        width: '100%', minHeight: '60px', outline: 'none', resize: 'vertical',
                                        fontFamily: 'inherit'
                                    }}
                                    placeholder="Thread details..."
                                />
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}
