import React, { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
    HiOutlineCloudArrowUp,
    HiOutlineXMark,
    HiOutlineSparkles,
    HiOutlineLockClosed,
    HiOutlineExclamationCircle,
    HiOutlineCheckCircle
} from 'react-icons/hi2'

export function TabPanel({ children }) {
    return (
        <motion.div
            className="tool-tab-panel"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
        >
            {children}
        </motion.div>
    )
}

export function FileDrop({ file, onFile, fileRef }) {
    const [drag, setDrag] = useState(false)

    const handleDrop = useCallback(e => {
        e.preventDefault()
        setDrag(false)
        const f = e.dataTransfer.files[0]
        if (f && f.name.endsWith('.docx')) onFile(f)
    }, [onFile])

    return (
        <div
            className={`file-drop ${drag ? 'dragging' : ''} ${file ? 'has-file' : ''}`}
            onClick={() => fileRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDrag(true) }}
            onDragLeave={() => setDrag(false)}
            onDrop={handleDrop}
        >
            <input
                ref={fileRef}
                type="file"
                accept=".docx"
                style={{ display: 'none' }}
                onChange={e => onFile(e.target.files[0] || null)}
            />
            <HiOutlineCloudArrowUp className="file-drop-icon" />
            {file
                ? <><strong>{file.name}</strong><span>{(file.size / 1024).toFixed(0)} KB</span></>
                : <><strong>Drop your .docx here</strong><span>or click to browse</span></>
            }
            {file && (
                <button
                    className="file-drop-clear"
                    onClick={e => { e.stopPropagation(); onFile(null) }}
                    aria-label="Remove file"
                >
                    <HiOutlineXMark />
                </button>
            )}
        </div>
    )
}

export function Field({ label, required, children }) {
    return (
        <div className="tool-field">
            <label className="tool-label">{label}{required && <span className="tool-required"> *</span>}</label>
            {children}
        </div>
    )
}

export function AIToggle({ hasKey, checked, onChange, label, desc }) {
    return (
        <div className={`ai-toggle-row ${!hasKey ? 'locked' : ''}`}>
            <div>
                <div className="ai-toggle-label">
                    <HiOutlineSparkles />
                    {label}
                    {!hasKey && <span className="ai-toggle-lock"><HiOutlineLockClosed /> Add key in Settings</span>}
                </div>
                <div className="ai-toggle-desc">{desc}</div>
            </div>
            <button
                className={`toggle-switch ${checked && hasKey ? 'toggle-on' : ''}`}
                onClick={() => hasKey && onChange(!checked)}
                role="switch"
                aria-checked={checked && hasKey}
                disabled={!hasKey}
                title={!hasKey ? 'Add your OpenRouter API key in ⚙️ Settings to enable AI features' : ''}
            >
                <span className="toggle-knob" />
            </button>
        </div>
    )
}

export function RunButton({ onClick, loading, label }) {
    return (
        <button className="run-btn" onClick={onClick} disabled={loading}>
            {loading
                ? <><span className="run-spinner" /> Processing…</>
                : label
            }
        </button>
    )
}

export function StatusBox({ status, onClear }) {
    if (!status || status === 'loading') return null
    return (
        <motion.div
            className={`status-box ${status.err ? 'error' : 'success'}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
        >
            {status.err
                ? <><HiOutlineExclamationCircle /> {status.err}</>
                : <><HiOutlineCheckCircle /> {status.ok}</>
            }
            {status.warnings?.length > 0 && (
                <ul className="status-warnings">
                    {status.warnings.map((w, i) => <li key={i}>⚠ {w}</li>)}
                </ul>
            )}
            <button className="status-close" onClick={onClear} aria-label="Dismiss"><HiOutlineXMark /></button>
        </motion.div>
    )
}

export function StatCard({ label, value }) {
    return (
        <div className="stat-card">
            <div className="stat-value">{value ?? '—'}</div>
            <div className="stat-label">{label}</div>
        </div>
    )
}

export function AnalysisResults({ data }) {
    return (
        <div className="analysis-results">
            <div className="analysis-grid">
                {/* Core stats */}
                <StatCard label="Words" value={data.total_words?.toLocaleString()} />
                <StatCard label="Sentences" value={data.total_sentences?.toLocaleString()} />
                <StatCard label="Paragraphs" value={data.total_paragraphs?.toLocaleString()} />
                <StatCard label="Chapters" value={data.total_chapters} />
                <StatCard label="Unique Words" value={data.unique_words?.toLocaleString()} />
                <StatCard label="Lexical Diversity" value={`${(data.lexical_diversity * 100).toFixed(1)}%`} />
            </div>

            {/* Readability */}
            {data.readability && (
                <details className="analysis-section" open>
                    <summary className="analysis-section-title">Readability</summary>
                    <div className="analysis-grid-4">
                        <StatCard label="Flesch Ease" value={data.readability.flesch_ease?.toFixed(1)} />
                        <StatCard label="Flesch-Kincaid" value={data.readability.flesch_kincaid?.toFixed(1)} />
                        <StatCard label="Gunning Fog" value={data.readability.gunning_fog?.toFixed(1)} />
                        <StatCard label="Avg Sentence" value={`${data.readability.avg_sentence_words?.toFixed(1)} words`} />
                    </div>
                    <div className="analysis-interpretation">{data.readability.interpretation}</div>
                </details>
            )}

            {/* Style */}
            {data.style && (
                <div className="analysis-section">
                    <div className="analysis-section-title">Style Metrics</div>
                    <div className="analysis-grid-4">
                        <StatCard label="Dialogue" value={`${data.style.dialogue_pct?.toFixed(1)}%`} />
                        <StatCard label="Adverb Density" value={`${data.style.adverb_density?.toFixed(2)}/100w`} />
                        <StatCard label="Passive Voice" value={`${data.style.passive_voice_pct?.toFixed(1)}%`} />
                        <StatCard label="Avg Para Words" value={data.style.avg_paragraph_words?.toFixed(1)} />
                    </div>
                </div>
            )}

            {/* Pacing */}
            {data.pacing?.pacing_verdict && (
                <div className="analysis-section">
                    <div className="analysis-section-title">Pacing</div>
                    <div className="analysis-interpretation">{data.pacing.pacing_verdict}</div>
                </div>
            )}

            {/* Editorial flags */}
            {data.editorial_flags?.length > 0 && (
                <div className="analysis-section">
                    <div className="analysis-section-title">Editorial Flags</div>
                    <ul className="editorial-flags">
                        {data.editorial_flags.map((f, i) => <li key={i}>⚠ {f}</li>)}
                    </ul>
                </div>
            )}

            {/* AI analysis */}
            {data.ai_analysis && !data.ai_analysis.error && (
                <div className="analysis-section ai-section">
                    <div className="analysis-section-title">
                        <HiOutlineSparkles /> AI Editorial Commentary
                        <span className="ai-model-badge">{data.ai_analysis.model_used?.split('/').pop()}</span>
                    </div>
                    {data.ai_analysis.overall_verdict && (
                        <div className="ai-verdict">"{data.ai_analysis.overall_verdict}"</div>
                    )}
                    {data.ai_analysis.top_3_strengths?.length > 0 && (
                        <div className="ai-list green">
                            <strong>Top Strengths</strong>
                            <ol>{data.ai_analysis.top_3_strengths.map((s, i) => <li key={i}>{s}</li>)}</ol>
                        </div>
                    )}
                    {data.ai_analysis.top_3_priorities?.length > 0 && (
                        <div className="ai-list amber">
                            <strong>Priority Revisions</strong>
                            <ol>{data.ai_analysis.top_3_priorities.map((s, i) => <li key={i}>{s}</li>)}</ol>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

export function MarketResults({ data, assessment }) {
    const pct = v => Math.round(((v - data.wc_min) / (data.wc_max - data.wc_min)) * 100)

    return (
        <div className="market-results">
            <div className="market-header">
                <strong>{data.name}</strong>
                <span className="market-category">{data.category}</span>
            </div>

            {/* Word count bar */}
            <div className="wc-bar-section">
                <div className="wc-labels">
                    <span>Min {data.wc_min?.toLocaleString()}</span>
                    <span>Sweet spot {data.wc_sweet?.toLocaleString()}</span>
                    <span>Max {data.wc_max?.toLocaleString()}</span>
                </div>
                <div className="wc-bar-track">
                    <div className="wc-bar-sweet" style={{ left: `${pct(data.wc_sweet) - 10}%`, width: '20%' }} />
                </div>
                {assessment && (
                    <div className={`wc-assessment ${assessment.viable ? 'viable' : 'warning'}`}>
                        {assessment.verdict}
                    </div>
                )}
            </div>

            <div className="market-notes">
                <div className="market-note-card"><strong>Market</strong><p>{data.market_note}</p></div>
                <div className="market-note-card"><strong>Agent expectations</strong><p>{data.agent_note}</p></div>
                <div className="market-note-card"><strong>Debut advice</strong><p>{data.debut_note}</p></div>
                <div className="market-note-card"><strong>Comparable titles</strong><p>{data.comp_note}</p></div>
            </div>

            {data.rejection_flags?.length > 0 && (
                <div className="market-flags">
                    <strong>Rejection triggers to avoid</strong>
                    <ul>{data.rejection_flags.map((f, i) => <li key={i}>🚩 {f}</li>)}</ul>
                </div>
            )}

            {data.publishers?.length > 0 && (
                <div className="market-publishers">
                    <strong>Key publishers</strong>
                    <div className="publisher-chips">
                        {data.publishers.map((p, i) => <span key={i} className="publisher-chip">{p}</span>)}
                    </div>
                </div>
            )}
        </div>
    )
}
