import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useInView } from 'react-intersection-observer'
import {
    HiOutlineDocumentText, HiOutlineBeaker, HiOutlineEnvelope,
    HiOutlineChartBar, HiOutlineCloudArrowUp, HiOutlineSparkles,
    HiOutlineArrowDownTray, HiOutlineExclamationCircle,
    HiOutlineCheckCircle, HiOutlineLockClosed, HiOutlineXMark,
    HiOutlineCpuChip,
} from 'react-icons/hi2'
import {
    formatManuscript, analyseManuscript, generateQueryManual,
    getMarketData, getWordCountAssessment, downloadBlob,
} from '../api.js'
import './Tools.css'

const TABS = [
    { id: 'format', icon: <HiOutlineDocumentText />, label: 'Format', badge: 'No AI needed' },
    { id: 'analyse', icon: <HiOutlineBeaker />, label: 'Analyse', badge: 'AI optional' },
    { id: 'query', icon: <HiOutlineEnvelope />, label: 'Query', badge: 'Manual mode' },
    { id: 'market', icon: <HiOutlineChartBar />, label: 'Market', badge: 'No AI needed' },
]

const TEMPLATES = [
    { value: 'us_standard', label: 'US Standard (Curtis Brown)' },
    { value: 'uk_standard', label: 'UK Standard (AAR/PA)' },
    { value: 'literary', label: 'Literary / Academic' },
    { value: 'screenplay', label: 'Screenplay (WGA)' },
    { value: 'self_pub', label: 'Self-Publishing (KDP)' },
]

const GENRES = [
    { value: 'thriller', label: 'Thriller' },
    { value: 'mystery', label: 'Mystery / Crime' },
    { value: 'romance', label: 'Romance' },
    { value: 'fantasy', label: 'Fantasy' },
    { value: 'science_fiction', label: 'Science Fiction' },
    { value: 'literary', label: 'Literary Fiction' },
    { value: 'horror', label: 'Horror' },
    { value: 'historical', label: 'Historical Fiction' },
    { value: 'ya_contemp', label: 'YA Contemporary' },
    { value: 'ya_fantasy', label: 'YA Fantasy' },
    { value: 'cozy_mystery', label: 'Cozy Mystery' },
    { value: 'womens_fiction', label: "Women's Fiction" },
]

export default function Tools({ settings }) {
    const [tab, setTab] = useState('format')
    const [ref, inView] = useInView({ triggerOnce: true, threshold: 0.08 })

    const apiKey = settings?.openRouterKey || ''
    const aiModel = settings?.aiModel || 'mistralai/mistral-7b-instruct:free'
    const hasKey = Boolean(apiKey)

    return (
        <section id="tools" className="tools-section" ref={ref}>
            <div className="tools-inner">
                <motion.div
                    className="tools-header"
                    initial={{ opacity: 0, y: 32 }}
                    animate={inView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.7 }}
                >
                    <span className="tools-eyebrow">Interactive Tools</span>
                    <h2 className="tools-title">Try the Studio</h2>
                    <p className="tools-subtitle">
                        Upload your manuscript and process it right here.
                        Formatting and market data work without any API key.{' '}
                        <span className="tools-ai-note">
                            <HiOutlineCpuChip /> Add your OpenRouter key in ⚙️ Settings to enable AI features.
                        </span>
                    </p>
                    {hasKey && (
                        <div className="tools-key-banner">
                            <HiOutlineCheckCircle />
                            AI features active · Model: <strong>{aiModel.split('/').pop()}</strong>
                        </div>
                    )}
                </motion.div>

                {/* Tab bar */}
                <motion.div
                    className="tools-tabs"
                    initial={{ opacity: 0, y: 20 }}
                    animate={inView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.6, delay: 0.15 }}
                >
                    {TABS.map(t => (
                        <button
                            key={t.id}
                            className={`tools-tab ${tab === t.id ? 'active' : ''}`}
                            onClick={() => setTab(t.id)}
                        >
                            {t.icon}
                            <span>{t.label}</span>
                            <span className="tools-tab-badge">{t.badge}</span>
                        </button>
                    ))}
                </motion.div>

                {/* Tab panels */}
                <motion.div
                    className="tools-panel"
                    initial={{ opacity: 0, y: 24 }}
                    animate={inView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.6, delay: 0.25 }}
                >
                    <AnimatePresence mode="wait">
                        {tab === 'format' && <FormatTab key="format" apiKey={apiKey} aiModel={aiModel} hasKey={hasKey} />}
                        {tab === 'analyse' && <AnalyseTab key="analyse" apiKey={apiKey} aiModel={aiModel} hasKey={hasKey} />}
                        {tab === 'query' && <QueryTab key="query" apiKey={apiKey} aiModel={aiModel} hasKey={hasKey} />}
                        {tab === 'market' && <MarketTab key="market" />}
                    </AnimatePresence>
                </motion.div>

                {/* Privacy strip */}
                <div className="tools-privacy-strip">
                    <HiOutlineLockClosed />
                    Your manuscript never leaves your browser except for the direct API call to {hasKey ? 'OpenRouter (AI) and' : ''} our formatter. No files stored. Temp files deleted immediately.
                </div>
            </div>
        </section>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB: FORMAT
// ─────────────────────────────────────────────────────────────────────────────
function FormatTab({ apiKey, aiModel, hasKey }) {
    const [file, setFile] = useState(null)
    const [author, setAuthor] = useState('')
    const [title, setTitle] = useState('')
    const [template, setTemplate] = useState('us_standard')
    const [useAI, setUseAI] = useState(false)
    const [status, setStatus] = useState(null)   // null | 'loading' | {ok} | {err}
    const fileRef = useRef()

    const run = async () => {
        if (!file || !author.trim() || !title.trim()) {
            setStatus({ err: 'Please provide the manuscript file, author name, and title.' })
            return
        }
        setStatus('loading')
        try {
            const result = await formatManuscript({
                file, author: author.trim(), title: title.trim(),
                templateKey: template,
                useAI: useAI && hasKey,
                apiKey: useAI ? apiKey : '',
                aiModel,
            })
            downloadBlob(result.blob, result.filename)
            setStatus({ ok: `✅ Formatted! ${result.wordCount?.toLocaleString() || '—'} words. Downloaded as ${result.filename}.`, warnings: result.warnings })
        } catch (e) {
            setStatus({ err: e.detail || e.message || 'Formatting failed.' })
        }
    }

    return (
        <TabPanel>
            <div className="tool-desc">
                <HiOutlineDocumentText className="tool-desc-icon" />
                <p>Upload your <code>.docx</code> manuscript. We'll apply industry-standard formatting (Times New Roman 12pt, double-spaced, running header, title page) and return a submission-ready file.</p>
            </div>

            <FileDrop file={file} onFile={setFile} fileRef={fileRef} />

            <div className="tool-fields">
                <Field label="Author Name" required>
                    <input className="tool-input" placeholder="Jane Smith" value={author} onChange={e => setAuthor(e.target.value)} />
                </Field>
                <Field label="Manuscript Title" required>
                    <input className="tool-input" placeholder="The Lost Hours" value={title} onChange={e => setTitle(e.target.value)} />
                </Field>
                <Field label="Formatting Template">
                    <select className="tool-select" value={template} onChange={e => setTemplate(e.target.value)}>
                        {TEMPLATES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                </Field>
            </div>

            <AIToggle
                hasKey={hasKey}
                checked={useAI}
                onChange={setUseAI}
                label="AI-assisted chapter detection"
                desc="Uses 1 API call to learn your manuscript's chapter heading style — improves detection accuracy by ~30%."
            />

            <RunButton onClick={run} loading={status === 'loading'} label="Format Manuscript →" />
            <StatusBox status={status} onClear={() => setStatus(null)} />
        </TabPanel>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB: ANALYSE
// ─────────────────────────────────────────────────────────────────────────────
function AnalyseTab({ apiKey, aiModel, hasKey }) {
    const [file, setFile] = useState(null)
    const [genre, setGenre] = useState('literary')
    const [useAI, setUseAI] = useState(false)
    const [status, setStatus] = useState(null)
    const [result, setResult] = useState(null)
    const fileRef = useRef()

    const run = async () => {
        if (!file) { setStatus({ err: 'Please upload a manuscript file.' }); return }
        setStatus('loading')
        setResult(null)
        try {
            const data = await analyseManuscript({
                file, genre,
                useAI: useAI && hasKey,
                apiKey: useAI ? apiKey : '',
                aiModel,
            })
            setResult(data)
            setStatus({ ok: `✅ Analysis complete! ${data.total_words?.toLocaleString() || '—'} words across ${data.total_chapters} chapter${data.total_chapters !== 1 ? 's' : ''}.` })
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
        </TabPanel>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB: QUERY PACKAGE — Manual mode
// ─────────────────────────────────────────────────────────────────────────────
function QueryTab({ apiKey, aiModel, hasKey }) {
    const [form, setForm] = useState({
        title: '', author_name: '', genre: 'literary', word_count: '',
        email: '', phone: '', address: '',
        bio_credits: '', series_note: '',
        comp_1_title: '', comp_1_author: '', comp_1_year: '',
        comp_2_title: '', comp_2_author: '', comp_2_year: '',
        protagonist: '', setting: '', inciting_event: '',
        central_conflict: '', stakes: '', synopsis_plot: '',
        include_query: true, include_synopsis_1: true,
        include_synopsis_3: false, include_back_matter: true,
    })
    const [status, setStatus] = useState(null)

    const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

    const run = async () => {
        if (!form.title || !form.author_name) {
            setStatus({ err: 'Title and author name are required.' }); return
        }
        setStatus('loading')
        try {
            const result = await generateQueryManual({
                ...form,
                word_count: parseInt(form.word_count) || 0,
            })
            downloadBlob(result.blob, result.filename)
            setStatus({ ok: `✅ Package generated! Downloaded as ${result.filename}. Contains: Query Letter, Synopsis, Author Bio.` })
        } catch (e) {
            setStatus({ err: e.detail || e.message || 'Query generation failed.' })
        }
    }

    const FI = ({ label, k, placeholder, required, area }) => (
        <Field label={label} required={required}>
            {area
                ? <textarea className="tool-input tool-textarea" rows={4} placeholder={placeholder} value={form[k]} onChange={e => set(k, e.target.value)} />
                : <input className="tool-input" placeholder={placeholder} value={form[k]} onChange={e => set(k, e.target.value)} />
            }
        </Field>
    )

    return (
        <TabPanel>
            <div className="tool-desc">
                <HiOutlineEnvelope className="tool-desc-icon" />
                <p>Generate a complete submission package: Query Letter, 1-page Synopsis, Author Bio Sheet, Copyright Page. Professional query consultants charge $200–$800 for this.</p>
            </div>

            <div className="tool-section-label">Manuscript Identity</div>
            <div className="tool-fields">
                <FI label="Manuscript Title" k="title" placeholder="The Lost Hours" required />
                <FI label="Author Name" k="author_name" placeholder="Jane Smith" required />
                <Field label="Genre">
                    <select className="tool-select" value={form.genre} onChange={e => set('genre', e.target.value)}>
                        {GENRES.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                    </select>
                </Field>
                <FI label="Word Count" k="word_count" placeholder="82,000" />
                <FI label="Series Note" k="series_note" placeholder="Standalone with series potential" />
            </div>

            <div className="tool-section-label">Author Contact</div>
            <div className="tool-fields">
                <FI label="Email" k="email" placeholder="author@email.com" />
                <FI label="Phone" k="phone" placeholder="+1 (555) 000-0000" />
                <FI label="Address" k="address" placeholder="City, State, Country" />
                <FI label="Publishing Credits / Bio" k="bio_credits" placeholder="Previously published in X, MFA from Y..." />
            </div>

            <div className="tool-section-label">Comparable Titles (optional)</div>
            <div className="tool-fields tool-fields-3col">
                <FI label="Comp 1 — Title" k="comp_1_title" placeholder="The Silent Patient" />
                <FI label="Comp 1 — Author" k="comp_1_author" placeholder="Alex Michaelides" />
                <FI label="Comp 1 — Year" k="comp_1_year" placeholder="2019" />
                <FI label="Comp 2 — Title" k="comp_2_title" placeholder="Gone Girl" />
                <FI label="Comp 2 — Author" k="comp_2_author" placeholder="Gillian Flynn" />
                <FI label="Comp 2 — Year" k="comp_2_year" placeholder="2012" />
            </div>

            <div className="tool-section-label">Story Elements (for query letter)</div>
            <div className="tool-fields">
                <FI label="Protagonist" k="protagonist" placeholder="SARAH CHEN, a forensic accountant" />
                <FI label="Setting" k="setting" placeholder="Present-day Tokyo" />
                <FI label="Inciting Event" k="inciting_event" placeholder="discovers her boss has been laundering money for..." />
                <FI label="Central Conflict" k="central_conflict" placeholder="must expose the corruption before..." />
                <FI label="Stakes" k="stakes" placeholder="or her daughter's life is forfeit" />
                <FI label="Synopsis / Plot Summary" k="synopsis_plot" placeholder="Write your full plot summary here..." area required />
            </div>

            <div className="tool-section-label">Package Contents</div>
            <div className="tool-checkboxes">
                {[
                    { k: 'include_query', label: 'Query Letter (1 page)' },
                    { k: 'include_synopsis_1', label: '1-Page Synopsis (~500 words)' },
                    { k: 'include_synopsis_3', label: '3-Page Synopsis (~1,200 words)' },
                    { k: 'include_back_matter', label: 'Author Bio + Copyright Page' },
                ].map(({ k, label }) => (
                    <label key={k} className="tool-checkbox-item">
                        <input type="checkbox" checked={form[k]} onChange={e => set(k, e.target.checked)} />
                        {label}
                    </label>
                ))}
            </div>

            <RunButton onClick={run} loading={status === 'loading'} label="Generate Package → Download .zip" />
            <StatusBox status={status} onClear={() => setStatus(null)} />
        </TabPanel>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB: MARKET INTELLIGENCE
// ─────────────────────────────────────────────────────────────────────────────
function MarketTab() {
    const [genre, setGenre] = useState('thriller')
    const [wc, setWc] = useState('')
    const [data, setData] = useState(null)
    const [assessment, setAssessment] = useState(null)
    const [status, setStatus] = useState(null)

    const run = async () => {
        setStatus('loading')
        setData(null)
        setAssessment(null)
        try {
            const [mkt, ass] = await Promise.all([
                getMarketData(genre),
                wc ? getWordCountAssessment(genre, parseInt(wc)) : null,
            ])
            setData(mkt)
            if (ass) setAssessment(ass)
            setStatus({ ok: `✅ Loaded market data for ${mkt.name}.` })
        } catch (e) {
            setStatus({ err: e.detail || e.message || 'Failed to load market data.' })
        }
    }

    return (
        <TabPanel>
            <div className="tool-desc">
                <HiOutlineChartBar className="tool-desc-icon" />
                <p>Genre benchmarks, word count viability, agent expectations, and submission intelligence — all from the built-in database. No API key needed.</p>
            </div>

            <div className="tool-fields">
                <Field label="Genre">
                    <select className="tool-select" value={genre} onChange={e => setGenre(e.target.value)}>
                        {GENRES.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                    </select>
                </Field>
                <Field label="Your Word Count (optional)">
                    <input className="tool-input" type="number" placeholder="82000" value={wc} onChange={e => setWc(e.target.value)} />
                </Field>
            </div>

            <RunButton onClick={run} loading={status === 'loading'} label="Load Market Intelligence →" />
            <StatusBox status={status} onClear={() => setStatus(null)} />

            {data && <MarketResults data={data} assessment={assessment} />}
        </TabPanel>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// SHARED SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────
function TabPanel({ children }) {
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

function FileDrop({ file, onFile, fileRef }) {
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

function Field({ label, required, children }) {
    return (
        <div className="tool-field">
            <label className="tool-label">{label}{required && <span className="tool-required"> *</span>}</label>
            {children}
        </div>
    )
}

function AIToggle({ hasKey, checked, onChange, label, desc }) {
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

function RunButton({ onClick, loading, label }) {
    return (
        <button className="run-btn" onClick={onClick} disabled={loading}>
            {loading
                ? <><span className="run-spinner" /> Processing…</>
                : label
            }
        </button>
    )
}

function StatusBox({ status, onClear }) {
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

// ─── Analysis results display ─────────────────────────────────────────────
function AnalysisResults({ data }) {
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
                <detail className="analysis-section">
                    <div className="analysis-section-title">Readability</div>
                    <div className="analysis-grid-4">
                        <StatCard label="Flesch Ease" value={data.readability.flesch_ease?.toFixed(1)} />
                        <StatCard label="Flesch-Kincaid" value={data.readability.flesch_kincaid?.toFixed(1)} />
                        <StatCard label="Gunning Fog" value={data.readability.gunning_fog?.toFixed(1)} />
                        <StatCard label="Avg Sentence" value={`${data.readability.avg_sentence_words?.toFixed(1)} words`} />
                    </div>
                    <div className="analysis-interpretation">{data.readability.interpretation}</div>
                </detail>
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

function StatCard({ label, value }) {
    return (
        <div className="stat-card">
            <div className="stat-value">{value ?? '—'}</div>
            <div className="stat-label">{label}</div>
        </div>
    )
}

// ─── Market results display ───────────────────────────────────────────────
function MarketResults({ data, assessment }) {
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
