import { useState } from 'react'
import { motion } from 'framer-motion'
import {
    HiOutlineXMark,
    HiOutlineShieldCheck,
    HiOutlineSparkles,
    HiOutlineLockClosed,
    HiOutlineTrash,
    HiOutlinePaintBrush,
    HiOutlineCpuChip,
    HiOutlineEye,
    HiOutlineEyeSlash,
    HiOutlineCheckCircle,
} from 'react-icons/hi2'
import './SettingsPanel.css'

const AI_MODELS = [
    // ── Free tier (cost: $0) ──────────────────────────────────────────────
    { value: 'mistralai/mistral-7b-instruct:free', label: '⚡ Mistral 7B Instruct (Free) — Best all-round', tier: 'free' },
    { value: 'mistralai/mistral-nemo:free', label: '⚡ Mistral Nemo 12B (Free) — Stronger reasoning', tier: 'free' },
    { value: 'meta-llama/llama-3.3-70b-instruct:free', label: '⚡ Llama 3.3 70B (Free) — Top free model', tier: 'free' },
    { value: 'meta-llama/llama-3.2-3b-instruct:free', label: '⚡ Llama 3.2 3B (Free) — Fastest', tier: 'free' },
    { value: 'google/gemma-3-27b-it:free', label: '⚡ Gemma 3 27B (Free) — Google flagship', tier: 'free' },
    { value: 'google/gemma-3-12b-it:free', label: '⚡ Gemma 3 12B (Free)', tier: 'free' },
    { value: 'deepseek/deepseek-chat:free', label: '⚡ DeepSeek V3 (Free) — Excellent quality', tier: 'free' },
    { value: 'qwen/qwen-2.5-72b-instruct:free', label: '⚡ Qwen 2.5 72B (Free) — Strong for analysis', tier: 'free' },
    // ── Paid tier ─────────────────────────────────────────────────────────
    { value: 'anthropic/claude-3-5-haiku', label: '💎 Claude 3.5 Haiku — Fast, smart', tier: 'paid' },
    { value: 'anthropic/claude-3-5-sonnet', label: '💎 Claude 3.5 Sonnet — Best editorial AI', tier: 'paid' },
    { value: 'openai/gpt-4o-mini', label: '💎 GPT-4o Mini — Strong + affordable', tier: 'paid' },
    { value: 'openai/gpt-4o', label: '💎 GPT-4o — Highest quality', tier: 'paid' },
    { value: 'google/gemini-2.0-flash-001', label: '💎 Gemini 2.0 Flash — Fast & capable', tier: 'paid' },
    { value: 'mistralai/mistral-large', label: '💎 Mistral Large — Flagship Mistral', tier: 'paid' },
]

export default function SettingsPanel({ settings, onSettingsChange, onClose }) {
    const [showKey, setShowKey] = useState(false)
    const [keySaved, setKeySaved] = useState(false)

    const update = (key, val) => {
        onSettingsChange(prev => ({ ...prev, [key]: val }))
    }

    const saveApiKey = (val) => {
        update('openRouterKey', val)
        setKeySaved(true)
        setTimeout(() => setKeySaved(false), 2000)
    }

    const clearAllData = () => {
        if (confirm('This will clear all saved preferences and your API key. Continue?')) {
            localStorage.removeItem('asp_settings')
            onSettingsChange({
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
            })
        }
    }

    return (
        <motion.div
            className="settings-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
        >
            <motion.div
                className="settings-panel"
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                onClick={e => e.stopPropagation()}
            >
                <div className="settings-header">
                    <h2 className="settings-title">⚙️ Settings</h2>
                    <button className="settings-close" onClick={onClose} aria-label="Close settings">
                        <HiOutlineXMark />
                    </button>
                </div>

                <div className="settings-body">

                    {/* ─── AI Configuration ─── */}
                    <div className="settings-group settings-group-ai">
                        <h3 className="settings-group-title">
                            <HiOutlineCpuChip /> AI Configuration
                        </h3>
                        <p className="settings-group-desc">
                            Author Studio Pro uses{' '}
                            <a href="https://openrouter.ai" target="_blank" rel="noopener noreferrer">
                                OpenRouter
                            </a>{' '}
                            to provide AI analysis and query generation. Get a free key at{' '}
                            <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer">
                                openrouter.ai/keys
                            </a>. Free models cost $0.
                        </p>

                        <div className="settings-item settings-item-full">
                            <div className="settings-item-info">
                                <span className="settings-item-label">OpenRouter API Key</span>
                                <span className="settings-item-desc">
                                    Stored only in your browser — never sent to our servers
                                </span>
                            </div>
                            <div className="settings-api-key-row">
                                <div className="settings-api-key-input-wrapper">
                                    <input
                                        type={showKey ? 'text' : 'password'}
                                        className="settings-api-key-input"
                                        placeholder="sk-or-v1-..."
                                        value={settings.openRouterKey || ''}
                                        onChange={e => saveApiKey(e.target.value)}
                                        autoComplete="off"
                                        spellCheck={false}
                                    />
                                    <button
                                        className="settings-key-toggle"
                                        onClick={() => setShowKey(v => !v)}
                                        aria-label={showKey ? 'Hide key' : 'Show key'}
                                        type="button"
                                    >
                                        {showKey ? <HiOutlineEyeSlash /> : <HiOutlineEye />}
                                    </button>
                                </div>
                                {keySaved && (
                                    <span className="settings-key-saved">
                                        <HiOutlineCheckCircle /> Saved
                                    </span>
                                )}
                            </div>
                            {settings.openRouterKey && (
                                <div className="settings-key-status">
                                    ✅ AI features enabled
                                    <span className="settings-key-hint">
                                        Your key: {settings.openRouterKey.slice(0, 10)}...
                                    </span>
                                </div>
                            )}
                        </div>

                        <div className="settings-item">
                            <div className="settings-item-info">
                                <span className="settings-item-label">AI Model</span>
                                <span className="settings-item-desc">
                                    Free models work great for most manuscripts
                                </span>
                            </div>
                            <select
                                className="settings-select settings-select-wide"
                                value={settings.aiModel || 'mistralai/mistral-7b-instruct:free'}
                                onChange={e => update('aiModel', e.target.value)}
                            >
                                <optgroup label="⚡ Free — $0 cost">
                                    {AI_MODELS.filter(m => m.tier === 'free').map(m => (
                                        <option key={m.value} value={m.value}>{m.label}</option>
                                    ))}
                                </optgroup>
                                <optgroup label="💎 Paid — higher quality">
                                    {AI_MODELS.filter(m => m.tier === 'paid').map(m => (
                                        <option key={m.value} value={m.value}>{m.label}</option>
                                    ))}
                                </optgroup>
                            </select>
                        </div>

                        {/* ─── AI Guide ─── */}
                        <AIGuide />
                    </div>


                    {/* ─── Appearance ─── */}
                    <div className="settings-group">
                        <h3 className="settings-group-title">
                            <HiOutlinePaintBrush /> Appearance
                        </h3>

                        <div className="settings-item">
                            <div className="settings-item-info">
                                <span className="settings-item-label">Font Size</span>
                                <span className="settings-item-desc">Adjust the base text size across the site</span>
                            </div>
                            <select
                                className="settings-select"
                                value={settings.fontSize}
                                onChange={e => update('fontSize', e.target.value)}
                            >
                                <option value="small">Small</option>
                                <option value="default">Default</option>
                                <option value="large">Large</option>
                                <option value="xlarge">Extra Large</option>
                            </select>
                        </div>

                        <div className="settings-item">
                            <div className="settings-item-info">
                                <span className="settings-item-label">High Contrast Mode</span>
                                <span className="settings-item-desc">Increase text contrast for better readability</span>
                            </div>
                            <ToggleSwitch
                                checked={settings.highContrast}
                                onChange={v => update('highContrast', v)}
                            />
                        </div>
                    </div>

                    {/* ─── Motion & Effects ─── */}
                    <div className="settings-group">
                        <h3 className="settings-group-title">
                            <HiOutlineSparkles /> Motion &amp; Effects
                        </h3>

                        <div className="settings-item">
                            <div className="settings-item-info">
                                <span className="settings-item-label">Reduced Motion</span>
                                <span className="settings-item-desc">Disable all animations for accessibility</span>
                            </div>
                            <ToggleSwitch
                                checked={settings.reducedMotion}
                                onChange={v => update('reducedMotion', v)}
                            />
                        </div>

                        <div className="settings-item">
                            <div className="settings-item-info">
                                <span className="settings-item-label">Particle Effects</span>
                                <span className="settings-item-desc">Enable aurora background and floating elements</span>
                            </div>
                            <ToggleSwitch
                                checked={settings.particleEffects}
                                onChange={v => update('particleEffects', v)}
                            />
                        </div>
                    </div>

                    {/* ─── Security & Privacy ─── */}
                    <div className="settings-group">
                        <h3 className="settings-group-title">
                            <HiOutlineShieldCheck /> Security &amp; Privacy
                        </h3>

                        <div className="settings-item">
                            <div className="settings-item-info">
                                <span className="settings-item-label">Analytics Consent</span>
                                <span className="settings-item-desc">Allow anonymous usage analytics</span>
                            </div>
                            <ToggleSwitch
                                checked={settings.analyticsConsent}
                                onChange={v => update('analyticsConsent', v)}
                            />
                        </div>

                        <div className="settings-item">
                            <div className="settings-item-info">
                                <span className="settings-item-label">Data Retention</span>
                                <span className="settings-item-desc">Control how long preferences are stored</span>
                            </div>
                            <select
                                className="settings-select"
                                value={settings.dataRetention}
                                onChange={e => update('dataRetention', e.target.value)}
                            >
                                <option value="session">This session only</option>
                                <option value="week">1 week</option>
                                <option value="month">1 month</option>
                                <option value="forever">Until cleared</option>
                            </select>
                        </div>

                        <div className="settings-item settings-item-danger">
                            <div className="settings-item-info">
                                <span className="settings-item-label">Clear All Data</span>
                                <span className="settings-item-desc">Remove all preferences, API key, and cached data</span>
                            </div>
                            <button className="settings-danger-btn" onClick={clearAllData}>
                                <HiOutlineTrash /> Clear
                            </button>
                        </div>
                    </div>

                    {/* ─── Security Info ─── */}
                    <div className="settings-security-info">
                        <HiOutlineLockClosed className="settings-lock-icon" />
                        <div>
                            <strong>Your data is protected</strong>
                            <p>
                                API keys stored locally only · Manuscripts processed locally ·
                                Zero server-side storage · CSP headers · No tracking cookies
                            </p>
                        </div>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    )
}

function ToggleSwitch({ checked, onChange }) {
    return (
        <button
            className={`toggle-switch ${checked ? 'toggle-on' : ''}`}
            onClick={() => onChange(!checked)}
            role="switch"
            aria-checked={checked}
        >
            <span className="toggle-knob" />
        </button>
    )
}

function AIGuide() {
    const [open, setOpen] = useState(false)
    return (
        <div className="ai-guide">
            <button
                className="ai-guide-toggle"
                onClick={() => setOpen(v => !v)}
                type="button"
            >
                <span>📖 How to use AI features</span>
                <span className={`ai-guide-chevron ${open ? 'open' : ''}`}>▾</span>
            </button>

            {open && (
                <div className="ai-guide-body">

                    {/* Step 1 */}
                    <div className="ai-guide-step">
                        <div className="ai-guide-step-num">1</div>
                        <div>
                            <strong>Get a free OpenRouter key</strong>
                            <p>
                                Go to{' '}
                                <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer">
                                    openrouter.ai/keys
                                </a>{' '}
                                → sign up → click <em>Create Key</em>. It takes 60 seconds and costs $0 to start.
                            </p>
                        </div>
                    </div>

                    {/* Step 2 */}
                    <div className="ai-guide-step">
                        <div className="ai-guide-step-num">2</div>
                        <div>
                            <strong>Paste your key above</strong>
                            <p>
                                Keys look like <code>sk-or-v1-…</code>. They are stored only in your
                                browser — never on our servers. The key is only sent to OpenRouter when
                                you actively trigger an AI feature.
                            </p>
                        </div>
                    </div>

                    {/* Step 3 */}
                    <div className="ai-guide-step">
                        <div className="ai-guide-step-num">3</div>
                        <div>
                            <strong>Choose your model</strong>
                            <p>For most authors, <strong>Mistral 7B (Free)</strong> or <strong>Llama 3.3 70B (Free)</strong> are the best starting points — zero cost and strong editorial reasoning. If you want the finest quality editorial commentary, upgrade to <strong>Claude 3.5 Sonnet</strong>.</p>
                        </div>
                    </div>

                    {/* What uses AI */}
                    <div className="ai-guide-section">
                        <strong>What uses AI calls?</strong>
                        <div className="ai-guide-table">
                            <div className="ai-guide-row">
                                <span className="ai-guide-feature">🔬 AI Manuscript Analysis</span>
                                <span className="ai-guide-calls">3–4 calls</span>
                                <span className="ai-guide-note">Opening · Midpoint · Closing · Synthesis</span>
                            </div>
                            <div className="ai-guide-row">
                                <span className="ai-guide-feature">📬 AI Query Package</span>
                                <span className="ai-guide-calls">3 calls</span>
                                <span className="ai-guide-note">Story intel · Synopsis · Query letter</span>
                            </div>
                            <div className="ai-guide-row">
                                <span className="ai-guide-feature">📄 Manuscript Formatting</span>
                                <span className="ai-guide-calls">1 call</span>
                                <span className="ai-guide-note">Optional — smarter chapter detection</span>
                            </div>
                            <div className="ai-guide-row">
                                <span className="ai-guide-feature">📈 Market Intelligence</span>
                                <span className="ai-guide-calls">0 calls</span>
                                <span className="ai-guide-note">Built-in database — no AI needed</span>
                            </div>
                        </div>
                    </div>

                    {/* Model guide */}
                    <div className="ai-guide-section">
                        <strong>Which model should I pick?</strong>
                        <div className="ai-guide-table">
                            <div className="ai-guide-row">
                                <span className="ai-guide-feature">⚡ Mistral 7B</span>
                                <span className="ai-guide-badge free">Free</span>
                                <span className="ai-guide-note">Best all-round free model. Start here.</span>
                            </div>
                            <div className="ai-guide-row">
                                <span className="ai-guide-feature">⚡ Llama 3.3 70B</span>
                                <span className="ai-guide-badge free">Free</span>
                                <span className="ai-guide-note">Strongest free model — slower, worth it.</span>
                            </div>
                            <div className="ai-guide-row">
                                <span className="ai-guide-feature">⚡ DeepSeek V3</span>
                                <span className="ai-guide-badge free">Free</span>
                                <span className="ai-guide-note">Excellent literary analysis quality.</span>
                            </div>
                            <div className="ai-guide-row">
                                <span className="ai-guide-feature">💎 Claude 3.5 Sonnet</span>
                                <span className="ai-guide-badge paid">Paid</span>
                                <span className="ai-guide-note">Best editorial AI available. ~$0.02/analysis.</span>
                            </div>
                            <div className="ai-guide-row">
                                <span className="ai-guide-feature">💎 GPT-4o</span>
                                <span className="ai-guide-badge paid">Paid</span>
                                <span className="ai-guide-note">Very strong. ~$0.05/analysis at full context.</span>
                            </div>
                        </div>
                    </div>

                    {/* Privacy note */}
                    <div className="ai-guide-privacy">
                        🔒 <strong>Your manuscript is never stored.</strong> Text is sent directly
                        to OpenRouter's API in-transit and discarded after the response.
                        OpenRouter's{' '}
                        <a href="https://openrouter.ai/privacy" target="_blank" rel="noopener noreferrer">
                            privacy policy
                        </a>{' '}
                        applies to all AI requests. For maximum privacy, disable AI features
                        and use structural analysis only (no API calls, 100% local).
                    </div>
                </div>
            )}
        </div>
    )
}
