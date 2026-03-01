import React, { useState, useEffect } from 'react';
import { FiLock, FiEye, FiEyeOff } from 'react-icons/fi';
import { saveApiKey, saveApiProvider, getDeviceFingerprint } from '../utils/keyStorage';
import './ApiKeySetup.css';

export default function ApiKeySetup({ onKeysaved, initialMessage }) {
    const [key, setKey] = useState('');
    const [showKey, setShowKey] = useState(false);
    const [provider, setProvider] = useState('OpenRouter');
    const [message, setMessage] = useState(initialMessage || '');

    const handleSave = () => {
        if (key.trim()) {
            const fingerprint = getDeviceFingerprint();
            saveApiKey(key.trim(), fingerprint);
            saveApiProvider(provider);
            if (onKeysaved) onKeysaved();
        }
    };

    const getHelpLink = () => {
        switch (provider) {
            case 'OpenAI': return 'https://platform.openai.com/api-keys';
            case 'Anthropic': return 'https://console.anthropic.com/settings/keys';
            case 'Gemini': return 'https://aistudio.google.com/app/apikey';
            default: return 'https://openrouter.ai/keys';
        }
    };

    return (
        <div className="api-key-modal-overlay">
            <div className="api-key-modal">
                <h1 className="brand-logo">Author Studio <span>Pro</span></h1>
                <h2>Enter Your API Key to Get Started</h2>

                {message && <p className="error-message">{message}</p>}

                <div className="input-group provider-select">
                    <label>AI Provider</label>
                    <select value={provider} onChange={(e) => setProvider(e.target.value)}>
                        <option value="OpenRouter">OpenRouter (Recommended)</option>
                        <option value="OpenAI">OpenAI</option>
                        <option value="Anthropic">Anthropic</option>
                        <option value="Gemini">Google Gemini</option>
                    </select>
                </div>

                <div className="input-group">
                    <label>API Key</label>
                    <div className="password-wrapper">
                        <input
                            type={showKey ? "text" : "password"}
                            placeholder="sk-or-v1-..."
                            value={key}
                            onChange={(e) => setKey(e.target.value)}
                        />
                        <button type="button" className="toggle-btn" onClick={() => setShowKey(!showKey)}>
                            {showKey ? <FiEyeOff /> : <FiEye />}
                        </button>
                    </div>
                </div>

                <button onClick={handleSave} className="save-btn" disabled={!key.trim()}>
                    Save & Continue
                </button>

                <div className="trust-message">
                    <FiLock className="lock-icon" />
                    <span>Your key is encrypted with AES-256 and stored only on this device. We never see it.</span>
                </div>

                <a href={getHelpLink()} target="_blank" rel="noreferrer" className="help-link">
                    How do I get an API key?
                </a>
            </div>
        </div>
    );
}
