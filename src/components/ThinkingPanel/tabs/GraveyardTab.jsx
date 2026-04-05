import React, { useState } from 'react';
import { HiOutlineArrowUturnLeft, HiOutlineTrash } from 'react-icons/hi2';

export default function GraveyardTab({ projectId }) {
    const [graveyardItems, setGraveyardItems] = useState([
        { id: 'g1', original_table: 'idea_cards', content_snapshot: { title: 'Old Idea', body: 'This was scrapped.' }, deleted_at: new Date(Date.now() - 86400000).toISOString() },
        { id: 'g2', original_table: 'story_branches', content_snapshot: { name: 'Dark ending' }, deleted_at: new Date(Date.now() - 3600000).toISOString() }
    ]);

    const restoreItem = (id) => {
        alert("Restored item back to original location.");
        setGraveyardItems(graveyardItems.filter(item => item.id !== id));
    };

    const deletePermanently = (id) => {
        setGraveyardItems(graveyardItems.filter(item => item.id !== id));
    };

    const emptyGraveyard = () => {
        if (confirm("Are you sure you want to permanently delete everything in the graveyard?")) {
            setGraveyardItems([]);
        }
    };

    return (
        <div style={{ padding: '16px', color: '#e8e0d5', fontSize: '13px', display: 'flex', flexDirection: 'column', height: '100%', background: '#07050A' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <span style={{ color: '#6b6560' }}>{graveyardItems.length} items</span>
                {graveyardItems.length > 0 && (
                    <button 
                        onClick={emptyGraveyard}
                        style={{ background: 'none', border: '1px solid #ef4444', color: '#ef4444', borderRadius: '4px', padding: '4px 8px', fontSize: '11px', cursor: 'pointer' }}
                    >
                        Empty Graveyard
                    </button>
                )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, overflowY: 'auto' }}>
                {graveyardItems.map(item => {
                    const title = item.content_snapshot.title || item.content_snapshot.name || item.content_snapshot.question || 'Untitled Item';
                    const detail = item.content_snapshot.body || item.content_snapshot.resolution || item.content_snapshot.content || '';
                    
                    return (
                        <div key={item.id} style={{
                            background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '6px', padding: '12px',
                            display: 'flex', flexDirection: 'column', gap: '8px'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div style={{ fontWeight: 'bold' }}>{title}</div>
                                <span style={{ fontSize: '10px', color: '#6b6560', textTransform: 'uppercase' }}>
                                    {item.original_table.replace('_', ' ')}
                                </span>
                            </div>
                            
                            {detail && <div style={{ color: '#bbb', fontSize: '12px' }}>{detail}</div>}
                            
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                                <span style={{ fontSize: '10px', color: '#6b6560' }}>
                                    Deleted {new Date(item.deleted_at).toLocaleDateString()}
                                </span>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button onClick={() => restoreItem(item.id)} style={{ background: 'none', border: 'none', color: '#c9915a', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px' }}>
                                        <HiOutlineArrowUturnLeft /> Restore
                                    </button>
                                    <button onClick={() => deletePermanently(item.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px' }}>
                                        <HiOutlineTrash />
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}

                {graveyardItems.length === 0 && (
                    <div style={{ textAlign: 'center', color: '#6b6560', marginTop: '40px' }}>
                        The graveyard is empty.
                    </div>
                )}
            </div>
        </div>
    );
}
