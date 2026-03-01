import React, { useState } from 'react'
import { HiOutlineEnvelope } from 'react-icons/hi2'
import { generateQueryManual, downloadBlob } from '../../api.js'
import { GENRES } from './constants.jsx'
import { TabPanel, Field, RunButton, StatusBox } from './SharedUI.jsx'

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
