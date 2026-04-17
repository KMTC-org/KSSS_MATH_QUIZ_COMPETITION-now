import { CONFIG } from '../core/config.js';
import { store } from '../core/store.js';

export function logStructuralAction(actionType, details) {
    const currentData = store.getCurrentData();
    if (!currentData) {
        console.error("Cannot log structural action: currentData is null");
        return;
    }
    if (!currentData.structuralLog) {
        currentData.structuralLog = [];
    }
    const logEntry = {
        action: actionType,
        timestamp: new Date().toISOString(),
        admin: details.admin || store.getCurrentUser(),
        details: details
    };
    currentData.structuralLog.push(logEntry);
    if (currentData.structuralLog.length > 100) {
        currentData.structuralLog.shift();
    }

    // Also store in localStorage for persistence and modal
    try {
        const logKey = 'ksss_structural_action_log';
        let storedLog = JSON.parse(localStorage.getItem(logKey) || '[]');
        storedLog.push(logEntry);
        if (storedLog.length > 100) storedLog.shift();
        localStorage.setItem(logKey, JSON.stringify(storedLog));
    } catch (e) {
        console.warn('Failed to persist structural action log:', e);
    }

    if (CONFIG.debug) {
        console.log(`📋 Structural Action Logged: ${actionType}`, logEntry);
    }
}