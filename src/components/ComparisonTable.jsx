import { motion } from 'framer-motion'
import { useInView } from 'react-intersection-observer'
import { HiOutlineCheck, HiOutlineXMark, HiOutlineMinus } from 'react-icons/hi2'
import './ComparisonTable.css'

const competitors = [
    {
        name: 'Author Studio Pro',
        highlight: true,
        features: {
            formatting: 'full',
            aiAnalysis: 'full',
            queryGenerator: 'full',
            queryScorer: 'full',
            submissionTracker: 'full',
            editor: 'full',
            genreDatabase: 'full',
            clicheDetector: 'full',
            openingAudit: 'full',
            hookAnalysis: 'full',
            freeModels: 'full',
            localFirst: 'full',
            price: 'Free / ₹299',
        },
    },
    {
        name: 'Scrivener',
        features: {
            formatting: 'partial',
            aiAnalysis: 'none',
            queryGenerator: 'none',
            queryScorer: 'none',
            submissionTracker: 'none',
            editor: 'full',
            genreDatabase: 'none',
            clicheDetector: 'none',
            openingAudit: 'none',
            hookAnalysis: 'none',
            freeModels: 'none',
            localFirst: 'full',
            price: '$49 one-time',
        },
    },
    {
        name: 'Atticus',
        features: {
            formatting: 'full',
            aiAnalysis: 'none',
            queryGenerator: 'none',
            queryScorer: 'none',
            submissionTracker: 'none',
            editor: 'partial',
            genreDatabase: 'none',
            clicheDetector: 'none',
            openingAudit: 'none',
            hookAnalysis: 'none',
            freeModels: 'none',
            localFirst: 'none',
            price: '$147 one-time',
        },
    },
    {
        name: 'Dabble',
        features: {
            formatting: 'partial',
            aiAnalysis: 'none',
            queryGenerator: 'none',
            queryScorer: 'none',
            submissionTracker: 'none',
            editor: 'full',
            genreDatabase: 'none',
            clicheDetector: 'none',
            openingAudit: 'none',
            hookAnalysis: 'none',
            freeModels: 'none',
            localFirst: 'none',
            price: '$10/mo',
        },
    },
]

const featureRows = [
    { key: 'formatting', label: 'Manuscript Formatting' },
    { key: 'editor', label: 'Novel Editor' },
    { key: 'aiAnalysis', label: 'AI Manuscript Analysis' },
    { key: 'queryGenerator', label: 'AI Query Generator' },
    { key: 'queryScorer', label: 'Query Confidence Scorer' },
    { key: 'clicheDetector', label: 'Cliché Detector' },
    { key: 'openingAudit', label: 'Opening Page Audit' },
    { key: 'hookAnalysis', label: 'Chapter Hook Analysis' },
    { key: 'submissionTracker', label: 'Submission Tracker' },
    { key: 'genreDatabase', label: 'Genre Database (13+)' },
    { key: 'freeModels', label: 'Free AI Models' },
    { key: 'localFirst', label: 'Local-First / Privacy' },
]

function StatusIcon({ status }) {
    if (status === 'full') return <HiOutlineCheck style={{ color: '#4caf50', fontSize: '1.1rem' }} />
    if (status === 'partial') return <HiOutlineMinus style={{ color: '#ff9800', fontSize: '1.1rem' }} />
    return <HiOutlineXMark style={{ color: 'rgba(255,255,255,0.25)', fontSize: '1.1rem' }} />
}

export default function ComparisonTable() {
    const [ref, inView] = useInView({ triggerOnce: true, threshold: 0.1 })

    return (
        <section id="comparison" className="comparison-section section">
            <div className="container">
                <motion.div
                    className="comparison-header"
                    initial={{ opacity: 0, y: 20 }}
                    animate={inView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.6 }}
                    ref={ref}
                >
                    <span className="section-label">✦ Comparison</span>
                    <h2 className="section-title">How We Compare</h2>
                    <p className="section-subtitle">
                        No other tool gives you AI analysis, query generation, cliché detection, and submission tracking in one place.
                    </p>
                </motion.div>

                <motion.div
                    className="comparison-table-wrap"
                    initial={{ opacity: 0, y: 30 }}
                    animate={inView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.6, delay: 0.2 }}
                >
                    <table className="comparison-table">
                        <thead>
                            <tr>
                                <th className="comparison-feature-col">Feature</th>
                                {competitors.map(c => (
                                    <th key={c.name} className={c.highlight ? 'comparison-highlight-col' : ''}>
                                        {c.name}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {featureRows.map(row => (
                                <tr key={row.key}>
                                    <td className="comparison-feature-name">{row.label}</td>
                                    {competitors.map(c => (
                                        <td key={c.name} className={c.highlight ? 'comparison-highlight-col' : ''}>
                                            <StatusIcon status={c.features[row.key]} />
                                        </td>
                                    ))}
                                </tr>
                            ))}
                            <tr className="comparison-price-row">
                                <td className="comparison-feature-name"><strong>Price</strong></td>
                                {competitors.map(c => (
                                    <td key={c.name} className={c.highlight ? 'comparison-highlight-col comparison-price' : 'comparison-price'}>
                                        {c.features.price}
                                    </td>
                                ))}
                            </tr>
                        </tbody>
                    </table>
                </motion.div>
            </div>
        </section>
    )
}
