import { useState, useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import LandingPage from './components/LandingPage'
import AppWorkspace from './components/AppWorkspace'
import SettingsPanel from './components/SettingsPanel'
import ErrorBoundary from './components/ErrorBoundary'
import ApiKeySetup from './components/ApiKeySetup'
import { hasApiKey, loadApiKey, getDeviceFingerprint } from './utils/keyStorage'
import './App.css'

function App() {
    const [settingsOpen, setSettingsOpen] = useState(false)

    // Check if key exists and can be decrypted
    const checkKeyStatus = () => {
        if (!hasApiKey()) return { isValid: false, message: '' };
        const key = loadApiKey(getDeviceFingerprint());
        if (!key) return { isValid: false, message: 'Your previous key could not be loaded (decryption failed). Please re-enter it.' };
        return { isValid: true, message: '' };
    };

    const initialKeyStatus = checkKeyStatus();
    const [isKeyValid, setIsKeyValid] = useState(initialKeyStatus.isValid);
    const [keyErrorMessage, setKeyErrorMessage] = useState(initialKeyStatus.message);

    const handleKeySaved = () => {
        setIsKeyValid(true);
        setKeyErrorMessage('');
    };

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

    return (
        <ErrorBoundary>
            {!isKeyValid ? (
                <ApiKeySetup onKeysaved={handleKeySaved} initialMessage={keyErrorMessage} />
            ) : (
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
                                <LandingPage
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
                    </Routes>

                    <AnimatePresence>
                        {settingsOpen && (
                            <SettingsPanel
                                settings={settings}
                                onSettingsChange={setSettings}
                                onClose={() => setSettingsOpen(false)}
                                onRemoveKey={() => setIsKeyValid(false)}
                            />
                        )}
                    </AnimatePresence>
                </div>
            )}
        </ErrorBoundary>
    )
}

export default App
