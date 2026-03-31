import { motion } from 'framer-motion'
import { useInView } from 'react-intersection-observer'
import {
    HiOutlineDocumentText,
    HiOutlineBeaker,
    HiOutlineChartBar,
    HiOutlineEnvelope,
    HiOutlineClipboardDocumentList,
    HiOutlinePencilSquare,
} from 'react-icons/hi2'
import './Features.css'

const features = [
    {
        icon: <HiOutlineEnvelope />,
        title: 'Query Package Builder',
        description: 'AI reads your manuscript and generates a hook sentence, plot paragraph, full synopsis, and complete query letter. Includes a built-in Query Confidence Scorer that rates your letter on 5 dimensions. What consultants charge $200–$800 for.',
        color: 'var(--accent-rose)',
        tag: 'QUERY',
        highlights: ['AI-Generated Hook', 'Synopsis Writer', 'Query Letter', 'Confidence Scorer'],
    },
    {
        icon: <HiOutlineClipboardDocumentList />,
        title: 'Submission Tracker',
        description: 'Track every agent query — submission dates, response times, request types, and outcomes. CSV export for spreadsheet users. See your full query campaign at a glance with stats and timelines.',
        color: 'var(--accent-amber)',
        tag: 'TRACK',
        highlights: ['Agent Tracking', 'Response Times', 'Status Pipeline', 'CSV Export'],
    },
    {
        icon: <HiOutlineBeaker />,
        title: 'AI Manuscript Analysis',
        description: 'Two-layer intelligence: structural statistics (Flesch scores, pacing, style flags) combined with AI that reads your opening, midpoint, and closing. Plus a cliché detector and opening page audit that catches the same red flags agents flag.',
        color: 'var(--accent-purple)',
        tag: 'ANALYSE',
        highlights: ['Readability Scores', 'Opening Audit', 'Cliché Detection', 'Hook Analysis'],
    },
    {
        icon: <HiOutlinePencilSquare />,
        title: 'Novel Editor',
        description: 'A distraction-free chapter-based editor built for long-form fiction. Auto-saves every 5 seconds to IndexedDB. Word count targets, focus mode, and AI writing assists — continue a scene, rewrite a paragraph, or get naming suggestions.',
        color: 'var(--accent-blue)',
        tag: 'EDITOR',
        highlights: ['Auto-save', 'Chapter Manager', 'Focus Mode', 'AI Assist'],
    },
    {
        icon: <HiOutlineDocumentText />,
        title: 'Manuscript Formatter',
        description: 'Apply any of 5 internationally recognised publishing standards — US Standard, UK Submission, Modern Agent, Literary Review, or Custom — with one click. Produces a perfectly formatted .docx with running headers, title page, and correct indent rules.',
        color: 'var(--gold-primary)',
        tag: 'FORMAT',
        highlights: ['5 Templates', 'Running Headers', 'Auto Title Page', 'Custom Overrides'],
    },
    {
        icon: <HiOutlineChartBar />,
        title: 'Market Intelligence',
        description: 'Genre-specific benchmarks from Publishers Marketplace, QueryTracker, and AAR data. Word count viability assessment, rejection triggers, agent expectations, comp title guidance, and publisher recommendations.',
        color: 'var(--accent-emerald)',
        tag: 'MARKET',
        highlights: ['13 Genres', 'Word Count Targets', 'Rejection Flags', 'Publisher Lists'],
    },
]

const containerVariants = {
    hidden: {},
    visible: {
        transition: { staggerChildren: 0.12 },
    },
}

const cardVariants = {
    hidden: { opacity: 0, y: 40 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
    },
}

export default function Features() {
    const [ref, inView] = useInView({ triggerOnce: true, threshold: 0.1 })

    return (
        <section id="features" className="features section">
            <div className="container">
                <motion.div
                    className="features-header"
                    initial={{ opacity: 0, y: 20 }}
                    animate={inView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.6 }}
                    ref={ref}
                >
                    <span className="section-label">✦ Core Modules</span>
                    <h2 className="section-title">Six Engines. One Studio.</h2>
                    <p className="section-subtitle">
                        Every tool a professional author needs — from first draft to agent submission — engineered into a single, cohesive workflow.
                    </p>
                </motion.div>

                <motion.div
                    className="features-grid"
                    variants={containerVariants}
                    initial="hidden"
                    animate={inView ? 'visible' : 'hidden'}
                >
                    {features.map((feature, i) => (
                        <motion.div
                            key={i}
                            className="feature-card glass-card"
                            variants={cardVariants}
                            whileHover={{ y: -8, transition: { duration: 0.3 } }}
                        >
                            <div className="feature-tag" style={{ color: feature.color, borderColor: feature.color }}>
                                {feature.tag}
                            </div>
                            <div className="feature-icon" style={{ color: feature.color, background: `${feature.color}15` }}>
                                {feature.icon}
                            </div>
                            <h3 className="feature-title">{feature.title}</h3>
                            <p className="feature-desc">{feature.description}</p>
                            <div className="feature-highlights">
                                {feature.highlights.map((h, j) => (
                                    <span key={j} className="feature-highlight">
                                        {h}
                                    </span>
                                ))}
                            </div>
                            {/* Hover glow */}
                            <div className="feature-glow" style={{ background: feature.color }} aria-hidden="true" />
                        </motion.div>
                    ))}
                </motion.div>
            </div>
        </section>
    )
}
