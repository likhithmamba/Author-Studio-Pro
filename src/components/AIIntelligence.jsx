import { motion } from 'framer-motion'
import { useInView } from 'react-intersection-observer'
import './AIIntelligence.css'

const analysisCards = [
    {
        section: 'Opening',
        icon: '📖',
        chapter: 'Chapter 1 — The Arrival',
        metrics: [
            { label: 'Hook Effectiveness', value: 'Strong — immediate conflict' },
            { label: 'Voice', value: 'Distinct, confident first-person' },
            { label: 'Pacing', value: 'Excellent — action within 200 words' },
        ],
        quote: '"The door opened before I could knock, and the woman behind it was already speaking..."',
        verdict: 'The opening hooks immediately. The voice is distinctive and the pacing drives forward.',
    },
    {
        section: 'Midpoint',
        icon: '⚡',
        chapter: 'Chapter 14 — The Turning',
        metrics: [
            { label: 'Tension Level', value: 'Peak — escalating stakes' },
            { label: 'Character Presence', value: 'Protagonist driving action' },
            { label: 'Prose Quality', value: 'Clean, rhythmic sentences' },
        ],
        quote: '"She hadn\'t expected the silence that followed. It was heavier than any accusation..."',
        verdict: 'Strong midpoint reversal. The emotional stakes land because of careful setup.',
    },
    {
        section: 'Closing',
        icon: '🏁',
        chapter: 'Chapter 28 — After the Storm',
        metrics: [
            { label: 'Stakes Delivery', value: 'Payoff matches promise' },
            { label: 'Emotional Resolution', value: 'Earned, not forced' },
            { label: 'Thematic Closure', value: 'Central theme resolved' },
        ],
        quote: '"The garden had grown back — different now, but recognisably hers..."',
        verdict: 'Satisfying resolution. Thematic threads are closed without over-explaining.',
    },
]

export default function AIIntelligence() {
    const [ref, inView] = useInView({ triggerOnce: true, threshold: 0.1 })

    return (
        <section id="ai-intelligence" className="ai-section section">
            <div className="container">
                <motion.div
                    className="ai-header"
                    initial={{ opacity: 0, y: 20 }}
                    animate={inView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.6 }}
                    ref={ref}
                >
                    <span className="section-label">✦ AI Engine</span>
                    <h2 className="section-title">Your Manuscript, Read by AI</h2>
                    <p className="section-subtitle">
                        Not statistics. Not generic advice. The AI reads your actual prose — the opening that hooks,
                        the midpoint that turns, the closing that resolves — and gives you the kind of editorial
                        feedback you'd get from a £2,000 manuscript assessment.
                    </p>
                </motion.div>

                <div className="ai-demo">
                    <motion.div
                        className="ai-demo-header"
                        initial={{ opacity: 0, y: 20 }}
                        animate={inView ? { opacity: 1, y: 0 } : {}}
                        transition={{ duration: 0.6, delay: 0.2 }}
                    >
                        <div className="ai-demo-dots">
                            <span className="dot dot-red" />
                            <span className="dot dot-yellow" />
                            <span className="dot dot-green" />
                        </div>
                        <span className="ai-demo-title">AI Editorial Assessment — The Lost Hours.docx</span>
                    </motion.div>

                    <div className="ai-demo-body">
                        <motion.div
                            className="ai-verdict-box"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={inView ? { opacity: 1, scale: 1 } : {}}
                            transition={{ duration: 0.5, delay: 0.3 }}
                        >
                            <div className="ai-verdict-label">Overall Verdict</div>
                            <p className="ai-verdict-text">
                                This is a confident debut with a distinctive voice and strong command of pacing. The opening
                                hooks immediately, the midpoint delivers genuine surprise, and the resolution earns its emotional
                                payoff. The prose quality is consistent throughout — this manuscript is submission-ready with
                                minor revisions to the secondary character arcs in chapters 12–16.
                            </p>
                        </motion.div>

                        <div className="ai-strengths-row">
                            <div className="ai-strengths">
                                <h4>✅ Top 3 Strengths</h4>
                                {['Distinctive and consistent voice throughout', 'Pacing maintains tension across 82,000 words', 'Thematic cohesion — every subplot supports the central question'].map((s, i) => (
                                    <div key={i} className="ai-strength-item">{s}</div>
                                ))}
                            </div>
                            <div className="ai-priorities">
                                <h4>🎯 Top 3 Priorities</h4>
                                {['Secondary character arc needs strengthening in Act 2', 'Three 3-word phrases repeat 12+ times — edit for variety', 'Chapter 15 pacing dips — consider tightening by 800 words'].map((p, i) => (
                                    <div key={i} className="ai-priority-item">{p}</div>
                                ))}
                            </div>
                        </div>

                        <div className="ai-sections-grid">
                            {analysisCards.map((card, i) => (
                                <motion.div
                                    key={i}
                                    className="ai-analysis-card"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={inView ? { opacity: 1, y: 0 } : {}}
                                    transition={{ duration: 0.5, delay: 0.4 + i * 0.12 }}
                                >
                                    <div className="ai-card-header">
                                        <span className="ai-card-icon">{card.icon}</span>
                                        <div>
                                            <div className="ai-card-section">{card.section}</div>
                                            <div className="ai-card-chapter">{card.chapter}</div>
                                        </div>
                                    </div>
                                    <div className="ai-card-metrics">
                                        {card.metrics.map((m, j) => (
                                            <div key={j} className="ai-metric">
                                                <span className="ai-metric-label">{m.label}</span>
                                                <span className="ai-metric-value">{m.value}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <blockquote className="ai-card-quote">{card.quote}</blockquote>
                                    <p className="ai-card-verdict">{card.verdict}</p>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}
