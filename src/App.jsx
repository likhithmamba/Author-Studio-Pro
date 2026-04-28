import { useState, useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import LandingPage from './components/LandingPage'
import AppWorkspace from './components/AppWorkspace'
import SettingsPanel from './components/SettingsPanel'
import ErrorBoundary from './components/ErrorBoundary'
import QuickCapture from './components/QuickCapture/QuickCapture'
import QuickCaptureInbox from './components/QuickCapture/QuickCaptureInbox'
import GlobalSearch from './components/GlobalSearch/GlobalSearch'
import { useEntryGate } from './hooks/useEntryGate'
import { Navigate } from 'react-router-dom'
import './App.css'

function LandingGate({ settings, onSettingsClick }) {
    const { shouldRedirect } = useEntryGate();
    if (shouldRedirect === null) return null; // loading
    if (shouldRedirect) return <Navigate to="/app" replace />;
    return <LandingPage settings={settings} onSettingsClick={onSettingsClick} />;
}

function App() {
    const [settingsOpen, setSettingsOpen] = useState(false)
    const [quickCaptureOpen, setQuickCaptureOpen] = useState(false)
    const [inboxOpen, setInboxOpen] = useState(false)
    const [globalSearchOpen, setGlobalSearchOpen] = useState(false)

    const [settings, setSettings] = useState(() => {
        try {
            const saved = localStorage.getItem('asp_settings')
            const defaults = {
                reducedMotion: false,
                highContrast: false,
                fontSize: 'default',
                theme: 'dark',
                particleEffects: true,
                soundEffects: false,
                analyticsConsent: false,
                dataRetention: 'session',
                openRouterKey: '',
                aiModel: 'mistralai/mistral-7b-instruct:free',
            }
            return saved ? { ...defaults, ...JSON.parse(saved) } : defaults
        } catch {
            return {
                reducedMotion: false,
                highContrast: false,
                fontSize: 'default',
                theme: 'dark',
                particleEffects: true,
                soundEffects: false,
                analyticsConsent: false,
                dataRetention: 'session',
                openRouterKey: '',
                aiModel: 'mistralai/mistral-7b-instruct:free',
            }
        }
    })

    useEffect(() => {
        try {
            localStorage.setItem('asp_settings', JSON.stringify(settings))
        } catch { /* silently fail if storage is blocked */ }
    }, [settings])

    useEffect(() => {
        document.documentElement.classList.toggle('reduced-motion', settings.reducedMotion)
        document.documentElement.classList.toggle('high-contrast', settings.highContrast)
        document.documentElement.setAttribute('data-font-size', settings.fontSize)
    }, [settings.reducedMotion, settings.highContrast, settings.fontSize])

    // FIX-2: Warmup ping — fire and forget
    useEffect(() => {
        const apiUrl = import.meta.env.VITE_API_URL
        if (apiUrl) {
            fetch(`${apiUrl}/api/health`).catch(() => {})
        }
    }, [])

    useEffect(() => {
        const h1 = () => setQuickCaptureOpen(true);
        const h2 = () => setGlobalSearchOpen(true);
        const h3 = () => setInboxOpen(true);
        window.addEventListener('openQuickCapture', h1);
        window.addEventListener('openGlobalSearch', h2);
        window.addEventListener('openInbox', h3);
        return () => {
            window.removeEventListener('openQuickCapture', h1);
            window.removeEventListener('openGlobalSearch', h2);
            window.removeEventListener('openInbox', h3);
        }
    }, [])

    return (
        <ErrorBoundary>
            <div className="app">
                <div className="noise-overlay" aria-hidden="true" />
                <div className="aurora-bg" aria-hidden="true">
                    <div className="aurora-blob aurora-1" />
                    <div className="aurora-blob aurora-2" />
                    <div className="aurora-blob aurora-3" />
                </div>

                <Routes>
                    <Route
                        path="/"
                        element={
                            <LandingGate
                                settings={settings}
                                onSettingsClick={() => setSettingsOpen(true)}
                            />
                        }
                    />
                    <Route
                        path="/app"
                        element={
                            <AppWorkspace
                                settings={settings}
                                onSettingsClick={() => setSettingsOpen(true)}
                            />
                        }
                    />
                    <Route
                        path="/editor"
                        element={
                            <AppWorkspace
                                settings={settings}
                                onSettingsClick={() => setSettingsOpen(true)}
                                initialTab="editor"
                            />
                        }
                    />
                    <Route
                        path="*"
                        element={
                            <div style={{
                                display: 'flex', flexDirection: 'column',
                                alignItems: 'center', justifyContent: 'center',
                                minHeight: '100vh', color: '#fff', textAlign: 'center',
                                padding: '2rem', gap: '1rem',
                            }}>
                                <h1 style={{ fontSize: '4rem', margin: 0, opacity: 0.8 }}>404</h1>
                                <p style={{ fontSize: '1.25rem', opacity: 0.6 }}>Page not found</p>
                                <a href="/" style={{
                                    marginTop: '1rem', padding: '0.75rem 2rem',
                                    background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
                                    borderRadius: '8px', color: '#fff', textDecoration: 'none',
                                }}>Go Home</a>
                            </div>
                        }
                    />
                </Routes>

                <AnimatePresence>
                    {settingsOpen && (
                        <SettingsPanel
                            settings={settings}
                            onSettingsChange={setSettings}
                            onClose={() => setSettingsOpen(false)}
                        />
                    )}
                </AnimatePresence>

                <QuickCapture open={quickCaptureOpen} onClose={() => setQuickCaptureOpen(false)} />
                <QuickCaptureInbox open={inboxOpen} onClose={() => setInboxOpen(false)} />
                <GlobalSearch open={globalSearchOpen} onClose={() => setGlobalSearchOpen(false)} />
            </div>
        </ErrorBoundary>
    )
}

export default App
