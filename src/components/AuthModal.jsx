import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { HiOutlineXMark, HiOutlineEnvelope, HiOutlineLockClosed, HiOutlineSparkles } from 'react-icons/hi2'
import { useAuth } from '../contexts/AuthContext'
import './AuthModal.css'

export default function AuthModal({ onClose }) {
    const [mode, setMode] = useState('login') // 'login' | 'register'
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const { login, register } = useAuth()

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')

        if (!email || !password) {
            setError('Email and password are required')
            return
        }

        if (mode === 'register') {
            if (password.length < 8) {
                setError('Password must be at least 8 characters')
                return
            }
            if (password !== confirmPassword) {
                setError('Passwords do not match')
                return
            }
        }

        setLoading(true)
        try {
            if (mode === 'login') {
                await login(email, password)
            } else {
                await register(email, password)
            }
            onClose()
        } catch (err) {
            setError(err.detail || err.message || 'Authentication failed')
        } finally {
            setLoading(false)
        }
    }

    return (
        <motion.div
            className="auth-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
        >
            <motion.div
                className="auth-modal glass-card"
                initial={{ opacity: 0, y: 40, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.95 }}
                transition={{ duration: 0.3 }}
                onClick={e => e.stopPropagation()}
            >
                <button className="auth-close" onClick={onClose} aria-label="Close">
                    <HiOutlineXMark />
                </button>

                <div className="auth-header">
                    <HiOutlineSparkles className="auth-icon" />
                    <h2>{mode === 'login' ? 'Welcome Back' : 'Create Account'}</h2>
                    <p>{mode === 'login'
                        ? 'Sign in to access your subscription and premium features.'
                        : 'Join Author Studio Pro to unlock AI-powered writing tools.'
                    }</p>
                </div>

                <form onSubmit={handleSubmit} className="auth-form">
                    <div className="auth-field">
                        <label>
                            <HiOutlineEnvelope /> Email
                        </label>
                        <input
                            type="email"
                            className="auth-input"
                            placeholder="author@example.com"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            autoComplete="email"
                            autoFocus
                        />
                    </div>

                    <div className="auth-field">
                        <label>
                            <HiOutlineLockClosed /> Password
                        </label>
                        <input
                            type="password"
                            className="auth-input"
                            placeholder="••••••••"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                        />
                    </div>

                    <AnimatePresence>
                        {mode === 'register' && (
                            <motion.div
                                className="auth-field"
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                            >
                                <label>
                                    <HiOutlineLockClosed /> Confirm Password
                                </label>
                                <input
                                    type="password"
                                    className="auth-input"
                                    placeholder="••••••••"
                                    value={confirmPassword}
                                    onChange={e => setConfirmPassword(e.target.value)}
                                    autoComplete="new-password"
                                />
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {error && (
                        <motion.div
                            className="auth-error"
                            initial={{ opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                        >
                            {error}
                        </motion.div>
                    )}

                    <button
                        type="submit"
                        className="auth-submit btn-primary"
                        disabled={loading}
                    >
                        {loading
                            ? <><span className="auth-spinner" /> Processing...</>
                            : mode === 'login' ? 'Sign In' : 'Create Account'
                        }
                    </button>
                </form>

                <div className="auth-switch">
                    {mode === 'login' ? (
                        <p>Don't have an account? <button onClick={() => { setMode('register'); setError('') }}>Sign up</button></p>
                    ) : (
                        <p>Already have an account? <button onClick={() => { setMode('login'); setError('') }}>Sign in</button></p>
                    )}
                </div>
            </motion.div>
        </motion.div>
    )
}
