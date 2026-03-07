import React, { useState, useCallback, memo } from 'react'
import { HiOutlineEnvelope } from 'react-icons/hi2'
import { generateQueryManual, downloadBlob } from '../../api.js'
import { GENRES } from './constants.jsx'
import { TabPanel, Field, RunButton, StatusBox } from './SharedUI.jsx'


const MemoizedFieldInput = memo(({ label, fieldKey, placeholder, required, area, value, onChange }) => (
    <Field label={label} required={required}>
        {area
            ? <textarea className="tool-input tool-textarea" rows={4} placeholder={placeholder} value={value} onChange={e => onChange(fieldKey, e.target.value)} />
            : <input className="tool-input" placeholder={placeholder} value={value} onChange={e => onChange(fieldKey, e.target.value)} />
        }
    </Field>
))

export default function QueryTab({ apiKey, aiModel, hasKey }) {
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

    const handleSet = useCallback((k, v) => setForm(p => ({ ...p, [k]: v })), [])

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



    return (
        <TabPanel>
            <div className="tool-desc">
                <HiOutlineEnvelope className="tool-desc-icon" />
                <p>Generate a complete submission package: Query Letter, 1-page Synopsis, Author Bio Sheet, Copyright Page. Professional query consultants charge $200–$800 for this.</p>
            </div>

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

            <RunButton onClick={run} loading={status === 'loading'} label="Generate Package → Download .zip" />
            <StatusBox status={status} onClear={() => setStatus(null)} />
        </TabPanel>
    )
}
