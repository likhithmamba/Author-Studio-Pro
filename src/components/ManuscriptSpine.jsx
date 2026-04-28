import React from 'react';

const SPINES = [
  { id: 'format', title: 'FORMAT', color: '#C4903A', tilt: '0deg', textCol: '#121017' },
  { id: 'analyse', title: 'ANALYSE', color: '#121017', edge: '#C4903A', tilt: '1.2deg', textCol: '#E0B56A' },
  { id: 'query', title: 'QUERY', color: '#0D0A12', tilt: '-0.8deg', textCol: '#C4903A' },
  { id: 'market', title: 'MARKET', color: '#A8742A', tilt: '1.5deg', textCol: '#121017' },
  { id: 'submissions', title: 'SUBMISSIONS', color: '#121017', tilt: '-1.0deg', textCol: '#F0EDE8' },
  { id: 'editor', title: 'EDITOR', color: 'linear-gradient(135deg, #E0B56A, #A8742A)', tilt: '0.5deg', textCol: '#121017' },
];

export default function ManuscriptSpine() {
  const prefersReduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  return (
    <div style={{ position: 'relative', width: 300, height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, perspective: 1000, position: 'relative', width: '100%', height: '100%' }}>
        {SPINES.map((spine, i) => (
          <div
            key={spine.id}
            className={`spine-item ${prefersReduced ? 'no-anim' : ''}`}
            style={{
              '--spine-index': i,
              '--tilt': spine.tilt,
              height: 48,
              width: 240,
              background: spine.color,
              border: spine.edge ? `1px solid ${spine.edge}` : '1px solid rgba(255,255,255,0.05)',
              borderRadius: 4,
              boxShadow: '0 8px 16px rgba(0,0,0,0.6), inset 0 2px 4px rgba(255,255,255,0.05)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              position: 'relative',
              overflow: 'hidden',
              margin: '0 auto',
              transition: 'all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
              animation: prefersReduced ? 'none' : 'spineFloat 6s ease-in-out infinite',
              animationDelay: `${i * 0.8}s`,
              transform: prefersReduced ? `rotate(${spine.tilt})` : undefined,
            }}
          >
            <div className="spine-text" style={{
              color: spine.textCol,
              fontFamily: 'DM Mono, monospace',
              fontSize: 14,
              fontWeight: 600,
              letterSpacing: '0.2em',
              writingMode: 'horizontal-tb',
              transition: 'opacity 0.2s'
            }}>
              {spine.title}
            </div>
            
            <div className="spine-preview" style={{
              position: 'absolute',
              inset: 0,
              opacity: 0,
              transition: 'opacity 0.3s',
              background: '#121017',
              border: '1px solid #C4903A',
              display: 'flex',
              alignItems: 'center',
              padding: '0 12px',
              gap: 8
            }}>
                {/* Micro UI Preview based on id */}
                {spine.id === 'format' && <div style={{width:'100%', height:4, background:'#C4903A', borderRadius:2}}/>}
                {spine.id === 'analyse' && <div style={{display:'flex', gap:4}}><div style={{width:8, height:16, background:'#E0B56A'}}/><div style={{width:8, height:24, background:'#C4903A'}}/></div>}
                {spine.id === 'query' && <div style={{width:'100%', borderTop:'1px dashed #C4903A'}}/>}
                {spine.id === 'market' && <div style={{width:40, height:8, background:'#A8742A'}}/>}
                {spine.id === 'submissions' && <div style={{width:16, height:16, borderRadius:'50%', border:'2px solid #F0EDE8'}}/>}
                {spine.id === 'editor' && <div style={{width:'80%', height:2, background:'#E0B56A', margin:'0 auto'}}/>}
            </div>
          </div>
        ))}
      </div>
      <style>{`
        @keyframes spineFloat {
          0%   { transform: translateY(0px)    rotate(var(--tilt)); }
          50%  { transform: translateY(-10px)  rotate(var(--tilt)); }
          100% { transform: translateY(0px)    rotate(var(--tilt)); }
        }
        .spine-item:hover {
          width: 320px !important;
          z-index: 10;
        }
        .spine-item:hover .spine-text { opacity: 0 !important; }
        .spine-item:hover .spine-preview { opacity: 1 !important; }
        
        .spine-item:not(:hover) {
          /* slightly compress others when one is hovered... achievable via parent hover, but let's keep it simple here */
        }
      `}</style>
    </div>
  );
}
