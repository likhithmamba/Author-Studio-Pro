import React, { useState } from 'react';
import { HiOutlineEnvelope, HiOutlineScale, HiOutlineGlobeAlt, HiOutlineClipboardDocumentList } from 'react-icons/hi2';
import { useStoryStore } from '../../../store/storyStore';
import { generateQueryAI, downloadBlob } from '../../../api'; 
import { useAuth } from '../../../contexts/AuthContext';
import { loadManuscriptFile } from '../../../utils/localCache';

export default function StrategistTab({ projectId }) {
    const [subTab, setSubTab] = useState('query'); // 'query' | 'market' | 'tracker'
    const { projectTitle, chapters, chapterOrder } = useStoryStore();
    const { token } = useAuth();
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState(null);

    const handleGenerate = async () => {
        setIsGenerating(true);
        setError(null);
        try {
            // Try to retrieve the original .docx from cache
            const cachedFile = await loadManuscriptFile();
            if (!cachedFile) {
                setError('No .docx manuscript found in cache. Please upload your manuscript in the Publishing Tools → Query tab first, then return here.');
                return;
            }

            const totalWords = Object.values(chapters).reduce((s, c) => s + (c.wordCount || 0), 0);

            const payload = {
                title: projectTitle || 'Untitled',
                author_name: 'Author', // Placeholder — user should set in Query tab
                word_count: totalWords,
            };

            const res = await generateQueryAI({ file: cachedFile, payload });
            if (res && res.blob) {
                downloadBlob(res.blob, res.filename);
            }
        } catch (e) {
            console.error(e);
            setError(e.detail || e.message || 'AI query generation failed. Please try again.');
        } finally {
            setIsGenerating(false);
        }
    };
    
    return (
        <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Sub-navigation */}
            <div style={{ display: 'flex', gap: '8px', padding: '8px 0', borderBottom: '1px solid #2a2a2a', position: 'sticky', top: 0, background: '#1a1a1a', zIndex: 5 }}>
                <SubTabBtn id="query" active={subTab} set={setSubTab} icon={<HiOutlineEnvelope />} />
                <SubTabBtn id="market" active={subTab} set={setSubTab} icon={<HiOutlineGlobeAlt />} />
                <SubTabBtn id="tracker" active={subTab} set={setSubTab} icon={<HiOutlineClipboardDocumentList />} />
            </div>

            {subTab === 'query' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ fontSize: '11px', color: '#6b6560' }}>Synthesize a professional query package from your latest draft.</div>
                    
                    <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px' }}>
                        <div style={{ fontSize: '10px', color: '#6b6560', marginBottom: '8px' }}>Project Info</div>
                        <div style={{ color: '#c9915a', fontWeight: 'bold' }}>{projectTitle}</div>
                        <div style={{ fontSize: '11px', opacity: 0.6 }}>{Object.values(chapters).reduce((s,c)=>s+c.wordCount,0).toLocaleString()} words</div>
                    </div>

                    <button 
                        onClick={handleGenerate}
                        disabled={isGenerating}
                        style={{
                            width: '100%', padding: '12px', borderRadius: '8px',
                            background: isGenerating ? 'rgba(139, 92, 246, 0.1)' : 'rgba(139, 92, 246, 0.2)', color: '#a78bfa',
                            fontWeight: 'bold', fontSize: '12px', border: '1px solid rgba(139, 92, 246, 0.4)',
                            cursor: isGenerating ? 'wait' : 'pointer'
                        }}
                    >
                        {isGenerating ? '⏳ Generating AI Package...' : '🚀 Generate Query Package'}
                    </button>

                    {error && (
                        <div style={{ 
                            fontSize: '11px', color: '#f87171', background: 'rgba(248,113,113,0.08)',
                            padding: '10px 12px', borderRadius: '6px', border: '1px solid rgba(248,113,113,0.2)'
                        }}>
                            ⚠️ {error}
                        </div>
                    )}
                    
                    <div style={{ fontSize: '10px', opacity: 0.4, fontStyle: 'italic' }}>
                        Upload your .docx manuscript in Publishing Tools → Query tab first. AI reads the actual manuscript to draft your synopsis and query letter.
                    </div>
                </div>
            )}

            {subTab === 'market' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ fontSize: '11px', color: '#6b6560' }}>Search for agents and publishers in your genre.</div>
                    <input 
                        placeholder="Search markets..."
                        style={{ background: '#111', border: '1px solid #2a2a2a', color: '#fff', padding: '8px', borderRadius: '4px', fontSize: '12px' }}
                    />
                    <div style={{ opacity: 0.5, fontSize: '12px', textAlign: 'center', padding: '20px' }}>
                        Market data search coming soon to unified studio.
                    </div>
                </div>
            )}

            {subTab === 'tracker' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                   <div style={{ fontSize: '11px', color: '#6b6560' }}>Log your submissions and track status.</div>
                   <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px', fontSize: '12px' }}>
                       You have 0 active submissions.
                   </div>
                </div>
            )}
        </div>
    );
}

function SubTabBtn({ id, active, set, icon }) {
    return (
        <button 
            onClick={() => set(id)}
            style={{
                flex: 1, padding: '8px', borderRadius: '6px', fontSize: '14px',
                background: active === id ? 'rgba(201, 145, 90, 0.1)' : 'transparent',
                color: active === id ? '#c9915a' : '#6b6560',
                border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}
            title={id.charAt(0).toUpperCase() + id.slice(1)}
        >
            {icon}
        </button>
    );
}
