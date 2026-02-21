import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useInView } from 'react-intersection-observer'
import { HiOutlineChevronDown } from 'react-icons/hi2'
import './FAQ.css'

const faqs = [
    {
        q: 'Is my manuscript data secure?',
        a: 'Your manuscript is processed locally in your browser and never stored on our servers. When you enable AI features, only strategic excerpts (~1,500 words each from opening, midpoint, and closing) are sent to the AI model via encrypted connection. No full manuscript is ever transmitted. AI providers have zero retention policies — your text is processed and immediately discarded.',
    },
    {
        q: 'Which AI models do you use, and what do they cost?',
        a: 'We use open-source models via OpenRouter — including Mistral 7B Instruct (recommended), Llama 3.2 3B, Gemma 3 1B, and Mistral Nemo. All of these have free-tier access. A full manuscript analysis uses approximately 3 API calls totalling ~30,000 tokens — well within free-tier limits. You bring your own API key.',
    },
    {
        q: 'How accurate is the AI editorial assessment?',
        a: 'The AI reads three strategic sections of your manuscript (opening ~1,500 words, midpoint ~1,500 words, closing ~1,500 words) and provides editorial commentary on voice, pacing, prose quality, tension, and character presence. It identifies specific strengths and concerns with direct quotes from your text. This supplements — but does not replace — a professional human editor.',
    },
    {
        q: 'What file formats are supported?',
        a: 'Currently, Author Studio Pro works with .docx (Microsoft Word) files. This is the standard manuscript submission format used by virtually all literary agents and publishers worldwide. Support for .odt and plain text is on the roadmap.',
    },
    {
        q: 'Does the formatter change my original file?',
        a: 'Never. Your original manuscript file is never modified. The formatter reads your document, processes every paragraph through the classification engine, and generates a brand-new .docx file with the formatting applied. Your original is always preserved.',
    },
    {
        q: 'How does the AI query package differ from the manual mode?',
        a: 'In manual mode, you fill in story elements (protagonist, conflict, stakes) and the app formats them into professional documents. In AI mode, the system reads your actual manuscript, extracts the protagonist, conflict, stakes, and theme from your prose, and writes the hook sentence, plot paragraph, synopsis, and query letter from the story itself — the same process a $500 query consultant follows.',
    },
    {
        q: 'Can I customise the formatting templates?',
        a: 'Yes. Every template parameter can be overridden: font family, font size, line spacing, margins (top/bottom/left/right), page size (Letter or A4), alignment (justified or ragged right), chapter heading style (bold, caps, position), and scene break symbol. The template provides the baseline; you control every detail.',
    },
    {
        q: 'Is there a word limit?',
        a: 'No. Author Studio Pro has been tested with manuscripts up to 200,000 words. The parser processes any length — the AI pattern learning uses only ~80 paragraphs regardless of manuscript size, keeping API costs fixed.',
    },
]

function FAQItem({ faq, isOpen, onClick }) {
    return (
        <div className={`faq-item ${isOpen ? 'faq-open' : ''}`}>
            <button className="faq-question" onClick={onClick} aria-expanded={isOpen}>
                <span>{faq.q}</span>
                <motion.span
                    className="faq-chevron"
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.3 }}
                >
                    <HiOutlineChevronDown />
                </motion.span>
            </button>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        className="faq-answer"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                    >
                        <p>{faq.a}</p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

export default function FAQ() {
    const [openIndex, setOpenIndex] = useState(0)
    const [ref, inView] = useInView({ triggerOnce: true, threshold: 0.1 })

    return (
        <section id="faq" className="faq-section section">
            <div className="container">
                <motion.div
                    className="faq-header"
                    initial={{ opacity: 0, y: 20 }}
                    animate={inView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.6 }}
                    ref={ref}
                >
                    <span className="section-label">✦ FAQ</span>
                    <h2 className="section-title">Frequently Asked Questions</h2>
                </motion.div>

                <motion.div
                    className="faq-list"
                    initial={{ opacity: 0 }}
                    animate={inView ? { opacity: 1 } : {}}
                    transition={{ duration: 0.5, delay: 0.2 }}
                >
                    {faqs.map((faq, i) => (
                        <FAQItem
                            key={i}
                            faq={faq}
                            isOpen={openIndex === i}
                            onClick={() => setOpenIndex(openIndex === i ? -1 : i)}
                        />
                    ))}
                </motion.div>
            </div>
        </section>
    )
}
