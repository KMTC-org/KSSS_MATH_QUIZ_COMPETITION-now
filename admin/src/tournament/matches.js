import { store } from '../core/store.js';
import { CONSTANTS } from '../utils/constants.js';
import { saveHistorySnapshot } from '../core/history.js';
import { showStatus } from '../utils/dom.js';
import { updateSidebarStats } from '../ui/render.js';

export function getMatchStatus(match, isLocked) {
    if (isLocked) return 'locked';
    if (match.winner !== null && match.winner !== undefined && match.winner !== "") return 'completed';
    if (match.teamA.points !== null || match.teamB.points !== null) return 'in-progress';
    return 'pending';
}

export function updateSchedule(rIdx, mIdx, field, value) {
    const currentData = store.getCurrentData();
    const currentValue = currentData.rounds[rIdx].matches[mIdx].schedule[field] ?? "";
    if (currentValue === value) return;
    saveHistorySnapshot();
    currentData.rounds[rIdx].matches[mIdx].schedule[field] = value;
    updateSidebarStats();
}

export function updateScores(rIdx, mIdx, team, val) {
    const currentData = store.getCurrentData();
    const m = currentData.rounds[rIdx].matches[mIdx];
    const inputElement = event?.target;

    if (inputElement && !inputElement.dataset.historyCaptured) {
        saveHistorySnapshot();
        inputElement.dataset.historyCaptured = "1";
        inputElement.addEventListener("blur", () => {
            delete inputElement.dataset.historyCaptured;
        }, { once: true });
    }

    if (val === "") {
        if (team === "teamA") m.teamA.points = null;
        else m.teamB.points = null;
        if (inputElement) inputElement.classList.remove("invalid");
    } else {
        const pts = parseInt(val);
        if (isNaN(pts)) {
            if (inputElement) {
                inputElement.classList.add("invalid");
                setTimeout(() => inputElement.classList.remove("invalid"), CONSTANTS.VALIDATION_ERROR_DISPLAY);
            }
            showStatus("⚠️ Please enter a valid number", "#f59e0b");
            return;
        }
        if (pts < CONSTANTS.MIN_SCORE || pts > CONSTANTS.MAX_SCORE) {
            if (inputElement) {
                inputElement.classList.add("invalid");
                setTimeout(() => inputElement.classList.remove("invalid"), CONSTANTS.VALIDATION_ERROR_DISPLAY);
            }
            showStatus(`⚠️ Score must be between ${CONSTANTS.MIN_SCORE} and ${CONSTANTS.MAX_SCORE}`, "#f59e0b");
            return;
        }
        if (inputElement) inputElement.classList.remove("invalid");
        if (team === "teamA") m.teamA.points = pts;
        else m.teamB.points = pts;
    }

    if (m.teamA.points !== null && m.teamB.points !== null) {
        if (m.teamA.points > m.teamB.points) m.winner = m.teamA.name;
        else if (m.teamB.points > m.teamA.points) m.winner = m.teamB.name;
        else m.winner = null;
    } else {
        m.winner = null;
    }

    const winBox = document.getElementById(`win-${rIdx}-${mIdx}`);
    if (winBox) winBox.innerText = `🏆 Winner: ${m.winner ?? "Pending"}`;

    updateSidebarStats();
}