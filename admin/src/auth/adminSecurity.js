// src/auth/adminSecurity.js
import { CONFIG } from '../core/config.js';
import { ROLE_ABSOLUTE, ROLE_LIMITED } from './roles.js';
import { hashString } from '../utils/security.js';
import { store } from '../core/store.js';
import { getGithubToken, setGithubToken, setAdminUser, getSecureAdminRole, setSecureAdminRole, clearSession } from './session.js';
import { showAuthModal } from '../ui/modals.js';
import { loadMatches, validateGithubToken } from '../api/github.js';
import { freezeCriticalFunctions } from '../utils/security.js';
import { showLoginModal } from '../ui/render.js';
import { showRoleBadge } from '../ui/theme.js';
import { showAlertModal } from '../ui/modals.js';
import { setButtonLoading } from '../utils/dom.js'; // ADDED

const SALT = "ksss-secure-salt-v1";

let role = null;
let isInitializing = false;

async function signRole(roleValue) {
    if (!roleValue) return null;
    const nonce = Date.now().toString();
    const hash = await hashString(roleValue + SALT + nonce);
    return { role: roleValue, nonce, hash };
}

async function verifyRole(storedObj) {
    if (!storedObj || !storedObj.role || !storedObj.nonce || !storedObj.hash) {
        if (CONFIG.debug) console.warn("🔒 Security Alert: Invalid role structure");
        return null;
    }
    const ALLOWED_ROLES = [ROLE_ABSOLUTE, ROLE_LIMITED];
    if (!ALLOWED_ROLES.includes(storedObj.role)) {
        console.warn(`🔒 Security Alert: Unrecognized role '${storedObj.role}' rejected`);
        return null;
    }
    const computed = await hashString(storedObj.role + SALT + storedObj.nonce);
    if (computed === storedObj.hash) return storedObj.role;
    console.warn("🔒 Security Alert: Admin Role Tampered. Clearing session.");
    return null;
}

async function setRole(newRole) {
    role = newRole;
    store.setCurrentAdminRole(newRole, 'adminSecurity.setRole');

    if (newRole) {
        const signed = await signRole(newRole);
        setSecureAdminRole(signed);
    } else {
        setSecureAdminRole(null);
    }
    sessionStorage.removeItem("currentAdminRole");
}

function finishLogin(tokenInput) {
    const currentUser = store.getCurrentUser();
    setAdminUser(currentUser);
    setGithubToken(tokenInput);

    document.getElementById("login-section").classList.add("hidden");
    document.getElementById("grade-section").classList.remove("hidden");
    document.getElementById("admin-display").innerHTML =
        `✅ <strong>Authenticated:</strong> ${currentUser} | <strong>Status:</strong> <span style="color: var(--success);">Active Session</span> | <a href="#" onclick="logout(); return false;" style="color: var(--danger); margin-left: 10px;">Logout</a>`;
    showRoleBadge();
}

export const AdminSecurity = (() => {
    async function login() {
        const btn = document.getElementById("login-btn");
        if (!btn) return;
        // Prevent multiple clicks
        if (btn.disabled) return;
        setButtonLoading(btn, true);

        try {
            const userName = document.getElementById("admin-name").value;
            const tokenInput = document.getElementById("gh-token").value.trim();

            if (!userName || !tokenInput) {
                await showAlertModal("Missing Information", "Please select your name and enter your GitHub token.");
                return;
            }

            // Validate the GitHub token before proceeding
            const tokenValid = await validateGithubToken(tokenInput);
            if (!tokenValid) {
                await showAlertModal("Invalid Token", "The GitHub token provided is invalid or expired. Please check and try again.");
                return;
            }

            store.setCurrentUser(userName, 'adminSecurity.login');

            if (userName === "Y-JAMMEH") {
                try {
                    const code = await showAuthModal();
                    const expectedHash = "45888f0c28b9e1007b74238f0dd90312efe9b3c4298957c80079845ed7725384";
                    const codeHash = await hashString(code);
                    if (codeHash !== expectedHash) {
                        await showAlertModal("Access Denied", "Incorrect structural authentication code. Access denied.");
                        return;
                    }
                    await setRole(ROLE_ABSOLUTE);
                    finishLogin(tokenInput);
                } catch (e) {
                    // User cancelled the modal – do nothing
                    return;
                }
            } else {
                await setRole(ROLE_LIMITED);
                finishLogin(tokenInput);
            }
        } catch (e) {
            console.error(e);
            await showAlertModal("Login Error", "An unexpected error occurred. Please try again.");
        } finally {
            setButtonLoading(btn, false);
        }
    }

    function logout() {
        clearSession();
        store.setCurrentUser("", 'adminSecurity.logout');
        store.setCurrentAdminRole(null, 'adminSecurity.logout');
        store.setCurrentData(null, 'adminSecurity.logout');
        store.setCurrentSha("", 'adminSecurity.logout');
        window.location.reload();
    }

    async function verifySession() {
        isInitializing = true;

        const token = getGithubToken();
        if (!token) {
            await setRole(null);
            isInitializing = false;
            showLoginModal();
            return;
        }

        const storedRole = getSecureAdminRole();
        if (!storedRole) {
            await setRole(null);
            isInitializing = false;
            showLoginModal();
            return;
        }

        try {
            const storedObj = JSON.parse(storedRole);
            const roleVerified = await verifyRole(storedObj);
            if (!roleVerified) {
                await setRole(null);
                isInitializing = false;
                showLoginModal();
                return;
            }
            role = roleVerified;
            store.setCurrentAdminRole(role, 'adminSecurity.verifySession');
        } catch (e) {
            console.error("🔒 Role parse error", e);
            await setRole(null);
            isInitializing = false;
            showLoginModal();
            return;
        }

        showRoleBadge();
        await loadMatches();
        freezeCriticalFunctions();

        isInitializing = false;
    }

    async function validateSession() {
        const token = getGithubToken();
        if (!token) return false;

        const storedRole = getSecureAdminRole();
        if (!storedRole && role !== null) return false;

        try {
            const storedObj = JSON.parse(storedRole);
            const verifiedRole = await verifyRole(storedObj);
            if (!verifiedRole || verifiedRole !== role) {
                if (CONFIG.debug) console.warn("🔒 Integrity Check: Session signature invalid or role mismatch");
                return false;
            }
            return true;
        } catch (e) {
            return false;
        }
    }

    return Object.freeze({
        login,
        logout,
        verifySession,
        validateSession,
        getRole: () => role,
        isInitializing: () => isInitializing,
        isAuthenticated: () => role !== null
    });
})();