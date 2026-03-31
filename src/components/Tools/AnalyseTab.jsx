import React, { useState, useRef, useEffect } from 'react'
import { HiOutlineBeaker } from 'react-icons/hi2'
import { analyseText } from '../../api.js'
import { parseDocx } from '../../utils/docxParser.js'
import { getOptimalModel } from '../../utils/modelStrategy.js'
import { saveAnalysisResult, loadAnalysisResult } from '../../utils/localCache.js'
import { detectCliches } from '../../utils/analysis/clicheDetector.js'
import { auditOpening } from '../../utils/analysis/openingAudit.js'
import { analyzeHooks } from '../../utils/analysis/hookAnalyzer.js'
import { loadApiKey, getDeviceFingerprint } from '../../utils/keyStorage.js'
import { GENRES } from './constants.jsx'
import { TabPanel, FileDrop, Field, AIToggle, RunButton, StatusBox, AnalysisResults } from './SharedUI.jsx'

export default function AnalyseTab({ apiKey, aiModel, hasKey, currentProjectId }) {
    const [file, setFile] = useState(null)
    const [genre, setGenre] = useState('literary_fiction')
    const [useAI, setUseAI] = useState(false)
    const [status, setStatus] = useState(null)
    const [result, setResult] = useState(null)
    const [localAnalysis, setLocalAnalysis] = useState(null)
    const fileRef = useRef()

    // Cache restore on mount
    useEffect(() => {
        if (currentProjectId) {
            loadAnalysisResult(currentProjectId).then(cached => {
                if (cached) {
                    setResult(cached)
                    setStatus({ ok: 'Showing previous analysis. Upload a file to re-analyse.' })
                }
            }).catch(() => {})
        }
    }, [currentProjectId])

    const run = async () => {
        if (!file) { setStatus({ err: 'Upload a manuscript file.' }); return }
        setStatus('loading')
        setResult(null)
        setLocalAnalysis(null)

        // Step 1: parse in browser
        const parsed = await parseDocx(file)
        if (parsed.error) { setStatus({ err: parsed.error }); return }

        // Step 2: send text to backend
        try {
            const localKey = loadApiKey(getDeviceFingerprint()) || ''
            const data = await analyseText({
                rawText: parsed.rawText,
                chapters: parsed.chapters,
                totalWords: parsed.totalWords,
                genre,
                useAI: useAI && hasKey,
                apiKey: useAI ? localKey : '',
                aiModel: getOptimalModel('editorial', aiModel),
            })
            setResult(data)
            if (currentProjectId) {
                saveAnalysisResult(currentProjectId, data).catch(() => {})
            }
            setStatus({
                ok: `Analysis complete. ${data.total_words?.toLocaleString()} words, ${data.total_chapters} chapters.`,
                warnings: parsed.warnings,
            })

            // Step 3: Run browser-side analysis utilities (non-blocking)
            Promise.allSettled([
                detectCliches(parsed.rawText),
                auditOpening(parsed.chapters[0]?.paragraphs?.join(' ') || ''),
                analyzeHooks(parsed.chapters),
            ]).then(([clicheResult, auditResult, hookResult]) => {
                setLocalAnalysis({
                    cliches: clicheResult.status === 'fulfilled' ? clicheResult.value : null,
                    openingAudit: auditResult.status === 'fulfilled' ? auditResult.value : null,
                    hooks: hookResult.status === 'fulfilled' ? hookResult.value : null,
                })
            })
        } catch (e) {
            setStatus({ err: e.detail || e.message || 'Analysis failed.' })
        }
    }

    return (
        <TabPanel>
            <div className="tool-desc">
                <HiOutlineBeaker className="tool-desc-icon" />
                <p>Structural analysis runs entirely locally — readability scores, style metrics, pacing, and editorial flags. Enable AI for an additional developmental editorial layer with direct quotes from your manuscript.</p>
            </div>

            <FileDrop file={file} onFile={setFile} fileRef={fileRef} />

            <div className="tool-fields">
                <Field label="Genre">
                    <select className="tool-select" value={genre} onChange={e => setGenre(e.target.value)}>
                        {GENRES.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                    </select>
                </Field>
            </div>

            <AIToggle
                hasKey={hasKey}
                checked={useAI}
                onChange={setUseAI}
                label="AI editorial commentary"
                desc="3–4 API calls. Reads opening, midpoint, and closing sections; produces narrative editorial feedback with specific quotes."
            />

            <RunButton onClick={run} loading={status === 'loading'} label="Analyse Manuscript →" />
            <StatusBox status={status} onClear={() => setStatus(null)} />

            {result && <AnalysisResults data={result} />}

            {/* ─── Local Analysis Results ──────────────────────────────────────── */}
            {localAnalysis && (
                <div className="local-analysis-results" style={{ marginTop: '1.5rem' }}>
                    {/* Opening Audit */}
                    {localAnalysis.openingAudit && (
                        <div className="analysis-section glass-card" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
                            <h4 style={{ margin: '0 0 0.75rem', color: 'var(--accent-purple)' }}>
                                📖 Opening Audit — Score: {localAnalysis.openingAudit.score}/100
                            </h4>
                            <p style={{ margin: '0 0 0.5rem', opacity: 0.8, fontStyle: 'italic' }}>
                                {localAnalysis.openingAudit.verdict}
                            </p>
                            {localAnalysis.openingAudit.flags?.length > 0 && (
                                <ul style={{ margin: '0.5rem 0', paddingLeft: '1.25rem', listStyle: 'disc' }}>
                                    {localAnalysis.openingAudit.flags.map((f, i) => (
                                        <li key={i} style={{ marginBottom: '0.3rem', fontSize: '0.9rem' }}>
                                            <strong style={{ color: f.severity === 'critical' ? '#f44336' : f.severity === 'high' ? '#ff9800' : '#4caf50' }}>
                                                [{f.severity.toUpperCase()}]
                                            </strong>{' '}
                                            {f.type.replace(/_/g, ' ')} — <em>{f.quote}</em>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    )}

                    {/* Chapter Hook Map */}
                    {localAnalysis.hooks && localAnalysis.hooks.hooks?.length > 0 && (
                        <div className="analysis-section glass-card" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
                            <h4 style={{ margin: '0 0 0.75rem', color: 'var(--accent-emerald)' }}>
                                🪝 Chapter Hooks — {localAnalysis.hooks.strongPct}% strong
                            </h4>
                            <p style={{ margin: '0 0 0.5rem', opacity: 0.8 }}>
                                {localAnalysis.hooks.strongCount} strong / {localAnalysis.hooks.weakCount} weak out of {localAnalysis.hooks.hooks.length} chapters
                            </p>
                            {localAnalysis.hooks.hooks.filter(h => h.hookType === 'weak').length > 0 && (
                                <div style={{ fontSize: '0.9rem' }}>
                                    <strong>Weak chapters:</strong>{' '}
                                    {localAnalysis.hooks.hooks.filter(h => h.hookType === 'weak').map(h => h.chapterTitle).join(', ')}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Cliché Report */}
                    {localAnalysis.cliches && (
                        <div className="analysis-section glass-card" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
                            <h4 style={{ margin: '0 0 0.75rem', color: 'var(--accent-rose)' }}>
                                🔍 Cliché Report — {localAnalysis.cliches.totalCount} found
                            </h4>
                            {localAnalysis.cliches.totalCount === 0 ? (
                                <p style={{ opacity: 0.7 }}>No common clichés detected.</p>
                            ) : (
                                <ul style={{ margin: '0.5rem 0', paddingLeft: '1.25rem', listStyle: 'disc' }}>
                                    {localAnalysis.cliches.cliches.slice(0, 10).map((c, i) => (
                                        <li key={i} style={{ marginBottom: '0.2rem', fontSize: '0.9rem' }}>
                                            "{c.phrase}" — <strong>{c.count}×</strong>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    )}
                </div>
            )}
        </TabPanel>
    )
}
