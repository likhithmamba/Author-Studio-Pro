import { useState, useEffect } from 'react'
import { AnimatePresence } from 'framer-motion'
import Navbar from './components/Navbar'
import Hero from './components/Hero'
import Features from './components/Features'
import HowItWorks from './components/HowItWorks'
import AIIntelligence from './components/AIIntelligence'
import GenreDatabase from './components/GenreDatabase'
import Templates from './components/Templates'
import Pricing from './components/Pricing'
import FAQ from './components/FAQ'
import Footer from './components/Footer'
import SettingsPanel from './components/SettingsPanel'
import SecurityBadge from './components/SecurityBadge'
import Tools from './components/Tools'
import './App.css'

function App() {
    const [settingsOpen, setSettingsOpen] = useState(false)
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
        <div className="app">
            <div className="noise-overlay" aria-hidden="true" />
            <div className="aurora-bg" aria-hidden="true">
                <div className="aurora-blob aurora-1" />
                <div className="aurora-blob aurora-2" />
                <div className="aurora-blob aurora-3" />
            </div>

            <Navbar onSettingsClick={() => setSettingsOpen(true)} />

            <main>
                <Hero settings={settings} />
                <Features />
                <HowItWorks />
                <AIIntelligence />
                <Tools settings={settings} />
                <GenreDatabase />
                <Templates />
                <Pricing />
                <FAQ />
            </main>

            <Footer />
            <SecurityBadge />

            <AnimatePresence>
                {settingsOpen && (
                    <SettingsPanel
                        settings={settings}
                        onSettingsChange={setSettings}
                        onClose={() => setSettingsOpen(false)}
                    />
                )}
            </AnimatePresence>
        </div>
    )
}

export default App
