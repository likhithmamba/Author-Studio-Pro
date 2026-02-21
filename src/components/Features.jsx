import { motion } from 'framer-motion'
import { useInView } from 'react-intersection-observer'
import {
    HiOutlineDocumentText,
    HiOutlineBeaker,
    HiOutlineChartBar,
    HiOutlineEnvelope,
    HiOutlineAcademicCap,
} from 'react-icons/hi2'
import './Features.css'

const features = [
    {
        icon: <HiOutlineDocumentText />,
        title: 'Manuscript Formatter',
        description: 'Apply any of 5 internationally recognised publishing standards — US Standard, UK Submission, Modern Agent, Literary Review, or Custom — with one click. Produces a perfectly formatted .docx with running headers, title page, and correct indent rules.',
        color: 'var(--accent-blue)',
        tag: 'FORMAT',
        highlights: ['5 Templates', 'Running Headers', 'Auto Title Page', 'Custom Overrides'],
    },
    {
        icon: <HiOutlineBeaker />,
        title: 'AI Manuscript Analysis',
        description: 'Two-layer intelligence: structural statistics (Flesch scores, pacing, style flags) combined with AI that reads your opening, midpoint, and closing — then writes editorial commentary with direct quotes from your prose.',
        color: 'var(--accent-purple)',
        tag: 'ANALYSE',
        highlights: ['Readability Scores', 'Pacing Profiles', 'AI Editorial Notes', 'Voice Assessment'],
    },
    {
        icon: <HiOutlineChartBar />,
        title: 'Market Intelligence',
        description: 'Genre-specific benchmarks from Publishers Marketplace, QueryTracker, and AAR data. Word count viability assessment, rejection triggers, agent expectations, comp title guidance, and publisher recommendations.',
        color: 'var(--accent-emerald)',
        tag: 'MARKET',
        highlights: ['12+ Genres', 'Word Count Targets', 'Rejection Flags', 'Publisher Lists'],
    },
    {
        icon: <HiOutlineEnvelope />,
        title: 'Query Package Builder',
        description: 'AI reads your manuscript and extracts protagonist, conflict, stakes, and theme — then generates a hook sentence, plot paragraph, full synopsis, and complete query letter. What consultants charge $200–$800 for.',
        color: 'var(--accent-rose)',
        tag: 'QUERY',
        highlights: ['AI-Generated Hook', 'Synopsis Writer', 'Query Letter', 'Comp Suggestions'],
    },
    {
        icon: <HiOutlineAcademicCap />,
        title: 'Submission Guide',
        description: 'A comprehensive knowledge base covering the query process, formatting rules, comp title strategy, and understanding rejections — consolidated from AAR guidelines, Publishers Marketplace data, and industry standard practice.',
        color: 'var(--accent-amber)',
        tag: 'GUIDE',
        highlights: ['Query Process', 'Agent Tips', 'Comp Strategy', 'Rejection Decoder'],
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
                    <h2 className="section-title">Five Engines. One Studio.</h2>
                    <p className="section-subtitle">
                        Every tool a professional author needs — from first draft formatting to agent query submission — engineered into a single, cohesive workflow.
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
