import React, { useState } from 'react'
import { HiOutlineChartBar } from 'react-icons/hi2'
import { getMarketData, getWordCountAssessment } from '../../api.js'
import { GENRES } from './constants.jsx'
import { TabPanel, Field, RunButton, StatusBox, MarketResults, MemoizedFieldInput } from './SharedUI.jsx'

export default function MarketTab() {
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
                <MemoizedFieldInput label="Your Word Count (optional)" type="number" value={wc} onChange={setWc} placeholder="82000" />
            </div>

            <RunButton onClick={run} loading={status === 'loading'} label="Load Market Intelligence →" />
            <StatusBox status={status} onClear={() => setStatus(null)} />

            {data && <MarketResults data={data} assessment={assessment} />}
        </TabPanel>
    )
}
