import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { HiOutlineShieldCheck } from 'react-icons/hi2'
import './SecurityBadge.css'

export default function SecurityBadge() {
    const [visible, setVisible] = useState(false)
    const [dismissed, setDismissed] = useState(false)

    useEffect(() => {
        const timer = setTimeout(() => setVisible(true), 3000)
        return () => clearTimeout(timer)
    }, [])

    useEffect(() => {
        if (visible && !dismissed) {
            const hideTimer = setTimeout(() => setVisible(false), 8000)
            return () => clearTimeout(hideTimer)
        }
    }, [visible, dismissed])

    if (dismissed) return null

    return (
        <AnimatePresence>
            {visible && (
                <motion.div
                    className="security-badge"
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 100, opacity: 0 }}
                    transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                >
                    <HiOutlineShieldCheck className="security-badge-icon" />
                    <div className="security-badge-text">
                        <strong>Your data is secure</strong>
                        <span>Encrypted · No server storage · GDPR compliant</span>
                    </div>
                    <button
                        className="security-badge-close"
                        onClick={() => setDismissed(true)}
                        aria-label="Dismiss"
                    >
                        ×
                    </button>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
