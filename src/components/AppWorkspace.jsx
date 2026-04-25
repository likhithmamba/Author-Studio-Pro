import { useState, useEffect, lazy, Suspense } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
    HiOutlineArrowLeft, HiOutlineCog6Tooth, HiOutlineArrowRightOnRectangle,
    HiOutlineLockClosed, HiOutlineSparkles, HiOutlineStar, HiOutlineCheckBadge,
    HiOutlineDocumentText, HiOutlineWrenchScrewdriver, HiOutlineBolt
} from 'react-icons/hi2'
import { useAuth } from '../contexts/AuthContext'
import MidnightChronicleEditor from './Editor/MidnightChronicleEditor'
import Tools from './Tools'
import AuthModal from './AuthModal'
import OnboardingOverlay from './OnboardingOverlay'
import { hasApiKey, loadApiKey, getDeviceFingerprint } from '../utils/keyStorage'
import { WritingSystemProvider } from '../contexts/WritingSystemContext'
import StoreSyncManager from './StoreSyncManager'
import { useStoryStore } from '../store/storyStore'
import './AppWorkspace.css'

const FREE_TABS = ['format', 'market', 'submissions']
const PAID_TABS = ['format', 'analyse', 'query', 'market', 'submissions']

export default function AppWorkspace({ settings, onSettingsClick, initialTab }) {
    const { user, loading, isSubscribed, subscription, token, logout } = useAuth()
    const [showAuth, setShowAuth] = useState(false)
    const [showOnboarding, setShowOnboarding] = useState(false)
    const [workspaceMode, setWorkspaceMode] = useState('editor') // 'editor' | 'tools'
    const navigate = useNavigate()

    // Derive API key props
    const hasKey = hasApiKey()
    const apiKey = hasKey ? loadApiKey(getDeviceFingerprint()) : ''
    const aiModel = settings?.aiModel || 'mistralai/mistral-7b-instruct:free'

    const { isRehydrating, initializeProject } = useStoryStore()

    useEffect(() => {
        if (user && !localStorage.getItem('asp_onboarded')) {
            setShowOnboarding(true)
        }
    }, [user])

    // ─── Project Rehydration ─────────────────────────────────────────────────
    useEffect(() => {
        if (user && token && !isRehydrating) {
            const projectId = '00000000-0000-0000-0000-000000000001'
            initializeProject(projectId, token)
        }
    }, [user, token, initializeProject])

    // ─── Loading state ──────────────────────────────────────────────────────
    if (loading || isRehydrating) {
        return (
            <div className="workspace">
                <div className="workspace-loading">
                    <div className="workspace-loading-spinner" />
                    <p>{isRehydrating ? 'Restoring your story engine…' : 'Loading your workspace…'}</p>
                </div>
            </div>
        )
    }

    // ─── Not logged in → show auth gate ─────────────────────────────────────
    if (!user) {
        return (
            <div className="workspace">
                <header className="workspace-navbar">
                    <div className="workspace-navbar-inner">
                        <Link to="/" className="workspace-back">
                            <HiOutlineArrowLeft />
                            <span>Back to Home</span>
                        </Link>
                        <div className="workspace-brand">
                            <span className="workspace-logo">✦</span>
                            <span className="workspace-title">Author Studio Pro</span>
                        </div>
                        <div style={{ width: 36 }} />
                    </div>
                </header>

                <motion.div
                    className="workspace-auth-gate"
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <div className="auth-gate-card glass-card">
                        <HiOutlineLockClosed className="auth-gate-icon" />
                        <h2>Sign in to access Author Studio Pro</h2>
                        <p>Create a free account to start formatting your manuscripts, or upgrade for AI-powered analysis and query generation.</p>

                        <div className="auth-gate-tiers">
                            <div className="auth-gate-tier">
                                <h3>✦ Free</h3>
                                <ul>
                                    <li>Manuscript formatting</li>
                                    <li>5 templates</li>
                                    <li>Genre benchmarks</li>
                                </ul>
                            </div>
                            <div className="auth-gate-tier auth-gate-tier-pro">
                                <h3><HiOutlineStar /> Studio Pro</h3>
                                <ul>
                                    <li>AI editorial assessment</li>
                                    <li>AI query letter generator</li>
                                    <li>AI synopsis writer</li>
                                    <li>Unlimited manuscripts</li>
                                </ul>
                            </div>
                        </div>

                        <button className="btn-primary auth-gate-btn" onClick={() => setShowAuth(true)}>
                            <HiOutlineSparkles /> Sign In or Create Account
                        </button>
                        <button className="btn-secondary auth-gate-btn-back" onClick={() => navigate('/')}>
                            ← Back to Home
                        </button>
                    </div>
                </motion.div>

                <AnimatePresence>
                    {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
                </AnimatePresence>
            </div>
        )
    }

    // ─── Logged in — determine access level ─────────────────────────────────
    const planLabel = isSubscribed
        ? (subscription?.plan || 'studio').replace('_monthly', '').replace('_annual', '')
        : 'pro (Local Trial Mode)'
    const allowedTabs = PAID_TABS // Local trial override unlocks all tabs

    return (
        <WritingSystemProvider>
            <StoreSyncManager />
            <div className="workspace">
                {/* Workspace navbar */}
                <header className="workspace-navbar">
                    <div className="workspace-navbar-inner">
                        <Link to="/" className="workspace-back">
                            <HiOutlineArrowLeft />
                            <span>Back to Home</span>
                        </Link>
                        <div className="workspace-brand">
                            <span className="workspace-logo">✦</span>
                            <span className="workspace-title">Author Studio Pro</span>
                            {isSubscribed && (
                                <span className="workspace-plan-badge">
                                    <HiOutlineCheckBadge /> {planLabel.charAt(0).toUpperCase() + planLabel.slice(1)}
                                </span>
                            )}
                        </div>

                        {/* ─── Workspace Mode Toggle ──────────────────────── */}
                        <div className="workspace-mode-toggle">
                            <button
                                className={`workspace-mode-btn ${workspaceMode === 'editor' ? 'active' : ''}`}
                                onClick={() => setWorkspaceMode('editor')}
                            >
                                <HiOutlineDocumentText />
                                <span>Studio</span>
                            </button>
                            <button
                                className={`workspace-mode-btn ${workspaceMode === 'tools' ? 'active' : ''}`}
                                onClick={() => setWorkspaceMode('tools')}
                            >
                                <HiOutlineWrenchScrewdriver />
                                <span>Publishing Tools</span>
                            </button>
                        </div>

                        <div className="workspace-nav-actions">
                            <span className="workspace-user-email">{user.email}</span>
                            <button className="workspace-settings-btn" onClick={onSettingsClick} aria-label="Settings">
                                <HiOutlineCog6Tooth />
                            </button>
                            <button className="workspace-logout-btn" onClick={logout} title="Sign out">
                                <HiOutlineArrowRightOnRectangle />
                            </button>
                        </div>
                    </div>
                </header>

                <AnimatePresence>
                    {showOnboarding && (
                        <OnboardingOverlay 
                            onClose={() => setShowOnboarding(false)} 
                            onOpenSettings={onSettingsClick} 
                        />
                    )}
                </AnimatePresence>

                {/* Main workspace content */}
                <AnimatePresence mode="wait">
                    {workspaceMode === 'editor' ? (
                        <motion.main
                            key="editor"
                            className="workspace-main workspace-main-editor"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.25 }}
                            style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
                        >
                            <Suspense fallback={
                                <div className="workspace-loading">
                                    <div className="workspace-loading-spinner" />
                                    <p>Loading your writing studio...</p>
                                </div>
                            }>
                                <MidnightChronicleEditor 
                                    apiKey={apiKey} 
                                    aiModel={aiModel} 
                                    hasKey={hasKey} 
                                    settings={settings} 
                                    projectId="00000000-0000-0000-0000-000000000001"
                                />
                            </Suspense>
                        </motion.main>
                    ) : (
                        <motion.main
                            key="tools"
                            className="workspace-main workspace-main-tools"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.25 }}
                            style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto' }}
                        >
                            <Tools
                                settings={settings}
                                allowedTabs={allowedTabs}
                            />
                        </motion.main>
                    )}
                </AnimatePresence>

                {/* Workspace footer */}
                <footer className="workspace-footer">
                    <p>© {new Date().getFullYear()} Author Studio Pro · Your manuscript never leaves your browser</p>
                </footer>
            </div>
        </WritingSystemProvider>
    )
}
