import { motion } from 'framer-motion'
import { useInView } from 'react-intersection-observer'
import './Templates.css'

const templates = [
    {
        id: 'us_standard',
        name: 'US Standard',
        badge: 'Most Popular',
        authority: "Writer's Digest / AAR",
        specs: ['Times New Roman 12pt', 'Double spacing', '1" margins', 'US Letter'],
        bestFor: 'North American agent submissions',
        color: 'var(--accent-blue)',
    },
    {
        id: 'uk_submission',
        name: 'UK Submission',
        badge: '',
        authority: 'Society of Authors (UK)',
        specs: ['Times New Roman 12pt', 'Double spacing', '1.25" margins', 'A4'],
        bestFor: 'UK literary agents and publishers',
        color: 'var(--accent-purple)',
    },
    {
        id: 'modern_agent',
        name: 'Modern Agent',
        badge: 'Clean',
        authority: 'QueryTracker Best Practice',
        specs: ['Garamond 12pt', '1.5 spacing', '1" margins', 'US Letter'],
        bestFor: 'Contemporary / new-style agency submissions',
        color: 'var(--accent-emerald)',
    },
    {
        id: 'literary_review',
        name: 'Literary Review',
        badge: '',
        authority: 'AWP / Pushcart conventions',
        specs: ['Georgia 11pt', 'Double spacing', '1" margins', 'US Letter'],
        bestFor: 'Literary journals and MFA programs',
        color: 'var(--accent-amber)',
    },
    {
        id: 'custom',
        name: 'Custom Format',
        badge: 'Flexible',
        authority: 'Your specifications',
        specs: ['Any font', 'Any spacing', 'Custom margins', 'Letter or A4'],
        bestFor: 'Self-publishing, contests, specific publisher requirements',
        color: 'var(--gold-primary)',
    },
]

export default function Templates() {
    const [ref, inView] = useInView({ triggerOnce: true, threshold: 0.1 })

    return (
        <section id="templates" className="templates-section section">
            <div className="container">
                <motion.div
                    className="templates-header"
                    initial={{ opacity: 0, y: 20 }}
                    animate={inView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.6 }}
                    ref={ref}
                >
                    <span className="section-label">✦ Templates</span>
                    <h2 className="section-title">Five International Standards</h2>
                    <p className="section-subtitle">
                        Every parameter the formatter needs is encoded in the template. Nothing is left to guesswork.
                        Select a standard, or override any setting with the customisation panel.
                    </p>
                </motion.div>

                <div className="templates-grid">
                    {templates.map((tpl, i) => (
                        <motion.div
                            key={tpl.id}
                            className="template-card glass-card"
                            initial={{ opacity: 0, y: 30 }}
                            animate={inView ? { opacity: 1, y: 0 } : {}}
                            transition={{ duration: 0.5, delay: i * 0.1 }}
                            whileHover={{ y: -6, transition: { duration: 0.2 } }}
                        >
                            {tpl.badge && (
                                <span className="template-badge" style={{ background: `${tpl.color}20`, color: tpl.color }}>
                                    {tpl.badge}
                                </span>
                            )}
                            <div className="template-icon" style={{ color: tpl.color }}>
                                📄
                            </div>
                            <h3 className="template-name">{tpl.name}</h3>
                            <p className="template-authority">{tpl.authority}</p>
                            <div className="template-specs">
                                {tpl.specs.map((spec, j) => (
                                    <div key={j} className="template-spec">
                                        <span className="template-spec-dot" style={{ background: tpl.color }} />
                                        {spec}
                                    </div>
                                ))}
                            </div>
                            <p className="template-best-for">
                                <strong>Best for:</strong> {tpl.bestFor}
                            </p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    )
}
