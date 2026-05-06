import React, { useState, useEffect, useCallback } from 'react';
import { HiOutlineBeaker, HiOutlineChartBar, HiOutlineCheckCircle, HiOutlineExclamationTriangle, HiChevronDown, HiChevronUp, HiOutlineCog6Tooth, HiOutlineShieldCheck, HiOutlineBoltSlash } from 'react-icons/hi2';
import { useStoryStore } from '../../../store/storyStore';
import { useAuth } from '../../../contexts/AuthContext';
import { AI_MODES } from '../../../utils/aiModes';

const SEVERITY_COLORS = {
    critical: { bg: 'rgba(212, 97, 74, 0.15)', border: '#D4614A', text: '#D4614A', badge: '#D4614A' },
    high:     { bg: 'rgba(212, 97, 74, 0.10)', border: '#D4614A', text: '#E8A87C', badge: '#D4614A' },
    medium:   { bg: 'rgba(201, 145, 90, 0.10)', border: '#C9915A', text: '#C9915A', badge: '#C9915A' },
    low:      { bg: 'rgba(90, 143, 201, 0.08)', border: '#5A8FC9', text: '#5A8FC9', badge: '#5A8FC9' },
};

const HEALTH_COLORS = {
    A: '#4CAF50', B: '#8BC34A', C: '#FFC107', D: '#FF9800', F: '#D4614A',
};

export default function AnalystTab({ projectId }) {
    const { chapters, chapterOrder, editor, nodes, characterStates, conflictStates, progressionMarkers } = useStoryStore();
    const analysis = useStoryStore(state => state.analysis);
    const runAnalysis = useStoryStore(state => state.runAnalysis);
    const { token } = useAuth();
    
    const [activeScope, setActiveScope] = useState('novel');
    const [expandedMeta, setExpandedMeta] = useState({});
    const [aiMode, setAiMode] = useState(() => {
        try {
            const saved = localStorage.getItem('inkforge_settings');
            return saved ? JSON.parse(saved).aiMode || 'normal' : 'normal';
        } catch { return 'normal'; }
    });
    const [showModeSelect, setShowModeSelect] = useState(false);

    const handleModeChange = (mode) => {
        setAiMode(mode);
        setShowModeSelect(false);
        try {
            const saved = JSON.parse(localStorage.getItem('inkforge_settings') || '{}');
            saved.aiMode = mode;
            localStorage.setItem('inkforge_settings', JSON.stringify(saved));
        } catch {}
    };

    const handleRunAnalysis = useCallback(() => {
        runAnalysis();
    }, [runAnalysis]);

    const result = analysis.result;
    const isLoading = analysis.status === 'running';
    const healthScore = analysis.healthScore;

    return (
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', maxHeight: '100%' }}>
            
            {/* Health Score Banner */}
            {healthScore && (
                <div style={{
                    display: 'flex', alignItems: 'center', gap: '16px',
                    background: 'linear-gradient(135deg, rgba(0,0,0,0.4), rgba(0,0,0,0.2))',
                    padding: '16px', borderRadius: '12px', border: '1px solid #2a2a2a',
                }}>
                    <div style={{
                        width: '56px', height: '56px', borderRadius: '50%',
                        background: `conic-gradient(${HEALTH_COLORS[healthScore.grade]} ${healthScore.score * 3.6}deg, #222 0deg)`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                    }}>
                        <div style={{
                            width: '44px', height: '44px', borderRadius: '50%', background: '#111',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontWeight: 'bold', fontSize: '18px', color: HEALTH_COLORS[healthScore.grade],
                            fontFamily: '"DM Sans", sans-serif',
                        }}>
                            {healthScore.grade}
                        </div>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#E8E0D5', marginBottom: '4px' }}>
                            Structure Health: {healthScore.label}
                        </div>
                        <div style={{ fontSize: '11px', color: '#a39d98', lineHeight: 1.5 }}>
                            {healthScore.score}/100 · {healthScore.issueCount} issue{healthScore.issueCount !== 1 ? 's' : ''} detected
                        </div>
                        {result?.elapsed_ms != null && (
                            <div style={{ fontSize: '9px', color: '#6b6560', marginTop: '4px' }}>
                                Analyzed in {result.elapsed_ms}ms
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Scope Toggle + AI Mode */}
            <div style={{ display: 'flex', gap: '8px' }}>
                <div style={{ display: 'flex', flex: 1, background: '#111', padding: '4px', borderRadius: '8px' }}>
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
                
                {/* AI Mode Selector */}
                <div style={{ position: 'relative' }}>
                    <button
                        onClick={() => setShowModeSelect(!showModeSelect)}
                        style={{
                            height: '100%', padding: '0 12px', borderRadius: '8px',
                            background: '#111', border: '1px solid #2a2a2a',
                            color: '#c9915a', fontSize: '10px', fontWeight: 'bold',
                            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px',
                            letterSpacing: '0.05em', textTransform: 'uppercase',
                        }}
                        title="AI Analysis Mode"
                    >
                        <HiOutlineCog6Tooth size={14} />
                        {aiMode}
                    </button>
                    
                    {showModeSelect && (
                        <div style={{
                            position: 'absolute', top: '100%', right: 0, marginTop: '4px',
                            background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '8px',
                            padding: '4px', zIndex: 100, minWidth: '180px',
                            boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
                        }}>
                            {Object.entries(AI_MODES).map(([key, mode]) => (
                                <button
                                    key={key}
                                    onClick={() => handleModeChange(mode.id)}
                                    style={{
                                        display: 'flex', flexDirection: 'column', width: '100%',
                                        padding: '10px 12px', borderRadius: '6px', border: 'none',
                                        background: aiMode === mode.id ? 'rgba(201,145,90,0.15)' : 'transparent',
                                        cursor: 'pointer', textAlign: 'left',
                                    }}
                                >
                                    <div style={{ fontSize: '11px', fontWeight: 'bold', color: aiMode === mode.id ? '#c9915a' : '#ccc', textTransform: 'uppercase' }}>
                                        {mode.id}
                                    </div>
                                    <div style={{ fontSize: '9px', color: '#6b6560', marginTop: '2px' }}>
                                        {mode.maxSignals} signals · {mode.multiPass ? `${mode.passes} passes` : 'single pass'}
                                        {mode.requiresHighTokenModel && ' · high-token model'}
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Run Button */}
            <button 
                onClick={handleRunAnalysis}
                disabled={isLoading}
                style={{
                    width: '100%', padding: '12px', borderRadius: '8px',
                    background: isLoading ? '#333' : 'var(--gold-gradient, linear-gradient(135deg, #C9915A, #E8A87C))',
                    color: isLoading ? '#666' : '#000',
                    fontWeight: 'bold', fontSize: '12px', border: 'none',
                    cursor: isLoading ? 'wait' : 'pointer', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', gap: '8px', transition: 'all 0.3s',
                }}
            >
                {isLoading ? (
                    <>
                        <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</span>
                        Analyzing Structure...
                    </>
                ) : (
                    <>
                        <HiOutlineBeaker />
                        Run Structural Analysis ({aiMode.toUpperCase()})
                    </>
                )}
            </button>

            {/* Progression Summary */}
            {result?.progression && (
                <div style={{
                    display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px',
                }}>
                    {['setup', 'escalation', 'peak', 'resolution'].map(phase => {
                        const count = result.progression.phaseAssignments[phase]?.length || 0;
                        const phaseColors = { setup: '#5A8FC9', escalation: '#C9915A', peak: '#D4614A', resolution: '#9B7EC8' };
                        return (
                            <div key={phase} style={{
                                background: '#111', padding: '10px 8px', borderRadius: '8px',
                                borderTop: `2px solid ${phaseColors[phase]}`, textAlign: 'center',
                            }}>
                                <div style={{ fontSize: '16px', fontWeight: 'bold', color: phaseColors[phase] }}>{count}</div>
                                <div style={{ fontSize: '9px', color: '#6b6560', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '2px' }}>{phase}</div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Detected Issues */}
            {result?.progression?.detectedIssues?.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ fontSize: '10px', textTransform: 'uppercase', color: '#6b6560', letterSpacing: '0.05em' }}>
                        Progression Issues
                    </div>
                    {result.progression.detectedIssues.map((issue, i) => {
                        const issueLabels = {
                            missing_peak: { label: 'Missing Climax', desc: 'No chapter reaches maximum conflict intensity (>0.8)', icon: '📉' },
                            flat_middle: { label: 'Flat Middle', desc: 'Conflict intensity lacks variation across core chapters', icon: '📊' },
                            weak_escalation: { label: 'Weak Escalation', desc: 'Tension drops between midpoint and climax', icon: '📈' },
                            early_resolution: { label: 'Premature Resolution', desc: 'Primary conflicts resolve too far ahead of the end', icon: '⏩' },
                        };
                        const info = issueLabels[issue] || { label: issue, desc: '', icon: '⚠️' };
                        return (
                            <div key={i} style={{
                                display: 'flex', alignItems: 'flex-start', gap: '10px',
                                padding: '10px 12px', background: 'rgba(212, 97, 74, 0.06)',
                                borderLeft: '3px solid #D4614A', borderRadius: '0 6px 6px 0',
                            }}>
                                <span style={{ fontSize: '16px', lineHeight: 1 }}>{info.icon}</span>
                                <div>
                                    <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#E8A87C' }}>{info.label}</div>
                                    <div style={{ fontSize: '11px', color: '#a39d98', marginTop: '2px', lineHeight: 1.4 }}>{info.desc}</div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Signal Cards */}
            {result && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '4px' }}>
                    
                    {/* Meta-Signals (compound) */}
                    {result.metaSignals?.length > 0 && (
                        <>
                            <div style={{ fontSize: '10px', textTransform: 'uppercase', color: '#6b6560', letterSpacing: '0.05em' }}>
                                Compound Signals ({result.metaSignals.length})
                            </div>
                            {result.metaSignals.map((sig, i) => {
                                const colors = SEVERITY_COLORS[sig.severity] || SEVERITY_COLORS.medium;
                                return (
                                    <div key={`meta-${i}`} style={{
                                        padding: '16px', background: colors.bg,
                                        border: `1px solid ${colors.border}`, borderRadius: '10px',
                                        transition: 'all 0.2s',
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', alignItems: 'center' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                <span style={{ fontSize: '9px', fontWeight: 'bold', color: colors.text, letterSpacing: '0.08em' }}>META-SIGNAL</span>
                                                <strong style={{ fontSize: '13px', color: '#E8E0D5', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <HiOutlineExclamationTriangle color={colors.text} size={16} /> {sig.title}
                                                </strong>
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                                                <span style={{
                                                    fontSize: '10px', background: colors.badge,
                                                    padding: '2px 8px', borderRadius: '4px', color: '#fff', fontWeight: 'bold',
                                                }}>{sig.severity?.toUpperCase()}</span>
                                                {sig.composite_score != null && (
                                                    <span style={{ fontSize: '9px', color: '#6b6560' }}>
                                                        Score: {Math.round(sig.composite_score)}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        
                                        <div style={{ fontSize: '11px', color: '#e8e0d5', marginBottom: '12px', lineHeight: 1.5 }}>{sig.root_cause}</div>
                                        
                                        <div style={{ fontSize: '11px', color: '#a39d98', marginBottom: '16px', fontStyle: 'italic', lineHeight: 1.5, background: 'rgba(255,255,255,0.03)', padding: '8px', borderLeft: '2px solid #444' }}>
                                            <strong>Impact:</strong> {sig.narrative_impact}
                                        </div>
                                        
                                        <div style={{ fontSize: '11px', color: colors.text, background: `${colors.bg}`, padding: '10px', borderRadius: '6px', marginBottom: sig.source_signals?.length > 0 ? '12px' : '0' }}>
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
                                                                <strong style={{ color: '#ccc' }}>{src}</strong>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </>
                    )}

                    {/* Standalone Signals */}
                    {result.signals?.length > 0 && (
                        <>
                            <div style={{ fontSize: '10px', textTransform: 'uppercase', color: '#6b6560', letterSpacing: '0.05em' }}>
                                Structural Signals ({result.signals.length})
                            </div>
                            {result.signals.map((sig, i) => {
                                const colors = SEVERITY_COLORS[sig.severity] || SEVERITY_COLORS.medium;
                                return (
                                    <div key={`sig-${i}`} style={{
                                        padding: '12px', background: colors.bg,
                                        borderLeft: `3px solid ${colors.border}`, borderRadius: '0 8px 8px 0',
                                        transition: 'all 0.2s',
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', alignItems: 'flex-start' }}>
                                            <strong style={{ fontSize: '12px', color: '#E8E0D5', display: 'flex', alignItems: 'center', gap: '6px', lineHeight: 1.3 }}>
                                                {sig.issue}
                                            </strong>
                                            <div style={{ display: 'flex', gap: '6px', flexShrink: 0, marginLeft: '8px' }}>
                                                <span style={{
                                                    fontSize: '9px', background: colors.badge, padding: '2px 6px',
                                                    borderRadius: '4px', color: '#fff', fontWeight: 'bold',
                                                }}>{sig.severity?.toUpperCase()}</span>
                                                <span style={{
                                                    fontSize: '9px', background: 'rgba(155, 126, 200, 0.2)', padding: '2px 6px',
                                                    borderRadius: '4px', color: '#9B7EC8',
                                                }}>{sig.progression_phase}</span>
                                            </div>
                                        </div>
                                        <div style={{ fontSize: '11px', color: '#A39D98', marginBottom: '8px', lineHeight: 1.4 }}>{sig.cause}</div>
                                        {sig.directional_fix && (
                                            <div style={{ fontSize: '10px', color: colors.text, background: `${colors.bg}`, padding: '8px', borderRadius: '4px' }}>
                                                <strong>Fix:</strong> {sig.directional_fix}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </>
                    )}

                    {/* No Issues State */}
                    {result.signals?.length === 0 && result.metaSignals?.length === 0 && (
                        <div style={{
                            fontSize: '12px', color: '#4CAF50', padding: '16px',
                            background: 'rgba(76, 175, 80, 0.08)', borderRadius: '8px',
                            display: 'flex', gap: '10px', alignItems: 'center',
                            border: '1px solid rgba(76, 175, 80, 0.2)',
                        }}>
                            <HiOutlineShieldCheck size={20} /> 
                            <div>
                                <div style={{ fontWeight: 'bold' }}>No structural issues detected</div>
                                <div style={{ fontSize: '10px', color: '#a39d98', marginTop: '2px' }}>
                                    Add more character states, conflicts, and progression markers for deeper analysis.
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Summary */}
                    {result?.summary && (
                        <div style={{
                            fontSize: '11px', color: '#6b6560', padding: '12px',
                            background: '#111', borderRadius: '8px', lineHeight: 1.5,
                            borderLeft: '2px solid #333',
                        }}>
                            {result.summary}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
