import React, { useState, useRef } from 'react'
import { HiOutlineDocumentText } from 'react-icons/hi2'
import { formatManuscript, formatText, downloadBlob } from '../../api.js'
import { TEMPLATES } from './constants.jsx'
import { saveManuscript, loadManuscript } from '../../utils/localCache.js'
import { TabPanel, FileDrop, Field, AIToggle, RunButton, StatusBox } from './SharedUI.jsx'

export default function FormatTab({ apiKey, aiModel, hasKey }) {
    const [file, setFile] = useState(null)
    const [author, setAuthor] = useState('')
    const [title, setTitle] = useState('')
    const [template, setTemplate] = useState('traditional')
    const [useAI, setUseAI] = useState(false)
    const [status, setStatus] = useState(null)   // null | 'loading' | {ok} | {err}
    const [sharedManuscript, setSharedManuscript] = useState(null)
    const fileRef = useRef()

    React.useEffect(() => {
        loadManuscript().then(m => {
            if (m) setSharedManuscript(m)
        })
    }, [])

    const run = async () => {
        if ((!file && !sharedManuscript) || !author.trim() || !title.trim()) {
            setStatus({ err: 'Please provide the manuscript file, author name, and title.' })
            return
        }
        setStatus('loading')
        try {
            let result;
            if (!file && sharedManuscript?.parsed?.chapters) {
                result = await formatText({
                    author: author.trim(),
                    title: title.trim(),
                    templateKey: template,
                    chapters: sharedManuscript.parsed.chapters
                })
            } else {
                let activeFile = file;
                if (!activeFile && sharedManuscript) {
                    activeFile = new Blob([sharedManuscript.parsed.rawText], { type: 'text/plain' });
                    activeFile.name = sharedManuscript.filename;
                }
                result = await formatManuscript({
                    file: activeFile, 
                    author: author.trim(), 
                    title: title.trim(),
                    templateKey: template,
                    useAI: useAI && hasKey,
                    apiKey: useAI ? apiKey : '',
                    aiModel,
                })
            }
            downloadBlob(result.blob, result.filename)
            
            let wcMsg = `${result.wordCount?.toLocaleString() || '—'} words`;
            let wcDiff = file ? null : (sharedManuscript?.wordCount && result.wordCount !== sharedManuscript.wordCount);
            if (wcDiff) {
                wcMsg = `${sharedManuscript.wordCount.toLocaleString()} → ${result.wordCount.toLocaleString()} words`;
            }
            
            setStatus({ 
                ok: `✅ Formatted! ${wcMsg}. Downloaded as ${result.filename}.`, 
                warnings: [...(result.warnings || []), ...(result.aiFixes || [])]
            })
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

            <FileDrop file={file} onFile={(f) => {
                setFile(f);
                // Save for other tools
                // We'd need to parse it here too to save it, but for now just setting it is fine.
            }} fileRef={fileRef} />

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
                    <div style={{ fontSize: '0.8rem', opacity: 0.7, marginTop: '0.25rem' }}>
                        {template === 'traditional' ? "Times New Roman • 12pt • Double Spaced • 1-inch margins" : 
                         template === 'modern' ? "Garamond • 12pt • 1.5 Spaced • 1-inch margins" :
                         template === 'uk_standard' ? "Times New Roman • 12pt • Double Spaced • A4 Size" :
                         template === 'self_pub_ready' ? "Garamond • 11pt • 1.5 Spaced • 0.5-inch indent" :
                         ""}
                    </div>
                </Field>
            </div>

            <AIToggle
                hasKey={hasKey}
                checked={useAI}
                onChange={setUseAI}
                label="AI-assisted chapter detection"
                desc="Uses 1 API call to learn your manuscript's chapter heading style — improves detection accuracy by ~30%."
            />

            <RunButton onClick={run} loading={status === 'loading'} label={useAI && hasKey ? "⚡ AI-Assisted Format →" : "Format Manuscript →"} />
            <StatusBox status={status} onClear={() => setStatus(null)} />
        </TabPanel>
    )
}
