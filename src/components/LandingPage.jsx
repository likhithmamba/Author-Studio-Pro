import Navbar from './Navbar'
import Hero from './Hero'
import Features from './Features'
import HowItWorks from './HowItWorks'
import AIIntelligence from './AIIntelligence'
import GenreDatabase from './GenreDatabase'
import Templates from './Templates'
import Pricing from './Pricing'
import FAQ from './FAQ'
import Footer from './Footer'
import SecurityBadge from './SecurityBadge'

export default function LandingPage({ settings, onSettingsClick }) {
    return (
        <>
            <Navbar onSettingsClick={onSettingsClick} />
            <main>
                <Hero settings={settings} />
                <Features />
                <HowItWorks />
                <AIIntelligence />
                <GenreDatabase />
                <Templates />
                <Pricing />
                <FAQ />
            </main>
            <Footer />
            <SecurityBadge />
        </>
    )
}
