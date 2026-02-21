import { motion } from 'framer-motion'
import { useInView } from 'react-intersection-observer'
import { HiOutlineArrowUpTray, HiOutlineCpuChip, HiOutlineArrowDownTray } from 'react-icons/hi2'
import './HowItWorks.css'

const steps = [
    {
        icon: <HiOutlineArrowUpTray />,
        number: '01',
        title: 'Upload Your Manuscript',
        description: 'Drop your .docx file. The parser reads every paragraph — chapter headings, scene breaks, body text — and optionally uses one AI call to learn your document\'s unique patterns.',
        detail: 'Works with any .docx. No file size limit. AI pattern learning is optional and uses ~2,000 tokens total.',
        color: 'var(--accent-blue)',
    },
    {
        icon: <HiOutlineCpuChip />,
        number: '02',
        title: 'Analyse & Format',
        description: 'Choose your formatting template, run the analysis engine, and generate your query package. The AI reads strategic sections of your actual prose — opening, midpoint, and closing — and gives you real editorial feedback.',
        detail: 'Readability scores, style metrics, pacing profiles, editorial flags, and AI commentary — all in seconds.',
        color: 'var(--gold-primary)',
    },
    {
        icon: <HiOutlineArrowDownTray />,
        number: '03',
        title: 'Download & Submit',
        description: 'Get your perfectly formatted .docx, comprehensive analysis report, and a full submission package — query letter, synopsis, about the author page, and copyright page — ready to send to agents.',
        detail: 'Professional documents that follow AAR guidelines. Built to survive the agent\'s 30-second test.',
        color: 'var(--accent-emerald)',
    },
]

export default function HowItWorks() {
    const [ref, inView] = useInView({ triggerOnce: true, threshold: 0.15 })

    return (
        <section id="how-it-works" className="how-it-works section">
            <div className="container">
                <motion.div
                    className="hiw-header"
                    initial={{ opacity: 0, y: 20 }}
                    animate={inView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.6 }}
                    ref={ref}
                >
                    <span className="section-label">✦ Workflow</span>
                    <h2 className="section-title">Three Steps to Submission-Ready</h2>
                    <p className="section-subtitle">
                        From raw manuscript to formatted, analysed, query-packaged — in under two minutes.
                    </p>
                </motion.div>

                <div className="hiw-steps">
                    {steps.map((step, i) => (
                        <motion.div
                            key={i}
                            className="hiw-step"
                            initial={{ opacity: 0, y: 40 }}
                            animate={inView ? { opacity: 1, y: 0 } : {}}
                            transition={{ duration: 0.6, delay: 0.2 + i * 0.15 }}
                        >
                            <div className="hiw-step-number" style={{ color: step.color }}>
                                {step.number}
                            </div>
                            <div className="hiw-step-icon" style={{ color: step.color, background: `${step.color}12` }}>
                                {step.icon}
                            </div>
                            <h3 className="hiw-step-title">{step.title}</h3>
                            <p className="hiw-step-desc">{step.description}</p>
                            <p className="hiw-step-detail">{step.detail}</p>

                            {i < steps.length - 1 && (
                                <div className="hiw-connector" aria-hidden="true">
                                    <svg width="40" height="2" viewBox="0 0 40 2">
                                        <line x1="0" y1="1" x2="40" y2="1" stroke="currentColor" strokeWidth="2" strokeDasharray="4,4" />
                                    </svg>
                                </div>
                            )}
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    )
}
