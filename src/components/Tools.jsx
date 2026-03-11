import { useState, lazy, Suspense } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useInView } from 'react-intersection-observer'
import { HiOutlineCheckCircle, HiOutlineLockClosed, HiOutlineCpuChip } from 'react-icons/hi2'
import './Tools.css'

import { TABS } from './Tools/constants.jsx'

const FormatTab = lazy(() => import('./Tools/FormatTab.jsx'))
const AnalyseTab = lazy(() => import('./Tools/AnalyseTab.jsx'))
const QueryTab = lazy(() => import('./Tools/QueryTab.jsx'))
const MarketTab = lazy(() => import('./Tools/MarketTab.jsx'))

// ⚡ Bolt: Added fallback component for Suspense to provide smooth loading transitions for code-split tabs
const TabLoadingFallback = () => (
    <div className="tool-tab-panel" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
        <div className="run-spinner" style={{ width: '24px', height: '24px', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
    </div>
)

export default function Tools({ settings, allowedTabs }) {
    const allTabs = allowedTabs || ['format', 'analyse', 'query', 'market']
    const [tab, setTab] = useState('format')
    const [ref, inView] = useInView({ triggerOnce: true, threshold: 0.08 })

    const apiKey = settings?.openRouterKey || ''
    const aiModel = settings?.aiModel || 'mistralai/mistral-7b-instruct:free'
    const hasKey = Boolean(apiKey)

    return (
        <section id="tools" className="tools-section" ref={ref}>
            <div className="tools-inner">
                <motion.div
                    className="tools-header"
                    initial={{ opacity: 0, y: 32 }}
                    animate={inView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.7 }}
                >
                    <span className="tools-eyebrow">Interactive Tools</span>
                    <h2 className="tools-title">Try the Studio</h2>
                    <p className="tools-subtitle">
                        Upload your manuscript and process it right here.
                        Formatting and market data work without any API key.{' '}
                        <span className="tools-ai-note">
                            <HiOutlineCpuChip /> Add your OpenRouter key in ⚙️ Settings to enable AI features.
                        </span>
                    </p>
                    {hasKey && (
                        <div className="tools-key-banner">
                            <HiOutlineCheckCircle />
                            AI features active · Model: <strong>{aiModel.split('/').pop()}</strong>
                        </div>
                    )}
                </motion.div>

                {/* Tab bar */}
                <motion.div
                    className="tools-tabs"
                    initial={{ opacity: 0, y: 20 }}
                    animate={inView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.6, delay: 0.15 }}
                >
                    {TABS.map(t => {
                        const isLocked = !allTabs.includes(t.id)
                        return (
                            <button
                                key={t.id}
                                className={`tools-tab ${tab === t.id ? 'active' : ''} ${isLocked ? 'locked' : ''}`}
                                onClick={() => !isLocked && setTab(t.id)}
                                disabled={isLocked}
                                title={isLocked ? 'Upgrade to Studio Pro to unlock' : t.label}
                            >
                                {isLocked ? <HiOutlineLockClosed /> : t.icon}
                                <span>{t.label}</span>
                                <span className="tools-tab-badge">{isLocked ? 'Pro' : t.badge}</span>
                            </button>
                        )
                    })}
                </motion.div>

                {/* Tab panels */}
                <motion.div
                    className="tools-panel"
                    initial={{ opacity: 0, y: 24 }}
                    animate={inView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.6, delay: 0.25 }}
                >
                    <AnimatePresence mode="wait">
                        {tab === 'format' && (
                            <Suspense key="format" fallback={<TabLoadingFallback />}>
                                <FormatTab apiKey={apiKey} aiModel={aiModel} hasKey={hasKey} />
                            </Suspense>
                        )}
                        {tab === 'analyse' && (
                            <Suspense key="analyse" fallback={<TabLoadingFallback />}>
                                <AnalyseTab apiKey={apiKey} aiModel={aiModel} hasKey={hasKey} />
                            </Suspense>
                        )}
                        {tab === 'query' && (
                            <Suspense key="query" fallback={<TabLoadingFallback />}>
                                <QueryTab apiKey={apiKey} aiModel={aiModel} hasKey={hasKey} />
                            </Suspense>
                        )}
                        {tab === 'market' && (
                            <Suspense key="market" fallback={<TabLoadingFallback />}>
                                <MarketTab />
                            </Suspense>
                        )}
                    </AnimatePresence>
                </motion.div>

                {/* Privacy strip */}
                <div className="tools-privacy-strip">
                    <HiOutlineLockClosed />
                    Your manuscript never leaves your browser except for the direct API call to {hasKey ? 'OpenRouter (AI) and' : ''} our formatter. No files stored. Temp files deleted immediately.
                </div>
            </div>
        </section>
    )
}
