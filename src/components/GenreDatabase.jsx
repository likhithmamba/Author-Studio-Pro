import { motion } from 'framer-motion'
import { useInView } from 'react-intersection-observer'
import './GenreDatabase.css'

const genres = [
    { id: 'literary', name: 'Literary Fiction', wcMin: '70,000', wcSweet: '85,000', wcMax: '100,000', color: 'var(--accent-purple)', emoji: '📚' },
    { id: 'thriller', name: 'Thriller / Suspense', wcMin: '70,000', wcSweet: '85,000', wcMax: '100,000', color: 'var(--accent-rose)', emoji: '🔪' },
    { id: 'romance', name: 'Romance', wcMin: '50,000', wcSweet: '70,000', wcMax: '90,000', color: 'var(--accent-rose)', emoji: '💕' },
    { id: 'fantasy', name: 'Fantasy', wcMin: '80,000', wcSweet: '100,000', wcMax: '120,000', color: 'var(--accent-blue)', emoji: '🐉' },
    { id: 'scifi', name: 'Science Fiction', wcMin: '80,000', wcSweet: '95,000', wcMax: '115,000', color: 'var(--accent-cyan)', emoji: '🚀' },
    { id: 'mystery', name: 'Mystery / Crime', wcMin: '60,000', wcSweet: '80,000', wcMax: '90,000', color: 'var(--accent-amber)', emoji: '🔍' },
    { id: 'ya', name: 'Young Adult', wcMin: '50,000', wcSweet: '70,000', wcMax: '80,000', color: 'var(--accent-emerald)', emoji: '🌟' },
    { id: 'historical', name: 'Historical Fiction', wcMin: '80,000', wcSweet: '95,000', wcMax: '110,000', color: 'var(--gold-primary)', emoji: '🏛️' },
    { id: 'horror', name: 'Horror', wcMin: '60,000', wcSweet: '80,000', wcMax: '100,000', color: 'var(--accent-rose)', emoji: '👻' },
    { id: 'womens', name: "Women's Fiction", wcMin: '70,000', wcSweet: '85,000', wcMax: '100,000', color: 'var(--accent-purple)', emoji: '🌸' },
    { id: 'uplift', name: 'Upmarket / Book Club', wcMin: '70,000', wcSweet: '85,000', wcMax: '100,000', color: 'var(--accent-amber)', emoji: '📖' },
    { id: 'middle_grade', name: 'Middle Grade', wcMin: '25,000', wcSweet: '40,000', wcMax: '55,000', color: 'var(--accent-emerald)', emoji: '🧒' },
]

export default function GenreDatabase() {
    const [ref, inView] = useInView({ triggerOnce: true, threshold: 0.1 })

    return (
        <section id="genres" className="genre-section section">
            <div className="container">
                <motion.div
                    className="genre-header"
                    initial={{ opacity: 0, y: 20 }}
                    animate={inView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.6 }}
                    ref={ref}
                >
                    <span className="section-label">✦ Market Data</span>
                    <h2 className="section-title">Genre Intelligence Database</h2>
                    <p className="section-subtitle">
                        Word count benchmarks, market intelligence, and agent expectations for every major commercial fiction genre — sourced from Publishers Marketplace, QueryTracker, and AAR data.
                    </p>
                </motion.div>

                <div className="genre-grid">
                    {genres.map((genre, i) => (
                        <motion.div
                            key={genre.id}
                            className="genre-card"
                            initial={{ opacity: 0, y: 20 }}
                            animate={inView ? { opacity: 1, y: 0 } : {}}
                            transition={{ duration: 0.5, delay: i * 0.05 }}
                            whileHover={{ y: -4, transition: { duration: 0.2 } }}
                        >
                            <div className="genre-card-top">
                                <span className="genre-emoji">{genre.emoji}</span>
                                <span className="genre-name">{genre.name}</span>
                            </div>
                            <div className="genre-wc-bar">
                                <div className="genre-wc-track">
                                    <div
                                        className="genre-wc-fill"
                                        style={{
                                            width: '60%',
                                            background: genre.color,
                                        }}
                                    />
                                </div>
                            </div>
                            <div className="genre-wc-labels">
                                <span>{genre.wcMin}</span>
                                <span className="genre-wc-sweet">{genre.wcSweet}</span>
                                <span>{genre.wcMax}</span>
                            </div>
                        </motion.div>
                    ))}
                </div>

                <motion.div
                    className="genre-cta"
                    initial={{ opacity: 0 }}
                    animate={inView ? { opacity: 1 } : {}}
                    transition={{ duration: 0.6, delay: 0.5 }}
                >
                    <p className="genre-cta-text">
                        Each genre includes rejection triggers, publisher recommendations, POV conventions, comp title guidance,
                        and debut-specific advice. Upload your manuscript to get a personalised word count assessment.
                    </p>
                </motion.div>
            </div>
        </section>
    )
}
