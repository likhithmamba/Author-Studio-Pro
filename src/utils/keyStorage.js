import CryptoJS from 'crypto-js';

// Generate a somewhat stable device fingerprint based on available browser APIs
export function getDeviceFingerprint() {
    const { userAgent, language, hardwareConcurrency, deviceMemory } = navigator;
    const screenColors = screen.colorDepth;
    const screenRes = `${screen.width}x${screen.height}`;
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    const rawFingerprint = `${userAgent}|${language}|${hardwareConcurrency}|${deviceMemory}|${screenColors}|${screenRes}|${timezone}`;

    // Hash the fingerprint to create a standard length key
    return CryptoJS.SHA256(rawFingerprint).toString();
}

export function saveApiKey(apiKey, fingerprint) {
    if (!apiKey) return;
    try {
        const encrypted = CryptoJS.AES.encrypt(apiKey, fingerprint).toString();
        localStorage.setItem('encrypted_api_key', encrypted);
    } catch (e) {
        console.error("Failed to encrypt API key", e);
    }
}

export function loadApiKey(fingerprint) {
    const encrypted = localStorage.getItem('encrypted_api_key');
    if (!encrypted) return null;

    try {
        const decryptedBytes = CryptoJS.AES.decrypt(encrypted, fingerprint);
        const decryptedKey = decryptedBytes.toString(CryptoJS.enc.Utf8);
        return decryptedKey || null; // If decryption fails, it returns empty string
    } catch (e) {
        console.error("Failed to decrypt API key", e);
        return null;
    }
}

export function hasApiKey() {
    return !!localStorage.getItem('encrypted_api_key');
}

export function removeApiKey() {
    localStorage.removeItem('encrypted_api_key');
    localStorage.removeItem('api_provider'); // We'll store this unencrypted as it's not sensitive
}

export function saveApiProvider(provider) {
    localStorage.setItem('api_provider', provider);
}

export function getApiProvider() {
    return localStorage.getItem('api_provider') || 'OpenAI';
}
