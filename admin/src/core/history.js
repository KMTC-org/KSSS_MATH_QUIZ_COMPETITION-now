import { CONSTANTS } from '../utils/constants.js';
import { store } from './store.js';
import { showStatus } from '../utils/dom.js';

let undoStack = [];
let redoStack = [];
let isApplyingHistory = false;

function cloneCompetitionData(data) {
    return JSON.parse(JSON.stringify(data));
}

export function updateUndoRedoButtons() {
    const undoBtn = document.getElementById("undo-btn");
    const redoBtn = document.getElementById("redo-btn");
    if (undoBtn) undoBtn.disabled = undoStack.length === 0;
    if (redoBtn) redoBtn.disabled = redoStack.length === 0;
}

export function resetHistory() {
    undoStack = [];
    redoStack = [];
    updateUndoRedoButtons();
}

export function saveHistorySnapshot() {
    const currentData = store.getCurrentData();
    if (!currentData || isApplyingHistory) return;
    undoStack.push(cloneCompetitionData(currentData));
    if (undoStack.length > CONSTANTS.MAX_HISTORY_ENTRIES) {
        undoStack.shift();
    }
    redoStack = [];
    updateUndoRedoButtons();
}

export function undoChange(renderCallback) {
    const currentData = store.getCurrentData();
    if (!currentData || undoStack.length === 0) return;
    isApplyingHistory = true;
    const oldRoundCount = currentData.rounds?.length || 0;
    redoStack.push(cloneCompetitionData(currentData));
    store.setCurrentData(undoStack.pop(), 'history.undo');
    const newRoundCount = store.getCurrentData().rounds?.length || 0;
    if (newRoundCount < oldRoundCount && newRoundCount > 0) {
        const lastRound = store.getCurrentData().rounds[newRoundCount - 1];
        if (lastRound && lastRound.status !== "locked") {
            lastRound.matches = lastRound.matches.filter(m => m.type !== "best_loser");
        }
    }
    isApplyingHistory = false;
    if (renderCallback) renderCallback();
    updateUndoRedoButtons();
    showStatus("↩️ Last change undone", "#3b82f6");
}

export function redoChange(renderCallback) {
    const currentData = store.getCurrentData();
    if (!currentData || redoStack.length === 0) return;
    isApplyingHistory = true;
    undoStack.push(cloneCompetitionData(currentData));
    store.setCurrentData(redoStack.pop(), 'history.redo');
    isApplyingHistory = false;
    if (renderCallback) renderCallback();
    updateUndoRedoButtons();
    showStatus("↪️ Change restored", "#3b82f6");
}