import React, { useState, useRef } from 'react'
import { HiOutlineBeaker } from 'react-icons/hi2'
import { analyseManuscript } from '../../api.js'
import { GENRES } from './constants.jsx'
import { TabPanel, FileDrop, Field, AIToggle, RunButton, StatusBox, AnalysisResults } from './SharedUI.jsx'

export default function AnalyseTab({ apiKey, aiModel, hasKey }) {
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
