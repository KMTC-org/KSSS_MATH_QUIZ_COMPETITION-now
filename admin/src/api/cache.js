import { CONSTANTS } from '../utils/constants.js';
import { CONFIG } from '../core/config.js';

export function getCachedData(key) {
    try {
        const cached = localStorage.getItem(CONSTANTS.CACHE_KEY_PREFIX + key);
        if (!cached) return null;
        const { data, timestamp } = JSON.parse(cached);
        const age = Date.now() - timestamp;
        if (age > CONSTANTS.CACHE_DURATION) {
            localStorage.removeItem(CONSTANTS.CACHE_KEY_PREFIX + key);
            return null;
        }
        if (CONFIG.debug) console.log(`📦 Cache HIT for ${key} (age: ${Math.round(age/1000)}s)`);
        return data;
    } catch (error) {
        if (CONFIG.debug) console.error("Cache read error:", error);
        return null;
    }
}

export function setCachedData(key, data) {
    try {
        const cacheEntry = { data, timestamp: Date.now() };
        localStorage.setItem(CONSTANTS.CACHE_KEY_PREFIX + key, JSON.stringify(cacheEntry));
        if (CONFIG.debug) console.log(`💾 Cached data for ${key}`);
    } catch (error) {
        if (CONFIG.debug) console.error("Cache write error:", error);
    }
}

export function clearCache() {
    try {
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
            if (key.startsWith(CONSTANTS.CACHE_KEY_PREFIX)) {
                localStorage.removeItem(key);
            }
        });
        if (CONFIG.debug) console.log("🗑️ Cache cleared");
    } catch (error) {
        if (CONFIG.debug) console.error("Cache clear error:", error);
    }
}