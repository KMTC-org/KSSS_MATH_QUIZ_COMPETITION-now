import { store } from '../core/store.js';
import { getLosersSorted, hasBestLoserMatch } from './rounds.js';
import { saveHistorySnapshot } from '../core/history.js';
import { renderForm, updateSidebarStats } from '../ui/render.js';
import { closeBestLoserModal } from '../ui/modals.js';
import { showStatus } from '../utils/dom.js';
import { saveToGitHub } from '../api/github.js';
import { showAlertModal } from '../ui/modals.js'; // ADDED

export async function createBestLoserMatch(rIdx) {
    const teamA = document.getElementById("loser-a").value;
    const teamB = document.getElementById("loser-b").value;
    if (!teamA || !teamB) {
        await showAlertModal("Missing Selection", "Please select both teams.");
        return;
    }
    if (teamA === teamB) {
        await showAlertModal("Invalid Selection", "Cannot select the same team twice.");
        return;
    }

    const currentData = store.getCurrentData();
    const round = currentData.rounds[rIdx];
    if (hasBestLoserMatch(round)) {
        await showAlertModal("Best Loser Exists", "This round already has a Best Loser match. Please delete the existing one first (use Undo) or complete it.");
        return;
    }

    saveHistorySnapshot();

    const maxId = Math.max(...round.matches.map(m => m.id || 0));
    const bestLoserMatch = {
        id: maxId + 1,
        type: "best_loser",
        schedule: {
            date: "Pending",
            time: "TBD",
            location: round.matches[0]?.schedule?.location || "Maths Lab"
        },
        teamA: { name: teamA, points: null },
        teamB: { name: teamB, points: null },
        winner: null
    };
    round.matches.push(bestLoserMatch);

    closeBestLoserModal();
    renderForm();
    updateSidebarStats();

    if (window.KSSS_UI_HOOKS?.saveToGitHub) {
        await window.KSSS_UI_HOOKS.saveToGitHub();
    } else {
        await saveToGitHub();
    }
    showStatus("✅ Best Loser match created & saved!", "#16a34a");
}