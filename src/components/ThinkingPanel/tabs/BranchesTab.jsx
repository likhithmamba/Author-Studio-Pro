import React, { useState, useEffect } from 'react';
import { HiOutlinePlus, HiOutlineTrash, HiOutlineBars3 } from 'react-icons/hi2';
import { useAuth } from '../../../contexts/AuthContext';
import { getBranches, createBranch, updateBranch, deleteBranch as apiDeleteBranch, createBranchPath, updateBranchPath, deleteBranchPath } from '../../../api';

export default function BranchesTab({ projectId }) {
    const { token } = useAuth();
    const [branches, setBranches] = useState([]);
    const [paths, setPaths] = useState([]);
    const [activeBranchId, setActiveBranchId] = useState(null);

    useEffect(() => {
        if (!projectId || !token) return;
        getBranches(projectId, token).then(data => {
            if (data.branches) setBranches(data.branches);
            if (data.paths) setPaths(data.paths.map(p => ({...p, content: p.summary})));
            if (data.branches && data.branches.length > 0 && !activeBranchId) setActiveBranchId(data.branches[0].id);
        }).catch(err => console.error(err));
    }, [projectId, token]);

    const addBranch = () => {
        const optimisticId = `b_${Date.now()}`;
        setBranches([...branches, { id: optimisticId, name: 'New Branch' }]);
        setActiveBranchId(optimisticId);
        if (token && projectId) {
            createBranch({ project_id: projectId, name: 'New Branch' }, token)
                .then(res => {
                    if (res && res.id) setBranches(prev => prev.map(b => b.id === optimisticId ? { ...b, id: res.id } : b));
                }).catch(err => console.error(err));
        }
    };

    const updateBranchName = (id, name) => {
        setBranches(branches.map(b => b.id === id ? { ...b, name } : b));
        if (token && !String(id).startsWith('b_')) {
            updateBranch(id, { name }, token).catch(err => console.error(err));
        }
    };

    const deleteBranch = (id) => {
        setBranches(branches.filter(b => b.id !== id));
        setPaths(paths.filter(p => p.branch_id !== id));
        if (activeBranchId === id) setActiveBranchId(null);
        if (token && !String(id).startsWith('b_')) {
            apiDeleteBranch(id, token).catch(err => console.error(err));
        }
    };

    const addPathItem = () => {
        if (!activeBranchId) return;
        const branchPaths = paths.filter(p => p.branch_id === activeBranchId);
        const order = branchPaths.length > 0 ? Math.max(...branchPaths.map(p => p.sequence_order)) + 1 : 1;
        const optimisticId = `p_${Date.now()}`;
        setPaths([...paths, { id: optimisticId, branch_id: activeBranchId, sequence_order: order, content: '' }]);
        
        if (token) {
            createBranchPath({ branch_id: activeBranchId, content: '', sequence_order: order }, token)
                .then(res => {
                    if (res && res.id) setPaths(prev => prev.map(p => p.id === optimisticId ? { ...p, id: res.id } : p));
                }).catch(err => console.error(err));
        }
    };

    const updatePathContent = (id, content) => {
        setPaths(paths.map(p => p.id === id ? { ...p, content } : p));
        if (token && !String(id).startsWith('p_')) {
            updateBranchPath(id, { content }, token).catch(err => console.error(err));
        }
    };

    const deletePath = (id) => {
        setPaths(paths.filter(p => p.id !== id));
        if (token && !String(id).startsWith('p_')) {
            deleteBranchPath(id, token).catch(err => console.error(err));
        }
    };

    // Drag and Drop for reordering
    const [draggingPathId, setDraggingPathId] = useState(null);

    const handleDragStart = (e, id) => {
        setDraggingPathId(id);
        e.dataTransfer.effectAllowed = 'move';
        setTimeout(() => e.target.style.opacity = '0.5', 0);
    };

    const handleDragEnter = (e, targetId) => {
        e.preventDefault();
        if (draggingPathId && draggingPathId !== targetId) {
            // Reorder visually
            const currentPaths = [...paths];
            const dragIndex = currentPaths.findIndex(p => p.id === draggingPathId);
            const targetIndex = currentPaths.findIndex(p => p.id === targetId);
            
            const [draggedItem] = currentPaths.splice(dragIndex, 1);
            currentPaths.splice(targetIndex, 0, draggedItem);
            
            
            // Reassign sequence orders for the active branch
            const activeBranchPaths = currentPaths.filter(p => p.branch_id === activeBranchId);
            activeBranchPaths.forEach((p, idx) => {
                p.sequence_order = idx + 1;
                if (token && !String(p.id).startsWith('p_')) {
                    updateBranchPath(p.id, { sequence_order: p.sequence_order }, token).catch(err => console.error(err));
                }
            });
            
            setPaths(currentPaths);
        }
    };

    const handleDragEnd = (e) => {
        e.target.style.opacity = '1';
        setDraggingPathId(null);
    };

    return (
        <div style={{ display: 'flex', height: '100%', background: '#07050A' }}>
            {/* Left Sidebar - Branches */}
            <div style={{ 
                width: '180px', borderRight: '1px solid #2a2a2a', background: '#111', 
                display: 'flex', flexDirection: 'column' 
            }}>
                <div style={{ 
                    padding: '12px', borderBottom: '1px solid #2a2a2a', 
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center' 
                }}>
                    <span style={{ fontSize: '13px', color: '#c9915a', fontWeight: 'bold' }}>STORY BRANCHES</span>
                    <button onClick={addBranch} style={{ background: 'none', border: 'none', color: '#6b6560', cursor: 'pointer' }} aria-label="Add story branch" title="Add story branch"><HiOutlinePlus /></button>
                </div>
                
                <div style={{ flex: 1, overflowY: 'auto' }}>
                    {branches.map(b => (
                        <div 
                            key={b.id}
                            onClick={() => setActiveBranchId(b.id)}
                            style={{
                                padding: '12px',
                                borderBottom: '1px solid #2a2a2a',
                                background: activeBranchId === b.id ? 'rgba(201,145,90,0.1)' : 'transparent',
                                cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                            }}
                        >
                            <input 
                                type="text"
                                value={b.name}
                                onChange={(e) => updateBranchName(b.id, e.target.value)}
                                style={{
                                    background: 'transparent', border: 'none', 
                                    color: activeBranchId === b.id ? '#e8e0d5' : '#6b6560',
                                    fontSize: '13px', width: '100%', outline: 'none',
                                    fontWeight: activeBranchId === b.id ? 'bold' : 'normal'
                                }}
                            />
                            {activeBranchId === b.id && (
                                <button onClick={(e) => { e.stopPropagation(); deleteBranch(b.id); }} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', opacity: 0.7 }} aria-label="Delete branch" title="Delete branch">
                                    <HiOutlineTrash />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Right Side - Paths */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                {!activeBranchId ? (
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b6560', fontSize: '13px' }}>
                        Select or create a story branch to map its events.
                    </div>
                ) : (
                    <>
                        <div style={{ padding: '16px', flex: 1, overflowY: 'auto' }}>
                            {paths.filter(p => p.branch_id === activeBranchId)
                                  .sort((a,b) => a.sequence_order - b.sequence_order)
                                  .map((p, index) => (
                                <div 
                                    key={p.id}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, p.id)}
                                    onDragEnter={(e) => handleDragEnter(e, p.id)}
                                    onDragEnd={handleDragEnd}
                                    onDragOver={e => e.preventDefault()}
                                    style={{
                                        display: 'flex', gap: '12px', marginBottom: '16px',
                                        background: '#1a1a1a', border: '1px solid #2a2a2a', 
                                        borderRadius: '8px', padding: '12px'
                                    }}
                                >
                                    <div style={{ color: '#6b6560', display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'grab' }}>
                                        <HiOutlineBars3 />
                                        <div style={{ fontSize: '10px', marginTop: '4px', background: '#111', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            {index + 1}
                                        </div>
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <textarea
                                            value={p.content}
                                            onChange={e => updatePathContent(p.id, e.target.value)}
                                            placeholder="What happens next in this branch?"
                                            style={{
                                                width: '100%', minHeight: '60px', background: 'transparent',
                                                border: 'none', color: '#e8e0d5', fontSize: '13px',
                                                resize: 'vertical', outline: 'none'
                                            }}
                                        />
                                    </div>
                                    <button onClick={() => deletePath(p.id)} style={{ background: 'none', border: 'none', color: '#6b6560', cursor: 'pointer', alignSelf: 'flex-start' }} aria-label="Delete event" title="Delete event">
                                        <HiOutlineTrash />
                                    </button>
                                </div>
                            ))}
                            
                            <button 
                                onClick={addPathItem}
                                style={{
                                    width: '100%', padding: '12px', background: '#111', 
                                    border: '1px dashed #2a2a2a', borderRadius: '8px', 
                                    color: '#c9915a', cursor: 'pointer', display: 'flex', 
                                    alignItems: 'center', justifyContent: 'center', gap: '8px'
                                }}
                            >
                                <HiOutlinePlus /> Add Event
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
