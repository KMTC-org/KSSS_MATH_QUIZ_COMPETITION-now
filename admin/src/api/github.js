// src/api/github.js
import { CONFIG } from '../core/config.js';
import { CONSTANTS } from '../utils/constants.js';
import { getGithubToken } from '../auth/session.js';
import { getCachedData, setCachedData } from './cache.js';
import { store } from '../core/store.js';
import { resetHistory } from '../core/history.js';
import { showStatus, setButtonLoading } from '../utils/dom.js';
import { showLoginModal } from '../ui/render.js';
import { renderForm, updateSidebarStats } from '../ui/render.js';
import { verifyIntegrity } from '../utils/security.js';
import { showAlertModal } from '../ui/modals.js';

// --- NEW: Validate GitHub token by fetching the authenticated user ---
export async function validateGithubToken(token) {
    try {
        const res = await fetch('https://api.github.com/user', {
            headers: { Authorization: `token ${token}` }
        });
        return res.ok; // 200 OK means token is valid
    } catch {
        return false; // network error or other failure
    }
}

async function fetchWithRetry(url, options = {}, maxRetries = CONSTANTS.MAX_RETRIES) {
    // Auth patch for fine-grained PATs
    if (options && options.headers && options.headers.Authorization) {
        const auth = options.headers.Authorization;
        if (auth.startsWith("token ")) {
            const tokenVal = auth.substring(6).trim();
            if (tokenVal.startsWith("gith") || tokenVal.length > 50) {
                options.headers.Authorization = `Bearer ${tokenVal}`;
            }
        }
    }

    let lastError;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            const response = await fetch(url, options);
            if (!response.ok) {
                const errorText = await response.text();
                let errorMessage;
                switch (response.status) {
                    case CONSTANTS.HTTP_UNAUTHORIZED:
                        errorMessage = "Authentication failed. Please check your GitHub token.";
                        break;
                    case CONSTANTS.HTTP_FORBIDDEN:
                        errorMessage = "Access forbidden. Token may have expired or lacks permissions.";
                        break;
                    case CONSTANTS.HTTP_NOT_FOUND:
                        errorMessage = "Repository or file not found.";
                        break;
                    case CONSTANTS.HTTP_CONFLICT:
                        errorMessage = "Conflict detected. File may have been modified. Please reload.";
                        break;
                    case CONSTANTS.HTTP_UNPROCESSABLE:
                        errorMessage = "Invalid request. Check your data format.";
                        break;
                    case CONSTANTS.HTTP_RATE_LIMIT:
                        errorMessage = "Rate limit exceeded. Please wait a moment.";
                        break;
                    case CONSTANTS.HTTP_SERVER_ERROR:
                    case 502:
                    case 503:
                    case 504:
                        errorMessage = "GitHub server error. Retrying...";
                        break;
                    default:
                        errorMessage = `GitHub API Error (${response.status})`;
                }
                const error = new Error(errorMessage);
                error.status = response.status;
                error.response = response;
                throw error;
            }
            return response;
        } catch (error) {
            lastError = error;
            const nonRetryable = [
                CONSTANTS.HTTP_UNAUTHORIZED,
                CONSTANTS.HTTP_FORBIDDEN,
                CONSTANTS.HTTP_NOT_FOUND,
                CONSTANTS.HTTP_CONFLICT,
                CONSTANTS.HTTP_UNPROCESSABLE
            ];
            if (error.status && nonRetryable.includes(error.status)) {
                throw error;
            }
            if (attempt < maxRetries - 1) {
                const delay = Math.min(
                    CONSTANTS.INITIAL_RETRY_DELAY * Math.pow(2, attempt),
                    CONSTANTS.MAX_RETRY_DELAY
                );
                showStatus(`Retry ${attempt + 1}/${maxRetries - 1} in ${delay / 1000}s...`, "#f59e0b");
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
    throw lastError;
}

export async function loadMatches(forceRefresh = false) {
    const grade = document.getElementById("grade-select").value;
    const cacheKey = `grade${grade}`;
    const url = `https://api.github.com/repos/${CONFIG.owner}/${CONFIG.repo}/contents/data/competition-grade${grade}.json`;
    const loadBtn = document.getElementById("load-btn");

    document.getElementById("loading-overlay").classList.remove("hidden");
    document.getElementById("editor-section").classList.add("hidden");

    if (loadBtn) setButtonLoading(loadBtn, true);

    const token = getGithubToken();
    if (!token) {
        await showAlertModal("Not Logged In", "Please log in to view matches.");
        document.getElementById("loading-overlay").classList.add("hidden");
        showLoginModal();
        if (loadBtn) setButtonLoading(loadBtn, false);
        return;
    }

    try {
        if (!forceRefresh) {
            const cachedData = getCachedData(cacheKey);
            if (cachedData) {
                store.setCurrentData(cachedData.data, 'github.loadMatches.cache');
                store.setCurrentSha(cachedData.sha, 'github.loadMatches.cache');
                resetHistory();
                renderForm();
                updateSidebarStats();
                document.getElementById("loading-overlay").classList.add("hidden");
                document.getElementById("editor-section").classList.remove("hidden");
                showStatus("✅ Matches Loaded (Cached)", "#16a34a");
                if (loadBtn) setButtonLoading(loadBtn, false);
                return;
            }
        }

        showStatus(forceRefresh ? "Refreshing from GitHub..." : "Connecting to GitHub...", "#3b82f6");
        const fetchUrl = forceRefresh ? `${url}?t=${Date.now()}` : url;
        const res = await fetchWithRetry(fetchUrl, {
            headers: { Authorization: `token ${token}` }
        });
        const json = await res.json();
        store.setCurrentSha(json.sha, 'github.loadMatches');
        const decoded = decodeURIComponent(escape(atob(json.content)));
        store.setCurrentData(JSON.parse(decoded), 'github.loadMatches');
        resetHistory();
        setCachedData(cacheKey, { data: store.getCurrentData(), sha: store.getCurrentSha() });
        renderForm();
        updateSidebarStats();
        showStatus("✅ Matches Loaded Successfully", "#16a34a");
    } catch (e) {
        if (CONFIG.debug) console.error("Load Error:", e);
        showStatus(`Error: ${e.message}`, "#ef4444");
        setTimeout(() => showAlertModal("Load Failed", `Failed to load matches:\n\n${e.message}\n\nPlease check:\n• Your GitHub token is valid\n• You have internet connection\n• The repository exists`), 100);
    } finally {
        document.getElementById("loading-overlay").classList.add("hidden");
        document.getElementById("editor-section").classList.remove("hidden");
        if (loadBtn) setButtonLoading(loadBtn, false);
    }
}

export async function saveToGitHub() {
    if (!await verifyIntegrity()) return;

    const token = getGithubToken();
    if (!token) {
        await showAlertModal("Not Logged In", "Please log in to save changes.");
        showLoginModal();
        return;
    }

    const currentData = store.getCurrentData();
    const path = `data/competition-grade${currentData.grade}.json`;
    const saveBtn = document.querySelector(".save-btn");

    showStatus("Saving Changes...", "#f59e0b");
    if (saveBtn) setButtonLoading(saveBtn, true);

    try {
        const contentString = JSON.stringify(currentData, null, 2);
        const base64Content = btoa(unescape(encodeURIComponent(contentString)));

        const res = await fetchWithRetry(
            `https://api.github.com/repos/${CONFIG.owner}/${CONFIG.repo}/contents/${path}`,
            {
                method: "PUT",
                headers: {
                    Authorization: `token ${token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    message: `Update by President ${store.getCurrentUser()}`,
                    content: base64Content,
                    sha: store.getCurrentSha()
                })
            }
        );

        const responseData = await res.json();
        if (responseData && responseData.content && responseData.content.sha) {
            store.setCurrentSha(responseData.content.sha, 'github.save');
            if (CONFIG.debug) console.log("✅ SHA updated immediately:", store.getCurrentSha());
        }

        const cacheKey = `grade${currentData.grade}`;
        setCachedData(cacheKey, { data: currentData, sha: store.getCurrentSha() });
        renderForm();
        updateSidebarStats();
        showStatus("✅ Saved & Published Successfully!", "#16a34a");
    } catch (e) {
        if (CONFIG.debug) console.error("Save Error:", e);
        if (e.status === 409) {
            showStatus("⚠️ Conflict detected. Refreshing data...", "#f59e0b");
            loadMatches(true);
        } else {
            showStatus(`Error: ${e.message}`, "#ef4444");
        }
    } finally {
        if (saveBtn) setButtonLoading(saveBtn, false);
    }
}