import React, { useState, useRef, useCallback } from 'react'
import { HiOutlineDocumentText } from 'react-icons/hi2'
import { formatManuscript, downloadBlob } from '../../api.js'
import { TEMPLATES } from './constants.jsx'
import { TabPanel, FileDrop, Field, AIToggle, RunButton, StatusBox, MemoizedFieldInput } from './SharedUI.jsx'

export default function FormatTab({ apiKey, aiModel, hasKey }) {
    const [file, setFile] = useState(null)
    const [author, setAuthor] = useState('')
    const [title, setTitle] = useState('')
    const [template, setTemplate] = useState('us_standard')

    const handleAuthorChange = useCallback((k, v) => setAuthor(v), [])
    const handleTitleChange = useCallback((k, v) => setTitle(v), [])
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
                <MemoizedFieldInput label="Author Name" fieldKey="author" value={author} onChange={handleAuthorChange} placeholder="Jane Smith" required />
                <MemoizedFieldInput label="Manuscript Title" fieldKey="title" value={title} onChange={handleTitleChange} placeholder="The Lost Hours" required />
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
