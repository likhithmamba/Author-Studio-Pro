import { useRef, useEffect } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import { HiOutlineArrowRight, HiOutlinePlay } from 'react-icons/hi2'
import './Hero.css'

const TYPING_WORDS = [
    'your manuscript.',
    'your query letter.',
    'your synopsis.',
    'your publishing career.',
]

export default function Hero({ settings }) {
    const ref = useRef(null)
    const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })
    const y = useTransform(scrollYProgress, [0, 1], [0, 200])
    const opacity = useTransform(scrollYProgress, [0, 0.6], [1, 0])

    return (
        <section id="hero" className="hero section" ref={ref}>
            <motion.div className="hero-content container" style={{ y, opacity }}>
                <motion.div
                    className="hero-badge"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                >
                    <span className="hero-badge-dot" />
                    <span>Trusted by 2,500+ authors worldwide</span>
                </motion.div>

                <motion.h1
                    className="hero-title"
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.3 }}
                >
                    The Professional Toolkit
                    <br />
                    <span className="hero-title-accent">for Serious Authors</span>
                </motion.h1>

                <motion.p
                    className="hero-subtitle"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7, delay: 0.5 }}
                >
                    Format manuscripts to international standards. Analyse your prose with AI editorial intelligence.
                    Generate query packages that get agent requests. Everything authors pay $500–$2,000 for — in one studio.
                </motion.p>

                <motion.div
                    className="hero-actions"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.7 }}
                >
                    <a href="#pricing" className="btn-primary hero-cta">
                        Start Writing <HiOutlineArrowRight />
                    </a>
                    <a href="#how-it-works" className="btn-secondary hero-cta-secondary">
                        <HiOutlinePlay /> See How It Works
                    </a>
                </motion.div>

                <motion.div
                    className="hero-stats"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.8, delay: 1.0 }}
                >
                    {[
                        { value: '5', label: 'International Templates' },
                        { value: '12+', label: 'Genre Databases' },
                        { value: '3', label: 'AI Calls Per Analysis' },
                        { value: '$0', label: 'Free AI Models' },
                    ].map((stat, i) => (
                        <div key={i} className="hero-stat">
                            <span className="hero-stat-value">{stat.value}</span>
                            <span className="hero-stat-label">{stat.label}</span>
                        </div>
                    ))}
                </motion.div>
            </motion.div>

            {/* Decorative elements */}
            <div className="hero-glow" aria-hidden="true" />
            <div className="hero-grid" aria-hidden="true" />
            <motion.div
                className="hero-floating-card hero-fc-1"
                animate={{
                    y: [0, -15, 0],
                    rotate: [-1, 1, -1],
                }}
                transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
                aria-hidden="true"
            >
                <div className="hfc-icon">📄</div>
                <div className="hfc-text">
                    <span className="hfc-title">Manuscript Formatted</span>
                    <span className="hfc-sub">US Standard · Times New Roman · 82,400 words</span>
                </div>
            </motion.div>

            <motion.div
                className="hero-floating-card hero-fc-2"
                animate={{
                    y: [0, 12, 0],
                    rotate: [1, -1, 1],
                }}
                transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
                aria-hidden="true"
            >
                <div className="hfc-icon">🤖</div>
                <div className="hfc-text">
                    <span className="hfc-title">AI Analysis Complete</span>
                    <span className="hfc-sub">Flesch Score: 72 · Voice: Consistent · 3 priorities</span>
                </div>
            </motion.div>

            <motion.div
                className="hero-floating-card hero-fc-3"
                animate={{
                    y: [0, -10, 0],
                    rotate: [0, 2, 0],
                }}
                transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
                aria-hidden="true"
            >
                <div className="hfc-icon">📬</div>
                <div className="hfc-text">
                    <span className="hfc-title">Query Package Ready</span>
                    <span className="hfc-sub">Letter · Synopsis · Back Matter · ZIP</span>
                </div>
            </motion.div>
        </section>
    )
}
