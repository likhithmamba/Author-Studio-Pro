import React, { useState, useCallback, memo, useRef, useEffect } from 'react'
import { HiOutlineEnvelope } from 'react-icons/hi2'
import { generateQueryManual, generateQueryAI, downloadBlob } from '../../api.js'
import { scoreQuery } from '../../utils/queryScorer.js'
import { GENRES } from './constants.jsx'
import { saveManuscript, loadManuscript } from '../../utils/localCache.js'
import { parseDocx } from '../../utils/docxParser.js'
import { TabPanel, Field, AIToggle, RunButton, StatusBox, FileDrop } from './SharedUI.jsx'

const MemoizedFieldInput = memo(({ label, fieldKey, placeholder, required, area, value, onChange }) => (
    <Field label={label} required={required}>
        {area
            ? <textarea className="tool-input tool-textarea" rows={4} placeholder={placeholder} value={value} onChange={e => onChange(fieldKey, e.target.value)} />
            : <input className="tool-input" placeholder={placeholder} value={value} onChange={e => onChange(fieldKey, e.target.value)} />
        }
    </Field>
))

function QueryScorePanel({ score }) {
    if (!score) return null;
    const pct = Math.round((score.total / score.outOf) * 100)
    const color = pct >= 80 ? '#4caf50' : pct >= 60 ? '#ff9800' : '#f44336'
    const dims = [
        { key: 'hookStrength', label: 'Hook' },
        { key: 'conflictClarity', label: 'Conflict' },
        { key: 'stakesExplicitness', label: 'Stakes' },
        { key: 'compScore', label: 'Comps' },
        { key: 'lengthScore', label: 'Length' },
    ]
    return (
        <div className="query-score-panel glass-card" style={{ padding: '1.25rem', marginTop: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                <div style={{
                    width: 56, height: 56, borderRadius: '50%',
                    border: `3px solid ${color}`, display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.25rem', fontWeight: 700, color,
                }}>
                    {score.total}
                </div>
                <div>
                    <h4 style={{ margin: 0, color }}>Query Confidence: {pct}%</h4>
                    <p style={{ margin: 0, opacity: 0.7, fontSize: '0.85rem' }}>{score.total}/{score.outOf} points</p>
                </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.5rem', marginBottom: '1rem' }}>
                {dims.map(d => (
                    <div key={d.key} style={{ textAlign: 'center' }}>
                        <div style={{
                            width: '100%', height: 6, background: 'rgba(255,255,255,0.1)',
                            borderRadius: 3, overflow: 'hidden', marginBottom: 4,
                        }}>
                            <div style={{
                                width: `${(score.breakdown[d.key] / 10) * 100}%`, height: '100%',
                                background: score.breakdown[d.key] >= 7 ? '#4caf50' : score.breakdown[d.key] >= 4 ? '#ff9800' : '#f44336',
                                borderRadius: 3,
                            }} />
                        </div>
                        <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>{d.label}: {score.breakdown[d.key]}/10</span>
                    </div>
                ))}
            </div>
            {score.feedback?.length > 0 && (
                <ul style={{ margin: 0, paddingLeft: '1.25rem', listStyle: 'disc' }}>
                    {score.feedback.map((f, i) => (
                        <li key={i} style={{ fontSize: '0.9rem', marginBottom: '0.3rem', opacity: 0.9 }}>{f}</li>
                    ))}
                </ul>
            )}
        </div>
    )
}

export default function QueryTab({ apiKey, aiModel, hasKey }) {
    const [form, setForm] = useState({
        title: '', author_name: '', genre: 'literary_fiction', word_count: '',
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
    const [queryScore, setQueryScore] = useState(null)

    const handleSet = useCallback((k, v) => setForm(p => ({ ...p, [k]: v })), [])

    const [useAI, setUseAI] = useState(false)
    const [file, setFile] = useState(null)
    const [sharedManuscript, setSharedManuscript] = useState(null)
    const fileRef = useRef()

    useEffect(() => {
        loadManuscript().then(m => {
            if (m) {
                setSharedManuscript(m)
                if (m.wordCount) handleSet('word_count', m.wordCount.toString())
            }
        })
    }, [])

    const run = async () => {
        if (!form.title || !form.author_name) {
            setStatus({ err: 'Title and author name are required.' }); return
        }
        if (useAI && hasKey && !file && !sharedManuscript) {
            setStatus({ err: 'Please upload a manuscript file for AI generation.' }); return
        }
        setStatus('loading')
        setQueryScore(null)
        try {
            if (useAI && hasKey) {
                let activeFile = file;
                if (!activeFile && sharedManuscript) {
                    // Use cached parsed data directly or re-create Blob if needed
                    // Actually, generateQueryAI expects a File/Blob. 
                    // If we only have 'parsed' data, we might need to adjust generateQueryAI 
                    // or just use the raw text.
                }
                
                // For now, let's ensure we parse the file if it's new
                if (file) {
                    const parsed = await parseDocx(file);
                    saveManuscript({ filename: file.name, parsed, wordCount: parsed.totalWords }).catch(()=>{});
                }

                const result = await generateQueryAI({
                    file: file || new Blob([sharedManuscript?.parsed?.rawText || ''], { type: 'text/plain' }),
                    payload: { ...form, aiModel, word_count: parseInt(form.word_count) || 0 }
                })
                downloadBlob(result.blob, result.filename)
                setStatus({ ok: `✅ AI Package generated! Downloaded as ${result.filename}.` })
            } else {
                const result = await generateQueryManual({
                    ...form,
                    word_count: parseInt(form.word_count) || 0,
                })
                downloadBlob(result.blob, result.filename)
                setStatus({ ok: `✅ Package generated! Downloaded as ${result.filename}.` })
            }
        } catch (e) {
            setStatus({ err: e.detail || e.message || 'Query generation failed.' })
        }
    }

    const handleScoreQuery = () => {
        // Construct query letter text from form
        const queryText = [
            `Dear Agent,`,
            form.inciting_event ? `${form.protagonist}, ${form.inciting_event}` : '',
            form.central_conflict || '',
            form.stakes || '',
            form.synopsis_plot || '',
            form.title ? `${form.title.toUpperCase()} is a ${(form.word_count || '80,000').toLocaleString()}-word ${GENRES.find(g => g.value === form.genre)?.label || 'novel'}.` : '',
            form.comp_1_title ? `It will appeal to fans of ${form.comp_1_title} by ${form.comp_1_author}${form.comp_2_title ? ` and ${form.comp_2_title} by ${form.comp_2_author}` : ''}.` : '',
            form.bio_credits || '',
            `Thank you for your time and consideration.`,
            form.author_name,
        ].filter(Boolean).join('\n\n');

        const compYears = [form.comp_1_year, form.comp_2_year]
            .map(y => parseInt(y))
            .filter(y => !isNaN(y));

        const result = scoreQuery(queryText, compYears);
        setQueryScore(result);
    }

    return (
        <TabPanel>
            <div className="tool-desc">
                <HiOutlineEnvelope className="tool-desc-icon" />
                <p>Generate a complete submission package: Query Letter, 1-page Synopsis, Author Bio Sheet, Copyright Page. Professional query consultants charge $200–$800 for this.</p>
            </div>

            <AIToggle
                hasKey={hasKey}
                checked={useAI}
                onChange={setUseAI}
                label="AI Query Generation"
                desc="Upload your manuscript to have AI automatically write your synopsis and query letter based on your book's actual content."
            />

            {useAI && hasKey && (
                <>
                    <FileDrop file={file} onFile={setFile} fileRef={fileRef} />
                    {sharedManuscript && !file && (
                        <div style={{ marginTop: '-0.5rem', marginBottom: '1rem', fontSize: '0.85rem', opacity: 0.8 }}>
                            📌 Using previously uploaded: <strong>{sharedManuscript.filename}</strong>
                            <button 
                                onClick={() => { setSharedManuscript(null); setFile(null); }}
                                style={{ marginLeft: '1rem', color: 'var(--accent-rose)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                            >
                                Clear
                            </button>
                        </div>
                    )}
                </>
            )}

            <div className="tool-section-label">Manuscript Identity</div>
            <div className="tool-fields">
                <MemoizedFieldInput label="Manuscript Title" fieldKey="title" value={form.title} onChange={handleSet} placeholder="The Lost Hours" required />
                <MemoizedFieldInput label="Author Name" fieldKey="author_name" value={form.author_name} onChange={handleSet} placeholder="Jane Smith" required />
                <Field label="Genre">
                    <select className="tool-select" value={form.genre} onChange={e => handleSet('genre', e.target.value)}>
                        {GENRES.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                    </select>
                </Field>
                <MemoizedFieldInput label="Word Count" fieldKey="word_count" value={form.word_count} onChange={handleSet} placeholder="82,000" />
                <MemoizedFieldInput label="Series Note" fieldKey="series_note" value={form.series_note} onChange={handleSet} placeholder="Standalone with series potential" />
            </div>

            <div className="tool-section-label">Author Contact</div>
            <div className="tool-fields">
                <MemoizedFieldInput label="Email" fieldKey="email" value={form.email} onChange={handleSet} placeholder="author@email.com" />
                <MemoizedFieldInput label="Phone" fieldKey="phone" value={form.phone} onChange={handleSet} placeholder="+1 (555) 000-0000" />
                <MemoizedFieldInput label="Address" fieldKey="address" value={form.address} onChange={handleSet} placeholder="City, State, Country" />
                <MemoizedFieldInput label="Publishing Credits / Bio" fieldKey="bio_credits" value={form.bio_credits} onChange={handleSet} placeholder="Previously published in X, MFA from Y..." />
            </div>

            <div className="tool-section-label">Comparable Titles (optional)</div>
            <div className="tool-fields tool-fields-3col">
                <MemoizedFieldInput label="Comp 1 — Title" fieldKey="comp_1_title" value={form.comp_1_title} onChange={handleSet} placeholder="The Silent Patient" />
                <MemoizedFieldInput label="Comp 1 — Author" fieldKey="comp_1_author" value={form.comp_1_author} onChange={handleSet} placeholder="Alex Michaelides" />
                <MemoizedFieldInput label="Comp 1 — Year" fieldKey="comp_1_year" value={form.comp_1_year} onChange={handleSet} placeholder="2019" />
                <MemoizedFieldInput label="Comp 2 — Title" fieldKey="comp_2_title" value={form.comp_2_title} onChange={handleSet} placeholder="Gone Girl" />
                <MemoizedFieldInput label="Comp 2 — Author" fieldKey="comp_2_author" value={form.comp_2_author} onChange={handleSet} placeholder="Gillian Flynn" />
                <MemoizedFieldInput label="Comp 2 — Year" fieldKey="comp_2_year" value={form.comp_2_year} onChange={handleSet} placeholder="2012" />
            </div>

            <div className="tool-section-label">Story Elements (for query letter)</div>
            <div className="tool-fields">
                <MemoizedFieldInput label="Protagonist" fieldKey="protagonist" value={form.protagonist} onChange={handleSet} placeholder="SARAH CHEN, a forensic accountant" />
                <MemoizedFieldInput label="Setting" fieldKey="setting" value={form.setting} onChange={handleSet} placeholder="Present-day Tokyo" />
                <MemoizedFieldInput label="Inciting Event" fieldKey="inciting_event" value={form.inciting_event} onChange={handleSet} placeholder="discovers her boss has been laundering money for..." />
                <MemoizedFieldInput label="Central Conflict" fieldKey="central_conflict" value={form.central_conflict} onChange={handleSet} placeholder="must expose the corruption before..." />
                <MemoizedFieldInput label="Stakes" fieldKey="stakes" value={form.stakes} onChange={handleSet} placeholder="or her daughter's life is forfeit" />
                <MemoizedFieldInput label="Synopsis / Plot Summary" fieldKey="synopsis_plot" value={form.synopsis_plot} onChange={handleSet} placeholder="Write your full plot summary here..." area required />
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
                        <input type="checkbox" checked={form[k]} onChange={e => handleSet(k, e.target.checked)} />
                        {label}
                    </label>
                ))}
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginTop: '1rem' }}>
                <RunButton onClick={run} loading={status === 'loading'} label="Generate Package → Download .zip" />
                <button
                    className="btn-secondary"
                    onClick={handleScoreQuery}
                    disabled={!form.protagonist && !form.synopsis_plot}
                    style={{ whiteSpace: 'nowrap' }}
                >
                    📊 Score My Query
                </button>
            </div>
            <StatusBox status={status} onClear={() => setStatus(null)} />

            <QueryScorePanel score={queryScore} />
        </TabPanel>
    )
}
