import React, { useMemo } from 'react';
import { useStoryStore } from '../../store/storyStore';
import { calculateProgressionCurve } from '../../utils/progressionCurve';

const PHASE_COLORS = {
    setup: '#5A8FC9',
    escalation: '#C9915A',
    peak: '#D4614A',
    resolution: '#9B7EC8',
};

const ISSUE_LABELS = {
    missing_peak: { label: 'Missing Climax', icon: '📉', color: '#D4614A' },
    flat_middle: { label: 'Flat Middle', icon: '📊', color: '#C9915A' },
    weak_escalation: { label: 'Weak Escalation', icon: '📈', color: '#E8A87C' },
    early_resolution: { label: 'Early Resolution', icon: '⏩', color: '#9B7EC8' },
};

export default function StoryCurve() {
    const chapters = useStoryStore(state => state.chapters);
    const chapterOrder = useStoryStore(state => state.chapterOrder);
    const nodes = useStoryStore(state => state.nodes);
    const edges = useStoryStore(state => state.edges);
    const conflictStates = useStoryStore(state => state.conflictStates);
    const progressionMarkers = useStoryStore(state => state.progressionMarkers);

    const curveData = useMemo(() => {
        const snapshot = useStoryStore.getState();
        return calculateProgressionCurve(snapshot);
    }, [chapters, chapterOrder, nodes, edges, conflictStates, progressionMarkers]);

    if (!curveData || !curveData.chapterCurves || curveData.chapterCurves.length === 0) {
        return (
            <div style={{ padding: '48px', color: '#6b6560', textAlign: 'center', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
                <div style={{ fontSize: '48px', opacity: 0.3 }}>📈</div>
                <div style={{ fontSize: '14px', maxWidth: '300px', lineHeight: 1.6 }}>
                    Start writing chapters and creating conflict nodes to generate your Story Curve.
                </div>
            </div>
        );
    }

    const { chapterCurves, detectedIssues, phaseAssignments } = curveData;
    const width = 800;
    const height = 400;
    const padding = 50;

    const maxIntensity = Math.max(...chapterCurves.map(c => c.conflict_intensity), 0.5);
    const xStep = chapterCurves.length > 1 ? (width - padding * 2) / (chapterCurves.length - 1) : 0;

    const points = chapterCurves.map((c, i) => {
        const x = padding + i * xStep;
        const y = height - padding - (c.conflict_intensity / maxIntensity) * (height - padding * 2);
        
        // Determine phase color
        let phase = 'setup';
        for (const [p, ids] of Object.entries(phaseAssignments)) {
            if (ids.includes(c.chapterId)) { phase = p; break; }
        }
        
        return { x, y, c, phase };
    });

    // Build smooth curve path using cardinal spline
    const buildSmoothPath = (pts) => {
        if (pts.length < 2) return '';
        if (pts.length === 2) return `M ${pts[0].x} ${pts[0].y} L ${pts[1].x} ${pts[1].y}`;
        
        let d = `M ${pts[0].x} ${pts[0].y}`;
        for (let i = 0; i < pts.length - 1; i++) {
            const p0 = pts[Math.max(i - 1, 0)];
            const p1 = pts[i];
            const p2 = pts[i + 1];
            const p3 = pts[Math.min(i + 2, pts.length - 1)];
            
            const cp1x = p1.x + (p2.x - p0.x) / 6;
            const cp1y = p1.y + (p2.y - p0.y) / 6;
            const cp2x = p2.x - (p3.x - p1.x) / 6;
            const cp2y = p2.y - (p3.y - p1.y) / 6;
            
            d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
        }
        return d;
    };

    const pathData = buildSmoothPath(points);
    const areaPathData = points.length > 0
        ? `${pathData} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`
        : '';

    // Phase boundary lines
    const phaseBoundaries = [];
    for (let i = 1; i < points.length; i++) {
        if (points[i].phase !== points[i - 1].phase) {
            const midX = (points[i].x + points[i - 1].x) / 2;
            phaseBoundaries.push({ x: midX, from: points[i - 1].phase, to: points[i].phase });
        }
    }

    return (
        <div style={{ width: '100%', height: '100%', padding: '32px 48px', display: 'flex', flexDirection: 'column', background: 'var(--bg)', overflowY: 'auto' }}>
            <div style={{ marginBottom: '24px' }}>
                <h1 style={{ color: '#e8e0d5', fontSize: '22px', margin: '0 0 8px 0', fontFamily: 'Fraunces, serif' }}>Narrative Progression Curve</h1>
                <p style={{ color: '#a39d98', fontSize: '13px', maxWidth: '600px', lineHeight: 1.6, margin: 0 }}>
                    Maps conflict intensity and tension across your chapters. Phase colors indicate structural regions.
                </p>
            </div>

            {/* Issue Alerts */}
            {detectedIssues.length > 0 && (
                <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
                    {detectedIssues.map((issue, i) => {
                        const info = ISSUE_LABELS[issue] || { label: issue, icon: '⚠️', color: '#C9915A' };
                        return (
                            <div key={i} style={{
                                display: 'flex', alignItems: 'center', gap: '6px',
                                padding: '6px 12px', borderRadius: '20px',
                                background: `${info.color}15`, border: `1px solid ${info.color}40`,
                                fontSize: '11px', color: info.color, fontWeight: 'bold',
                            }}>
                                <span>{info.icon}</span> {info.label}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Chart */}
            <div style={{ position: 'relative', width: '100%', maxWidth: '800px', margin: '0 auto', background: '#0C0C0E', border: '1px solid #2a2a2a', borderRadius: '12px', padding: '24px' }}>
                <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
                    <defs>
                        <linearGradient id="curveGrad" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="#5A8FC9" />
                            <stop offset="40%" stopColor="#C9915A" />
                            <stop offset="75%" stopColor="#D4614A" />
                            <stop offset="100%" stopColor="#9B7EC8" />
                        </linearGradient>
                        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#C9915A" stopOpacity="0.25" />
                            <stop offset="100%" stopColor="#C9915A" stopOpacity="0.0" />
                        </linearGradient>
                        <filter id="glow">
                            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                            <feMerge>
                                <feMergeNode in="coloredBlur"/>
                                <feMergeNode in="SourceGraphic"/>
                            </feMerge>
                        </filter>
                    </defs>

                    {/* Grid Lines */}
                    {[0, 0.25, 0.5, 0.75, 1].map(tick => (
                        <g key={tick}>
                            <line 
                                x1={padding} y1={height - padding - tick * (height - padding * 2)} 
                                x2={width - padding} y2={height - padding - tick * (height - padding * 2)} 
                                stroke="#1a1a1a" strokeWidth="1"
                            />
                            <text x={padding - 8} y={height - padding - tick * (height - padding * 2) + 3} 
                                fill="#444" fontSize="9" textAnchor="end">{Math.round(tick * 100)}%</text>
                        </g>
                    ))}

                    {/* Phase Boundary Lines */}
                    {phaseBoundaries.map((b, i) => (
                        <g key={`boundary-${i}`}>
                            <line x1={b.x} y1={padding - 10} x2={b.x} y2={height - padding} stroke="#333" strokeWidth="1" strokeDasharray="4 4" />
                            <text x={b.x} y={padding - 16} fill="#6b6560" fontSize="8" textAnchor="middle">
                                {b.to.toUpperCase()}
                            </text>
                        </g>
                    ))}

                    {/* Area under curve */}
                    <path d={areaPathData} fill="url(#areaGrad)" />

                    {/* The smooth curve */}
                    <path d={pathData} fill="none" stroke="url(#curveGrad)" strokeWidth="3" strokeLinejoin="round" filter="url(#glow)" />

                    {/* Data Points with phase colors */}
                    {points.map((p, i) => (
                        <g key={i}>
                            {/* Hover target (larger invisible circle) */}
                            <circle cx={p.x} cy={p.y} r="12" fill="transparent" />
                            
                            {/* Visible dot */}
                            <circle cx={p.x} cy={p.y} r="5" fill="#111" stroke={PHASE_COLORS[p.phase]} strokeWidth="2.5" />
                            
                            {/* X Axis Labels */}
                            <text x={p.x} y={height - padding + 18} fill="#6b6560" fontSize="9" textAnchor="middle">
                                Ch {i + 1}
                            </text>
                            
                            {/* Peak marker */}
                            {p.c.conflict_intensity > 0.8 && (
                                <text x={p.x} y={p.y - 14} fill="#D4614A" fontSize="10" textAnchor="middle" fontWeight="bold">
                                    ▲ Peak
                                </text>
                            )}
                            
                            {/* Resolution pressure indicator */}
                            {p.c.resolution_pressure === 0 && p.c.pct > 50 && p.c.pct < 85 && (
                                <circle cx={p.x} cy={p.y} r="8" fill="none" stroke="#FFC107" strokeWidth="1" strokeDasharray="2 2" opacity="0.6" />
                            )}
                        </g>
                    ))}
                </svg>

                {/* Legend */}
                <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginTop: '20px', flexWrap: 'wrap' }}>
                    {Object.entries(PHASE_COLORS).map(([phase, color]) => (
                        <div key={phase} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#a39d98' }}>
                            <div style={{ width: '10px', height: '10px', background: color, borderRadius: '2px' }} />
                            {phase.charAt(0).toUpperCase() + phase.slice(1)}
                            <span style={{ color: '#6b6560', fontSize: '9px' }}>
                                ({phaseAssignments[phase]?.length || 0})
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
