/**
 * Author Studio Pro — Stale-while-revalidate network cache using IndexedDB.
 * Caches fetch results to survive backend cold-starts (Render free tier: 10-30s).
 */

let _idbModule = null;
let _initPromise = null;

function _init() {
    if (_initPromise) return _initPromise;
    _initPromise = import('idb-keyval')
        .then(mod => { _idbModule = mod; })
        .catch(() => { _idbModule = null; });
    return _initPromise;
}

async function _get(key) {
    await _init();
    if (!_idbModule) return undefined;
    return _idbModule.get(key);
}

async function _set(key, val) {
    await _init();
    if (!_idbModule) return;
    return _idbModule.set(key, val);
}

/**
 * @param {string} cacheKey - Unique cache key
 * @param {Function} fetchFn - Async function that fetches fresh data
 * @param {number} maxAgeMs - Max age in milliseconds before data is considered stale
 * @returns {Promise<{data: any, fromCache: boolean, stale: boolean}>}
 */
export async function cachedFetch(cacheKey, fetchFn, maxAgeMs) {
    let cached;
    try {
        cached = await _get(cacheKey);
    } catch {
        cached = undefined;
    }

    const now = Date.now();

    // Fresh cache hit
    if (cached && (now - cached._cachedAt < maxAgeMs)) {
        return { data: cached.data, fromCache: true, stale: false };
    }

    // Stale cache — return immediately, refresh in background
    if (cached) {
        fetchFn()
            .then(freshData => {
                _set(cacheKey, { data: freshData, _cachedAt: Date.now() }).catch(() => {});
            })
            .catch(() => {});

        return { data: cached.data, fromCache: true, stale: true };
    }

    // No cache — must fetch
    try {
        const freshData = await fetchFn();
        try {
            await _set(cacheKey, { data: freshData, _cachedAt: Date.now() });
        } catch {
            // IndexedDB write failed — still return the data
        }
        return { data: freshData, fromCache: false, stale: false };
    } catch (err) {
        if (cached) {
            return { data: cached.data, fromCache: true, stale: true };
        }
        throw err;
    }
}
