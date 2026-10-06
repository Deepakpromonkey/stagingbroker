/*
| In-memory cache for API responses a page would otherwise fetch again on every
| visit — the carrier profile's risk factors, associations and equipment.
|
| These used to live in localStorage, one key per carrier, with no expiry: they
| piled up for every carrier ever opened, outlived a sign-out on a shared
| machine, and kept showing data the API had since corrected. Memory goes with
| the tab, entries expire, and signing out clears them.
|
| The API caches the same answers in Redis, so a miss here is cheap.
*/

const DEFAULT_TTL_MS = 10 * 60 * 1000;

const store = new Map();

export function getCached(key) {
    const entry = store.get(key);

    if (!entry) return null;

    if (entry.expiresAt <= Date.now()) {
        store.delete(key);
        return null;
    }

    return entry.value;
}

export function setCached(key, value, ttlMs = DEFAULT_TTL_MS) {
    store.set(key, { value, expiresAt: Date.now() + ttlMs });
}

export function forgetCached(key) {
    store.delete(key);
}

export function clearCache() {
    store.clear();
    inflight.clear();
}

const inflight = new Map();

/**
 * The cached value for `key`, or the result of `load()` — fetched once however
 * many components ask at the same moment. A failed load is not cached.
 */
export function cachedRequest(key, load, ttlMs = DEFAULT_TTL_MS) {
    const hit = getCached(key);

    if (hit !== null) return Promise.resolve(hit);

    if (inflight.has(key)) return inflight.get(key);

    const request = Promise.resolve()
        .then(load)
        .then((value) => {
            setCached(key, value, ttlMs);
            return value;
        })
        .finally(() => inflight.delete(key));

    inflight.set(key, request);

    return request;
}

/*
| The localStorage keys the old cache wrote. Removed once at startup so they
| stop taking up the origin's storage quota.
*/
const LEGACY_PREFIXES = ['risk_factor_', 'company_associations_', 'equipment_insights_'];

export function purgeLegacyStorageCache() {
    try {
        Object.keys(localStorage)
            .filter((key) => LEGACY_PREFIXES.some((prefix) => key.startsWith(prefix)))
            .forEach((key) => localStorage.removeItem(key));
    } catch {
        /* storage refused: nothing to clean up */
    }
}
