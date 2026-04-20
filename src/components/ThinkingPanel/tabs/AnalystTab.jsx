import React, { useState, useEffect } from 'react';
import { HiOutlineBeaker, HiOutlineChartBar, HiOutlineCheckCircle, HiOutlineExclamationTriangle, HiChevronDown, HiChevronUp } from 'react-icons/hi2';
import { useStoryStore } from '../../../store/storyStore';
import { runSignalEngine } from '../../../utils/signalEngine';
import { mergeToMetaSignals } from '../../../utils/metaSignalLayer';
import { calculateProgressionCurve } from '../../../utils/progressionCurve';
import { useAuth } from '../../../contexts/AuthContext';

export default function AnalystTab({ projectId }) {
    const { chapters, chapterOrder, editor, nodes, characterStates, conflictStates, progressionMarkers, projectTitle } = useStoryStore();
    const { token } = useAuth();
    
    // Read AI mode from local settings
    const getAiMode = () => {
        try {
            const saved = localStorage.getItem('asp_settings');
            return saved ? JSON.parse(saved).aiMode || 'normal' : 'normal';
        } catch(e) { return 'normal'; }
    }
    
    const [status, setStatus] = useState(null);
    const [result, setResult] = useState(null);
    const [activeScope, setActiveScope] = useState('novel'); // default to novel for SSO
    const [expandedMeta, setExpandedMeta] = useState({});
    
    const activeChapter = chapters[editor.activeChapterId] || chapters[chapterOrder[0]];

    const runAnalysis = async () => {
        setStatus('loading');
        try {
            const snapshot = useStoryStore.getState();
            
            // 1. Run local P1 Signals
            const rawSignals = runSignalEngine(snapshot);
            const metaSignals = mergeToMetaSignals(rawSignals);
            const progData = calculateProgressionCurve(snapshot);

            // In full implementation, we hit our Python AI endpoint from ai_routes.py
            // For now, we display the generated structural signals automatically.

            setResult({ rawSignals, metaSignals, progData, insights: [] });
            setStatus({ ok: true });

        } catch (err) {
            setStatus({ err: err.message });
        }
    };

    return (
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', maxHeight: '100%' }}>
            <div style={{ display: 'flex', gap: '8px', background: '#111', padding: '4px', borderRadius: '8px' }}>
                <button 
                    onClick={() => setActiveScope('chapter')}
                    style={{
                        flex: 1, padding: '8px', borderRadius: '6px', fontSize: '11px',
                        background: activeScope === 'chapter' ? '#2a2a2a' : 'transparent',
                        color: activeScope === 'chapter' ? '#c9915a' : '#6b6560',
                        border: 'none', cursor: 'pointer', transition: 'all 0.2s'
                    }}
                >
                    Current Chapter
                </button>
                <button 
                    onClick={() => setActiveScope('novel')}
                    style={{
                        flex: 1, padding: '8px', borderRadius: '6px', fontSize: '11px',
                        background: activeScope === 'novel' ? '#2a2a2a' : 'transparent',
                        color: activeScope === 'novel' ? '#c9915a' : '#6b6560',
                        border: 'none', cursor: 'pointer', transition: 'all 0.2s'
                    }}
                >
                    Entire Novel
                </button>
            </div>

            <button 
                onClick={runAnalysis}
                disabled={status === 'loading'}
                style={{
                    width: '100%', padding: '12px', borderRadius: '8px',
                    background: 'var(--gold-gradient)', color: '#000',
                    fontWeight: 'bold', fontSize: '12px', border: 'none',
                    cursor: 'pointer', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', gap: '8px'
                }}
            >
                {status === 'loading' ? 'Analyzing Structure...' : <><HiOutlineBeaker /> Structural Analysis ({getAiMode().toUpperCase()})</>}
            </button>

            {result && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px' }}>
                    
                    <div style={{ fontSize: '10px', textTransform: 'uppercase', color: '#6b6560' }}>Structural Signals ({result.rawSignals?.length || 0})</div>
                    
                    {result.rawSignals?.length === 0 && (
                        <div style={{ fontSize: '12px', color: '#4CAF50', padding: '12px', background: 'rgba(76, 175, 80, 0.1)', borderRadius: '6px', display: 'flex', gap: '8px' }}>
                            <HiOutlineCheckCircle size={16} /> No critical structural issues detected.
                        </div>
                    )}

                    {(result.metaSignals?.length > 0) && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '8px' }}>
                            {result.metaSignals.map((sig, i) => (
                                <div key={`meta-${i}`} className="glass-card" style={{ padding: '16px', background: 'var(--bg3)', border: '2px solid #C9915A', borderRadius: '8px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', alignItems: 'center' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                            <span style={{ fontSize: '9px', fontWeight: 'bold', color: '#c9915a', letterSpacing: '0.05em' }}>META-SIGNAL</span>
                                            <strong style={{ fontSize: '13px', color: '#E8E0D5', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <HiOutlineExclamationTriangle color="#c9915a" size={16} /> {sig.title}
                                            </strong>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                                            <span style={{ fontSize: '10px', background: '#D4614A', padding: '2px 6px', borderRadius: '4px', color: '#fff', fontWeight: 'bold' }}>{sig.severity?.toUpperCase()}</span>
                                            {sig.source_signals && <span style={{ fontSize: '9px', color: '#a39d98', background: '#222', padding: '2px 4px', borderRadius: '4px' }}>{sig.source_signals.length} signals merged</span>}
                                        </div>
                                    </div>
                                    
                                    <div style={{ fontSize: '11px', color: '#e8e0d5', marginBottom: '12px', lineHeight: '1.5' }}>{sig.root_cause}</div>
                                    
                                    <div style={{ fontSize: '11px', color: '#a39d98', marginBottom: '16px', fontStyle: 'italic', lineHeight: '1.5', background: 'rgba(255,255,255,0.03)', padding: '8px', borderLeft: '2px solid #444' }}>
                                        <strong>Impact:</strong> {sig.narrative_impact}
                                    </div>
                                    
                                    <div style={{ fontSize: '11px', color: '#c9915a', background: 'rgba(201, 145, 90, 0.1)', padding: '10px', borderRadius: '6px', marginBottom: '12px' }}>
                                        <strong>Strategic Fix:</strong> {sig.directional_fix}
                                    </div>

                                    {sig.source_signals && sig.source_signals.length > 0 && (
                                        <div>
                                            <button 
                                                onClick={() => setExpandedMeta(prev => ({...prev, [i]: !prev[i]}))}
                                                style={{ background: 'transparent', border: '1px solid #333', color: '#a39d98', width: '100%', padding: '6px', borderRadius: '6px', fontSize: '10px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '4px' }}
                                            >
                                                {expandedMeta[i] ? 'Hide Source Signals' : `Expand ${sig.source_signals.length} Source Signals`}
                                                {expandedMeta[i] ? <HiChevronUp /> : <HiChevronDown />}
                                            </button>
                                            
                                            {expandedMeta[i] && (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px', paddingLeft: '12px', borderLeft: '1px solid #333' }}>
                                                    {sig.source_signals.map((src, j) => (
                                                        <div key={j} style={{ fontSize: '10px', color: '#a39d98', background: '#111', padding: '8px', borderRadius: '4px' }}>
                                                            <strong style={{ color: '#ccc' }}>{src.issue || src.title}</strong>
                                                            <div style={{ marginTop: '4px' }}>{src.cause}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {(result.rawSignals?.length > 0) && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={{ fontSize: '10px', textTransform: 'uppercase', color: '#6b6560' }}>Raw Engine Signals</div>
                            {result.rawSignals.map((sig, i) => (
                                <div key={`raw-${i}`} className="glass-card" style={{ padding: '12px', background: 'rgba(255,100,100,0.02)', borderLeft: `3px solid ${sig.severity === 'high' || sig.severity === 'critical' ? '#D4614A' : '#5A8FC9'}` }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                        <strong style={{ fontSize: '12px', color: '#ccc', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            {sig.issue}
                                        </strong>
                                        <span style={{ fontSize: '9px', background: 'rgba(0,0,0,0.3)', padding: '2px 4px', borderRadius: '4px', color: '#9B7EC8' }}>{sig.severity?.toUpperCase()}</span>
                                    </div>
                                    <div style={{ fontSize: '11px', color: '#A39D98', marginBottom: '8px', lineHeight: '1.4' }}>{sig.cause}</div>
                                    {sig.directional_fix && (
                                        <div style={{ fontSize: '10px', color: '#5A8FC9', background: 'rgba(90, 143, 201, 0.1)', padding: '6px', borderRadius: '4px' }}>
                                            <strong>Fix:</strong> {sig.directional_fix}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                </div>
            )}
        </div>
    );
}

function MetricBox({ label, value }) {
    return (
        <div style={{ background: 'rgba(0,0,0,0.2)', padding: '8px', borderRadius: '6px' }}>
            <div style={{ fontSize: '9px', color: '#6b6560' }}>{label}</div>
            <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#c9915a' }}>{value || '—'}</div>
        </div>
    );
}
