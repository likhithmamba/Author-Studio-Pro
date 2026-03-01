import { useState, useEffect } from 'react'
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion'
import { HiOutlineCog6Tooth, HiOutlineUserCircle, HiOutlineArrowRightOnRectangle } from 'react-icons/hi2'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import AuthModal from './AuthModal'
import './Navbar.css'

const navLinks = [
    { label: 'Features', href: '#features' },
    { label: 'How It Works', href: '#how-it-works' },
    { label: 'AI Engine', href: '#ai-intelligence' },
    { label: 'Genres', href: '#genres' },
    { label: 'Pricing', href: '#pricing' },
    { label: 'FAQ', href: '#faq' },
]

export default function Navbar({ onSettingsClick }) {
    const [mobileOpen, setMobileOpen] = useState(false)
    const [authOpen, setAuthOpen] = useState(false)
    const { user, logout } = useAuth()
    const { scrollY } = useScroll()
    const navBg = useTransform(scrollY, [0, 100], ['rgba(5,8,16,0)', 'rgba(5,8,16,0.85)'])
    const navBlur = useTransform(scrollY, [0, 100], ['blur(0px)', 'blur(20px)'])
    const navBorder = useTransform(scrollY, [0, 100], ['rgba(255,255,255,0)', 'rgba(255,255,255,0.06)'])

    useEffect(() => {
        if (mobileOpen) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = ''
        }
        return () => { document.body.style.overflow = '' }
    }, [mobileOpen])

    const handleClick = (e, href) => {
        e.preventDefault()
        setMobileOpen(false)
        const el = document.querySelector(href)
        if (el) el.scrollIntoView({ behavior: 'smooth' })
    }

    return (
        <>
            <motion.nav
                className="navbar"
                style={{
                    backgroundColor: navBg,
                    backdropFilter: navBlur,
                    WebkitBackdropFilter: navBlur,
                    borderBottom: useTransform(navBorder, v => `1px solid ${v}`),
                }}
            >
                <div className="navbar-inner container">
                    <a href="#" className="nav-logo" onClick={e => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>
                        <span className="nav-logo-icon">✍️</span>
                        <span className="nav-logo-text">Author Studio</span>
                        <span className="nav-logo-badge">PRO</span>
                    </a>

                    <div className={`nav-links ${mobileOpen ? 'open' : ''}`}>
                        {navLinks.map(link => (
                            <a
                                key={link.href}
                                href={link.href}
                                className="nav-link"
                                onClick={e => handleClick(e, link.href)}
                            >
                                {link.label}
                            </a>
                        ))}
                        <button className="nav-settings" onClick={onSettingsClick} aria-label="Settings">
                            <HiOutlineCog6Tooth />
                        </button>
                        {user ? (
                            <div className="nav-user-group">
                                <span className="nav-user-email">{user.email}</span>
                                <button className="nav-logout-btn" onClick={logout} title="Sign out">
                                    <HiOutlineArrowRightOnRectangle />
                                </button>
                            </div>
                        ) : (
                            <button className="btn-secondary nav-auth-btn" onClick={() => setAuthOpen(true)}>
                                <HiOutlineUserCircle /> Sign In
                            </button>
                        )}
                        <Link to="/app" className="btn-primary nav-cta">
                            Get Started
                        </Link>
                    </div>

                    <button
                        className={`nav-hamburger ${mobileOpen ? 'open' : ''}`}
                        onClick={() => setMobileOpen(!mobileOpen)}
                        aria-label="Toggle menu"
                    >
                        <span /><span /><span />
                    </button>
                </div>

                {mobileOpen && <div className="nav-overlay" onClick={() => setMobileOpen(false)} />}
            </motion.nav>

            <AnimatePresence>
                {authOpen && <AuthModal onClose={() => setAuthOpen(false)} />}
            </AnimatePresence>
        </>
    )
}
