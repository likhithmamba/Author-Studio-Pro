import React, { useState, useEffect } from 'react';
import { HiOutlineSparkles, HiOutlineTrash, HiOutlinePlus } from 'react-icons/hi2';
import { useAuth } from '../../../contexts/AuthContext';
import { getWhatIfs, createWhatIf, updateWhatIf, deleteWhatIf } from '../../../api';

export default function WhatIfTab({ projectId }) {
    const { token } = useAuth();
    const [scenarios, setScenarios] = useState([]);
    const [newQuestion, setNewQuestion] = useState('');

    useEffect(() => {
        if (!projectId || !token) return;
        getWhatIfs(projectId, token).then(data => {
            setScenarios(data.map(d => ({...d, resolution: d.description})));
        }).catch(err => console.error(err));
    }, [projectId, token]);

    const handleAdd = (e) => {
        e.preventDefault();
        if (!newQuestion.trim()) return;
        const q = newQuestion.trim();
        const optimisticId = `wi_${Date.now()}`;
        setScenarios([{ id: optimisticId, title: q, question: q, resolution: '', status: 'plausible' }, ...scenarios]);
        setNewQuestion('');
        
        if (token && projectId) {
            createWhatIf({ project_id: projectId, title: q, description: '', status: 'plausible' }, token)
                .then(res => {
                    if (res && res.id) setScenarios(prev => prev.map(s => s.id === optimisticId ? { ...s, id: res.id } : s));
                }).catch(err => console.error(err));
        }
    };

    const updateScenario = (id, updates) => {
        setScenarios(scenarios.map(s => s.id === id ? { ...s, ...updates } : s));
        if (token && !String(id).startsWith('wi_')) {
            const apiUpdates = { ...updates };
            if (apiUpdates.resolution !== undefined) {
                apiUpdates.description = apiUpdates.resolution;
                delete apiUpdates.resolution;
            }
            updateWhatIf(id, apiUpdates, token).catch(err => console.error(err));
        }
    };

    const deleteScenario = (id) => {
        setScenarios(scenarios.filter(s => s.id !== id));
        if (token && !String(id).startsWith('wi_')) {
            deleteWhatIf(id, token).catch(err => console.error(err));
        }
    };

    const askAI = () => {
        alert("AI: Here are 3 alternative outcomes to consider...");
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#07050A' }}>
            
            {/* Input Header */}
            <div style={{ padding: '16px', borderBottom: '1px solid #2a2a2a', background: '#111' }}>
                <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <input
                            type="text"
                            value={newQuestion}
                            onChange={e => setNewQuestion(e.target.value)}
                            placeholder="What if..."
                            style={{
                                flex: 1, background: '#1a1a1a', border: '1px solid #2a2a2a', color: '#e8e0d5',
                                padding: '8px 12px', borderRadius: '6px', fontSize: '13px'
                            }}
                        />
                        <button type="submit" disabled={!newQuestion.trim()} style={{
                            background: '#c9915a', color: '#07050A', border: 'none', borderRadius: '6px', 
                            padding: '8px 12px', cursor: newQuestion.trim() ? 'pointer' : 'not-allowed', 
                            opacity: newQuestion.trim() ? 1 : 0.5, fontWeight: 'bold'
                        }}>
                            <HiOutlinePlus />
                        </button>
                    </div>
                    <button 
                        type="button" 
                        onClick={askAI}
                        style={{
                            width: '100%', background: 'rgba(201,145,90,0.1)', color: '#c9915a', 
                            border: '1px solid currentColor', borderRadius: '6px', padding: '6px',
                            fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', 
                            justifyContent: 'center', gap: '4px'
                        }}
                    >
                        <HiOutlineSparkles /> Generate AI Alternatives
                    </button>
                </form>
            </div>

            {/* List */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {scenarios.map(scenario => (
                    <div key={scenario.id} style={{
                        background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '8px', 
                        overflow: 'hidden', display: 'flex', flexDirection: 'column',
                        opacity: scenario.status === 'discarded' ? 0.6 : 1
                    }}>
                        {/* Status Select & Delete */}
                        <div style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '8px', background: '#111', borderBottom: '1px solid #2a2a2a'
                        }}>
                            <select 
                                value={scenario.status}
                                onChange={e => updateScenario(scenario.id, { status: e.target.value })}
                                style={{
                                    background: 'transparent', border: 'none', fontSize: '11px', outline: 'none',
                                    color: scenario.status === 'canon' ? '#4caf7d' : scenario.status === 'discarded' ? '#ef4444' : '#c9915a',
                                    fontWeight: 'bold', textTransform: 'uppercase', cursor: 'pointer'
                                }}
                            >
                                <option value="plausible" style={{ color: '#000' }}>PLAUSIBLE</option>
                                <option value="canon" style={{ color: '#000' }}>CANON (Kept)</option>
                                <option value="discarded" style={{ color: '#000' }}>DISCARDED</option>
                            </select>
                            
                            <button onClick={() => deleteScenario(scenario.id)} style={{
                                background: 'transparent', border: 'none', color: '#6b6560', cursor: 'pointer'
                            }}>
                                <HiOutlineTrash />
                            </button>
                        </div>
                        
                        <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div style={{ color: '#e8e0d5', fontSize: '14px', fontWeight: 'bold' }}>
                                {scenario.title || scenario.question}
                            </div>
                            <textarea
                                value={scenario.resolution}
                                onChange={e => updateScenario(scenario.id, { resolution: e.target.value })}
                                placeholder="Thoughts, consequences, resolutions..."
                                style={{
                                    width: '100%', minHeight: '60px', background: '#111', border: '1px solid #2a2a2a',
                                    color: '#bbb', padding: '8px', borderRadius: '4px', fontSize: '12px',
                                    resize: 'vertical', boxSizing: 'border-box'
                                }}
                            />
                        </div>
                    </div>
                ))}

                {scenarios.length === 0 && (
                    <div style={{ textAlign: 'center', color: '#6b6560', fontSize: '13px', marginTop: '40px' }}>
                        No scenarios yet.<br />Ask "What if...?" to explore possibilities.
                    </div>
                )}
            </div>
        </div>
    );
}
