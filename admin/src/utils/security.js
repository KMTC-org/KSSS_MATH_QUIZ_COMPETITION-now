import { CONFIG } from '../core/config.js';
import { AdminSecurity } from '../auth/adminSecurity.js';

export async function hashString(str) {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

export async function verifyIntegrity() {
    if (CONFIG.debug) console.log(`🛡️ verifyIntegrity (v${CONFIG.version}) checking...`);

    if (!AdminSecurity || !Object.isFrozen(AdminSecurity)) {
        if (CONFIG.debug) console.warn("🚨 Integrity Check Failed: AdminSecurity compromised");
        return false;
    }

    const isSessionValid = await AdminSecurity.validateSession();
    if (!isSessionValid) {
        if (CONFIG.debug) console.warn("🚨 Integrity Check Failed: Session tampered or expired");
        setTimeout(() => {
            alert("🔒 Security Alert: Session integrity compromised. Logging out.");
            AdminSecurity.logout();
        }, 100);
        return false;
    }
    return true;
}

export function freezeCriticalFunctions() {
    const criticalGlobals = [
        "verifyIntegrity",
        "saveToGitHub",
        "activateTeamSwitchMode",
        "exitTeamSwitchMode",
        "createMatchCard",
        "renderForm",
        "fetchWithRetry",
        "AdminSecurity"
    ];
    criticalGlobals.forEach(funcName => {
        if (window[funcName]) {
            Object.defineProperty(window, funcName, {
                value: window[funcName],
                writable: false,
                configurable: false
            });
        }
    });
    if (CONFIG.debug) console.log("🔒 Critical functions frozen.");
}