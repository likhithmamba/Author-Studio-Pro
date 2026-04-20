import React, { useMemo } from 'react';
import { useStoryStore } from '../../store/storyStore';
import { calculateProgressionCurve } from '../../utils/progressionCurve';

export default function StoryCurve() {
    const chapters = useStoryStore(state => state.chapters);
    const chapterOrder = useStoryStore(state => state.chapterOrder);
    const nodes = useStoryStore(state => state.nodes);
    const edges = useStoryStore(state => state.edges);

    const curveData = useMemo(() => {
        const snapshot = useStoryStore.getState();
        return calculateProgressionCurve(snapshot);
    }, [chapters, chapterOrder, nodes, edges]);

    if (!curveData || !curveData.chapterCurves || curveData.chapterCurves.length === 0) {
        return (
            <div style={{ padding: '48px', color: '#6b6560', textAlign: 'center', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                Start writing chapters and creating conflicting nodes to generate your Story Curve.
            </div>
        );
    }

    const { chapterCurves } = curveData;
    const width = 800;
    const height = 400;
    const padding = 40;

    const maxIntensity = Math.max(...chapterCurves.map(c => c.conflict_intensity), 1);
    const xStep = chapterCurves.length > 1 ? (width - padding * 2) / (chapterCurves.length - 1) : 0;

    const points = chapterCurves.map((c, i) => {
        const x = padding + i * xStep;
        const y = height - padding - (c.conflict_intensity / maxIntensity) * (height - padding * 2);
        return { x, y, c };
    });

    const pathData = points.length > 0 
        ? `M ${points[0].x} ${points[0].y} ` + points.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ')
        : '';

    const areaPathData = points.length > 0
        ? `${pathData} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`
        : '';

    return (
        <div style={{ width: '100%', height: '100%', padding: '48px', display: 'flex', flexDirection: 'column', background: 'var(--bg)', overflowY: 'auto' }}>
            <div style={{ marginBottom: '32px' }}>
                <h1 style={{ color: '#e8e0d5', fontSize: '24px', margin: '0 0 8px 0', fontFamily: 'Fraunces, serif' }}>Narrative Progression Curve</h1>
                <p style={{ color: '#a39d98', fontSize: '13px', maxWidth: '600px', lineHeight: 1.6 }}>
                    This chart maps the intensity of character conflict and plot tension across your chapters. 
                    A healthy story typically features rising action, a midpoint climax, and a resolving falling action.
                </p>
            </div>

            <div style={{ position: 'relative', width: '100%', maxWidth: '800px', margin: '0 auto', background: '#0C0C0E', border: '1px solid #2a2a2a', borderRadius: '12px', padding: '24px' }}>
                
                {/* SVG Chart */}
                <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
                    <defs>
                        <linearGradient id="curveGradient" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="#5A8FC9" />
                            <stop offset="50%" stopColor="#C9915A" />
                            <stop offset="100%" stopColor="#D4614A" />
                        </linearGradient>
                        <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#C9915A" stopOpacity="0.3" />
                            <stop offset="100%" stopColor="#C9915A" stopOpacity="0.0" />
                        </linearGradient>
                    </defs>

                    {/* Grid Lines */}
                    {[0, 0.25, 0.5, 0.75, 1].map(tick => (
                        <line 
                            key={tick}
                            x1={padding} 
                            y1={height - padding - tick * (height - padding * 2)} 
                            x2={width - padding} 
                            y2={height - padding - tick * (height - padding * 2)} 
                            stroke="#222" 
                            strokeWidth="1"
                        />
                    ))}

                    {/* Area under curve */}
                    <path d={areaPathData} fill="url(#areaGradient)" />

                    {/* The Line */}
                    <path d={pathData} fill="none" stroke="url(#curveGradient)" strokeWidth="4" strokeLinejoin="round" />

                    {/* Data Points */}
                    {points.map((p, i) => (
                        <g key={i}>
                            <circle 
                                cx={p.x} 
                                cy={p.y} 
                                r="5" 
                                fill="#111" 
                                stroke="#E8E0D5" 
                                strokeWidth="2" 
                            />
                            {/* X Axis Labels */}
                            <text 
                                x={p.x} 
                                y={height - padding + 20} 
                                fill="#6b6560" 
                                fontSize="10" 
                                textAnchor="middle"
                            >
                                Ch {i + 1}
                            </text>
                            
                            {/* Tooltip emulation (static for now) */}
                            {p.c.conflict_intensity > 0.8 && (
                                <text x={p.x} y={p.y - 12} fill="#D4614A" fontSize="10" textAnchor="middle" fontWeight="bold">Peak</text>
                            )}
                        </g>
                    ))}
                </svg>

                {/* Legend */}
                <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginTop: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#a39d98' }}>
                        <div style={{ width: '12px', height: '12px', background: '#5A8FC9', borderRadius: '2px' }} /> Setup
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#a39d98' }}>
                        <div style={{ width: '12px', height: '12px', background: '#C9915A', borderRadius: '2px' }} /> Escalation
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#a39d98' }}>
                        <div style={{ width: '12px', height: '12px', background: '#D4614A', borderRadius: '2px' }} /> Peak Conflict
                    </div>
                </div>

            </div>
        </div>
    );
}
