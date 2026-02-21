import { motion } from 'framer-motion'
import { useInView } from 'react-intersection-observer'
import { HiOutlineCheck, HiOutlineStar } from 'react-icons/hi2'
import './Pricing.css'

const plans = [
    {
        name: 'Author',
        price: 'Free',
        period: '',
        description: 'Everything you need to format and analyse your first manuscript.',
        features: [
            '5 formatting templates',
            'Structural analysis (readability, pacing, style)',
            'Genre word count benchmarks',
            'Manual query package builder',
            'Submission knowledge base',
            '1 manuscript at a time',
        ],
        cta: 'Start Free',
        featured: false,
        color: 'var(--text-secondary)',
    },
    {
        name: 'Studio',
        price: '$19',
        period: '/month',
        description: 'AI-powered analysis and query generation — what consultants charge $500+ for.',
        features: [
            'Everything in Author, plus:',
            'AI editorial assessment (3 strategic sections)',
            'AI query letter generation',
            'AI synopsis writer',
            'AI comp title suggestions',
            'Story intelligence extraction',
            'Unlimited manuscripts',
            'Priority support',
        ],
        cta: 'Start Free Trial',
        featured: true,
        color: 'var(--gold-primary)',
    },
    {
        name: 'Publisher',
        price: '$49',
        period: '/month',
        description: 'For agents, editors, and publishers processing multiple manuscripts.',
        features: [
            'Everything in Studio, plus:',
            'Batch processing (up to 50 manuscripts)',
            'Team access (5 seats)',
            'Custom template builder',
            'API access',
            'White-label reports',
            'Dedicated account manager',
            'SLA guarantee',
        ],
        cta: 'Contact Sales',
        featured: false,
        color: 'var(--accent-purple)',
    },
]

export default function Pricing() {
    const [ref, inView] = useInView({ triggerOnce: true, threshold: 0.1 })

    return (
        <section id="pricing" className="pricing-section section">
            <div className="container">
                <motion.div
                    className="pricing-header"
                    initial={{ opacity: 0, y: 20 }}
                    animate={inView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.6 }}
                    ref={ref}
                >
                    <span className="section-label">✦ Pricing</span>
                    <h2 className="section-title">Invest in Your Writing Career</h2>
                    <p className="section-subtitle">
                        Professional manuscript services cost $500–$2,000 per project. Get the same intelligence for a fraction of the cost — or start completely free.
                    </p>
                </motion.div>

                <div className="pricing-grid">
                    {plans.map((plan, i) => (
                        <motion.div
                            key={plan.name}
                            className={`pricing-card glass-card ${plan.featured ? 'pricing-featured' : ''}`}
                            initial={{ opacity: 0, y: 30 }}
                            animate={inView ? { opacity: 1, y: 0 } : {}}
                            transition={{ duration: 0.5, delay: i * 0.12 }}
                            whileHover={{ y: -6 }}
                        >
                            {plan.featured && (
                                <div className="pricing-badge">
                                    <HiOutlineStar /> Most Popular
                                </div>
                            )}
                            <div className="pricing-plan-name" style={{ color: plan.color }}>{plan.name}</div>
                            <div className="pricing-price">
                                <span className="pricing-amount">{plan.price}</span>
                                {plan.period && <span className="pricing-period">{plan.period}</span>}
                            </div>
                            <p className="pricing-desc">{plan.description}</p>
                            <div className="pricing-features">
                                {plan.features.map((f, j) => (
                                    <div key={j} className="pricing-feature">
                                        <HiOutlineCheck className="pricing-check" style={{ color: plan.color }} />
                                        <span>{f}</span>
                                    </div>
                                ))}
                            </div>
                            <button
                                className={plan.featured ? 'btn-primary pricing-cta' : 'btn-secondary pricing-cta'}
                            >
                                {plan.cta}
                            </button>
                        </motion.div>
                    ))}
                </div>

                <motion.p
                    className="pricing-note"
                    initial={{ opacity: 0 }}
                    animate={inView ? { opacity: 1 } : {}}
                    transition={{ duration: 0.6, delay: 0.5 }}
                >
                    All plans include end-to-end encryption, GDPR compliance, and zero data retention by default. Your manuscript never leaves your browser unless you explicitly enable AI features.
                </motion.p>
            </div>
        </section>
    )
}
