import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
    HiOutlineArrowLeft, HiOutlineCog6Tooth, HiOutlineArrowRightOnRectangle,
    HiOutlineLockClosed, HiOutlineSparkles, HiOutlineStar, HiOutlineCheckBadge,
} from 'react-icons/hi2'
import { useAuth } from '../contexts/AuthContext'
import Tools from './Tools'
import AuthModal from './AuthModal'
import './AppWorkspace.css'

// ─── Free-tier limited tabs ─────────────────────────────────────────────────
const FREE_TABS = ['format']  // Only formatting is free
const PAID_TABS = ['format', 'analyse', 'query', 'market']

export default function AppWorkspace({ settings, onSettingsClick }) {
    const { user, loading, isSubscribed, subscription, logout } = useAuth()
    const [showAuth, setShowAuth] = useState(false)
    const navigate = useNavigate()

    // ─── Loading state ──────────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="workspace">
                <div className="workspace-loading">
                    <div className="workspace-loading-spinner" />
                    <p>Loading your workspace…</p>
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
        : 'free'
    const allowedTabs = isSubscribed ? PAID_TABS : FREE_TABS

    return (
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

            {/* Free tier upgrade banner */}
            {!isSubscribed && (
                <motion.div
                    className="workspace-upgrade-banner"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <span>
                        <HiOutlineStar /> You're on the <strong>Free plan</strong> — formatting only.
                    </span>
                    <Link to="/#pricing" className="workspace-upgrade-link">
                        Upgrade for AI features →
                    </Link>
                </motion.div>
            )}

            {/* Main workspace content */}
            <motion.main
                className="workspace-main"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                <Tools settings={settings} allowedTabs={allowedTabs} />
            </motion.main>

            {/* Workspace footer */}
            <footer className="workspace-footer">
                <p>© {new Date().getFullYear()} Author Studio Pro · Your manuscript never leaves your browser</p>
            </footer>
        </div>
    )
}
