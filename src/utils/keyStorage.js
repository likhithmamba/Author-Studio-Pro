import CryptoJS from 'crypto-js';

// Generate a somewhat stable device fingerprint based on available browser APIs
export function getDeviceFingerprint() {
    try {
        // To prevent API key decryption failure due to minor browser property changes 
        // (like hardwareConcurrency or deviceMemory which can fluctuate), 
        // we use a persistent random salt stored in localStorage.
        let salt = localStorage.getItem('device_fingerprint_salt');
        if (!salt) {
            // Generate a secure random salt once and persist it
            salt = CryptoJS.lib.WordArray.random(32).toString();
            localStorage.setItem('device_fingerprint_salt', salt);
        }

        const { userAgent } = navigator;
        const rawFingerprint = [userAgent, salt].join('|');

        const hash = CryptoJS.SHA256(rawFingerprint).toString();
        return hash;
    } catch (e) {
        console.error("[Fingerprint] Failed:", e);
        return "stable-fallback-v1";
    }
}

export function saveApiKey(apiKey, fingerprint) {
    if (!apiKey) return;
    try {
        console.log("[KeyStorage] Encrypting with fingerprint:", fingerprint.substring(0, 8) + "...");
        const encrypted = CryptoJS.AES.encrypt(apiKey, fingerprint).toString();
        console.log("[KeyStorage] Encrypted length:", encrypted.length);
        localStorage.setItem('encrypted_api_key', encrypted);
        console.log("[KeyStorage] Saved to localStorage");
    } catch (e) {
        console.error("[KeyStorage] Encryption/Save failed:", e);
        throw e; // Rethrow to let UI catch it
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
    return localStorage.getItem('api_provider') || 'OpenRouter';
}
