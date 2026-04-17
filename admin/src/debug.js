import { store } from './core/store.js';
import { ErrorHandler } from './utils/errorHandler.js';
import { CONFIG } from './core/config.js';

let debugPanel = null;
let debugToggle = null;

export function initDebugPanel() {
    if (!CONFIG.debug) return;

    const isMobile = window.innerWidth <= 768;

    // Desktop styles remain unchanged; mobile styles override
    debugToggle = document.createElement('button');
    debugToggle.id = 'debug-toggle';
    debugToggle.innerHTML = isMobile ? '🐞' : '🐞 Debug'; // shorter on mobile
    debugToggle.title = 'Toggle debug panel (development only)';

    // Base styles (common)
    let toggleStyles = `
        position: fixed;
        z-index: 10002;
        background: #2d3748;
        color: #a0aec0;
        border: 1px solid #4a5568;
        font-family: 'Segoe UI', monospace;
        font-weight: 600;
        letter-spacing: 0.5px;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        transition: all 0.2s ease;
        opacity: 0.7;
        width: auto;
        line-height: 1;
        display: flex;
        align-items: center;
        justify-content: center;
    `;

    if (isMobile) {
        // Mobile: round, larger, positioned with safe margins
        toggleStyles += `
            bottom: 10px;
            left: 10px;
            padding: 10px;
            border-radius: 50%;
            font-size: 18px;
            min-width: 44px;
            min-height: 44px;
        `;
    } else {
        // Desktop: exactly as before
        toggleStyles += `
            bottom: 20px;
            left: 20px;
            padding: 6px 12px;
            border-radius: 16px;
            font-size: 11px;
        `;
    }
    debugToggle.style.cssText = toggleStyles;

    debugToggle.onmouseover = () => {
        debugToggle.style.opacity = '1';
        debugToggle.style.background = '#4a5568';
        debugToggle.style.color = '#fff';
    };
    debugToggle.onmouseout = () => {
        debugToggle.style.opacity = '0.7';
        debugToggle.style.background = '#2d3748';
        debugToggle.style.color = '#a0aec0';
    };

    // Panel styles
    debugPanel = document.createElement('div');
    debugPanel.id = 'debug-panel';

    let panelStyles = `
        position: fixed;
        background: #1e293b;
        color: #e2e8f0;
        font-family: 'Fira Code', 'Segoe UI', monospace;
        font-size: 12px;
        padding: 16px;
        border-radius: 12px;
        z-index: 10001;
        max-height: 400px;
        overflow: auto;
        display: none;
        border: 1px solid #334155;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(4px);
    `;

    if (isMobile) {
        // Mobile: full width, positioned near the toggle
        panelStyles += `
            bottom: 70px;
            left: 10px;
            right: 10px;
            max-width: none;
            width: auto;
        `;
    } else {
        // Desktop: fixed width as before
        panelStyles += `
            bottom: 70px;
            left: 20px;
            max-width: 400px;
            width: 90vw;
        `;
    }
    debugPanel.style.cssText = panelStyles;

    // Toggle panel on click
    debugToggle.onclick = () => {
        debugPanel.style.display = debugPanel.style.display === 'none' ? 'block' : 'none';
        updateDebugPanel();
    };

    document.body.appendChild(debugToggle);
    document.body.appendChild(debugPanel);

    // Auto-update every second
    setInterval(updateDebugPanel, 1000);
}

function updateDebugPanel() {
    if (!debugPanel || debugPanel.style.display === 'none') return;

    const hooks = window.KSSS_UI_HOOKS ? Object.keys(window.KSSS_UI_HOOKS).length : 'none';
    const errors = ErrorHandler.errors.length;

    let stateHtml = '';
    const state = store.state;
    for (const key in state) {
        let val = state[key];
        let displayVal;
        if (val === null) displayVal = 'null';
        else if (typeof val === 'object') displayVal = JSON.stringify(val).substring(0, 50) + (JSON.stringify(val).length > 50 ? '…' : '');
        else displayVal = String(val);
        stateHtml += `<div style="margin: 2px 0;"><span style="color:#94a3b8;">${key}:</span> <span style="color:#f472b6;">${displayVal}</span></div>`;
    }

    debugPanel.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; border-bottom: 1px solid #334155; padding-bottom: 8px;">
            <span style="font-weight: bold; color: #fbbf24;">🐞 Debug Console</span>
            <span style="color: #6b7280; font-size: 10px;">v2.2.5</span>
        </div>
        <div style="margin-bottom: 12px;">
            <div><span style="color:#94a3b8;">KSSS_UI_HOOKS:</span> <span style="color:#6ee7b7;">${hooks}</span></div>
            <div><span style="color:#94a3b8;">Errors:</span> <span style="color:#f87171;">${errors}</span></div>
        </div>
        <div style="margin-bottom: 12px; background: #0f172a; padding: 8px; border-radius: 6px; border-left: 3px solid #3b82f6;">
            <div style="font-weight: bold; color: #93c5fd; margin-bottom: 5px;">📦 Store snapshot</div>
            ${stateHtml}
        </div>
        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            <button class="debug-btn error-btn" style="flex:1; background:#3b82f6; color:white; border:none; padding:6px 0; border-radius:4px; cursor:pointer; font-size:11px; font-weight:600; transition:background 0.2s;" onmouseover="this.style.background='#2563eb'" onmouseout="this.style.background='#3b82f6'">📋 Show Errors</button>
            <button class="debug-btn history-btn" style="flex:1; background:#8b5cf6; color:white; border:none; padding:6px 0; border-radius:4px; cursor:pointer; font-size:11px; font-weight:600; transition:background 0.2s;" onmouseover="this.style.background='#7c3aed'" onmouseout="this.style.background='#8b5cf6'">📝 Show Changes</button>
            <button class="debug-btn clear-btn" style="flex:1; background:#64748b; color:white; border:none; padding:6px 0; border-radius:4px; cursor:pointer; font-size:11px; font-weight:600; transition:background 0.2s;" onmouseover="this.style.background='#4b5563'" onmouseout="this.style.background='#64748b'">🗑️ Clear Errors</button>
        </div>
    `;

    const btns = debugPanel.querySelectorAll('button');
    btns[0].onclick = () => console.table(ErrorHandler.errors);
    btns[1].onclick = () => console.table(store.getChangeHistory());
    btns[2].onclick = () => {
        ErrorHandler.clearErrors();
        updateDebugPanel();
    };
}