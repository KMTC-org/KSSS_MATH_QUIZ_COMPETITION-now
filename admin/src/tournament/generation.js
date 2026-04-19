import { store } from '../core/store.js';
import { getQualifiedTeams } from './rounds.js';
import { saveHistorySnapshot } from '../core/history.js';
import { renderForm, updateSidebarStats } from '../ui/render.js';
import { closeRoundGenModal, showCriticalActionModal, showAlertModal } from '../ui/modals.js';
import { showStatus } from '../utils/dom.js';
import { logStructuralAction } from '../utils/logger.js';
import { AdminSecurity } from '../auth/adminSecurity.js';
import { ROLE_ABSOLUTE } from '../auth/roles.js';
import { saveToGitHub } from '../api/github.js';

export let pairingState = { teams: [], usedTeams: new Set(), matches: [] };

export function startPairing(rIdx) {
    const currentData = store.getCurrentData();
    const round = currentData.rounds[rIdx];
    const qualified = getQualifiedTeams(round);
    const numMatches = parseInt(document.getElementById("num-matches").value);
    if (numMatches * 2 !== qualified.length) {
        showAlertModal("Invalid Number", `Invalid number of matches. ${qualified.length} teams require exactly ${qualified.length / 2} matches.`);
        return;
    }
    pairingState = {
        teams: qualified,
        usedTeams: new Set(),
        matches: [],
        sourceRoundIdx: rIdx
    };
    showPairingUI(numMatches);
}

function showPairingUI(numMatches) {
    const modal = document.getElementById("round-gen-modal");
    let html = `
        <div class="modal-header">
            <h3 class="modal-title">🎯 Manual Pairing</h3>
            <p class="modal-subtitle">Select teams for each match. A team can only be used once.</p>
        </div>
        <div class="modal-body">
            <div id="pairing-container">`;
    for (let i = 0; i < numMatches; i++) {
        html += `
            <div style="background: var(--card-bg); border: 2px solid var(--border-color); border-radius: 12px; padding: 20px; margin-bottom: 20px; box-shadow: var(--card-shadow);">
                <div style="font-weight: bold; margin-bottom: 15px; color: var(--primary); font-size: 16px; display: flex; align-items: center; gap: 8px;">
                    <span style="background: var(--primary); color: white; width: 28px; height: 28px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 14px;">${i + 1}</span>
                    Match ${i + 1}
                </div>
                <div style="display: grid; grid-template-columns: 1fr auto 1fr; gap: 15px; align-items: center;">
                    <select id="match-${i}-a" class="modal-select" style="width: 100%; padding: 10px 14px; border: 2px solid var(--border-color); border-radius: 8px; font-size: 14px; background: var(--input-bg); color: var(--text-main);">
                        ${generateTeamOptions()}
                    </select>
                    <span style="font-weight: bold; color: var(--primary); font-size: 16px; background: var(--active-bg); padding: 8px 12px; border-radius: 20px;">VS</span>
                    <select id="match-${i}-b" class="modal-select" style="width: 100%; padding: 10px 14px; border: 2px solid var(--border-color); border-radius: 8px; font-size: 14px; background: var(--input-bg); color: var(--text-main);">
                        ${generateTeamOptions()}
                    </select>
                </div>
            </div>`;
    }
    html += `
            </div>
        </div>
        <div class="modal-footer" style="display: flex; gap: 12px; margin-top: 25px; padding-top: 20px; border-top: 2px solid var(--border-color);">
            <button data-action="finalizePairing" data-params="[${numMatches}]" style="flex: 1; background: var(--success); color: white; border: none; padding: 12px 0; border-radius: 8px; font-weight: bold; cursor: pointer; transition: background 0.2s;" onmouseover="this.style.background='#15803d'" onmouseout="this.style.background='var(--success)'">✅ Create Round</button>
            <button data-action="closeRoundGenModal" style="flex: 1; background: var(--danger); color: white; border: none; padding: 12px 0; border-radius: 8px; font-weight: bold; cursor: pointer; transition: background 0.2s;" onmouseover="this.style.background='#b91c1c'" onmouseout="this.style.background='var(--danger)'">❌ Cancel</button>
        </div>
    `;

    modal.innerHTML = html;

    const selects = modal.querySelectorAll('select[id^="match-"]');
    selects.forEach(select => {
        select.addEventListener('change', updatePairingDropdowns);
    });

    setTimeout(() => {
        updatePairingDropdowns();
    }, 100);
}

function generateTeamOptions() {
    let html = '<option value="">-- Select Team --</option>';
    pairingState.teams.forEach(team => {
        html += `<option value="${team}">${team}</option>`;
    });
    return html;
}

function updatePairingDropdowns() {
    const allSelects = Array.from(document.querySelectorAll('[id^="match-"]'));
    if (!allSelects.length) return;

    // Collect all currently selected teams across ALL dropdowns
    const selectedMap = new Map(); // selectId -> selectedValue
    allSelects.forEach(select => {
        if (select && select.value) selectedMap.set(select.id, select.value);
    });

    // For each dropdown, rebuild its options to EXCLUDE teams picked by OTHER dropdowns
    allSelects.forEach(currentSelect => {
        if (!currentSelect) return;
        const myId = currentSelect.id;
        const myValue = currentSelect.value;

        // Teams taken by OTHER selects
        const takenByOthers = new Set();
        selectedMap.forEach((val, id) => {
            if (id !== myId && val) takenByOthers.add(val);
        });

        // Rebuild options: keep placeholder + teams not taken by others
        const placeholder = `<option value="">-- Select Team --</option>`;
        const teamOpts = pairingState.teams
            .filter(team => !takenByOthers.has(team) || team === myValue)
            .map(team => `<option value="${team}" ${team === myValue ? 'selected' : ''}>${team}</option>`)
            .join('');

        currentSelect.innerHTML = placeholder + teamOpts;
    });

    // Track used teams
    const selectedTeams = new Set();
    allSelects.forEach(s => { if (s && s.value) selectedTeams.add(s.value); });
    pairingState.usedTeams = selectedTeams;
}

export async function finalizePairing(numMatches) {
    const matches = [];
    for (let i = 0; i < numMatches; i++) {
        const teamA = document.getElementById(`match-${i}-a`).value;
        const teamB = document.getElementById(`match-${i}-b`).value;
        if (!teamA || !teamB) {
            await showAlertModal("Incomplete", `Please complete all pairings. Match ${i + 1} is incomplete.`);
            return;
        }
        if (teamA === teamB) {
            await showAlertModal("Invalid Pairing", `Match ${i + 1}: Cannot pair a team with itself.`);
            return;
        }
        matches.push({
            id: i + 1,
            type: "normal",
            schedule: { date: "Pending", time: "TBD", location: "Maths Lab" },
            teamA: { name: teamA, points: null },
            teamB: { name: teamB, points: null },
            winner: null
        });
    }

    const usedTeams = new Set();
    matches.forEach(m => {
        usedTeams.add(m.teamA.name);
        usedTeams.add(m.teamB.name);
    });
    if (usedTeams.size !== pairingState.teams.length) {
        await showAlertModal("Invalid Pairing", "All qualified teams must be paired exactly once.");
        return;
    }

    const currentData = store.getCurrentData();
    const currentRoundName = currentData.rounds[pairingState.sourceRoundIdx].name;
    // Calculate new round ID before calling modal
    const newRoundId = currentData.rounds.length + 1;

    const userConfirmed = await showCriticalActionModal(currentRoundName, newRoundId, matches.length);
    if (!userConfirmed) {
        showStatus("Round generation cancelled", "#64748b");
        return;
    }

    saveHistorySnapshot();

    const newRound = {
        id: newRoundId,
        name: `Round ${newRoundId}`,
        status: "active",
        matches: matches
    };
    currentData.rounds[pairingState.sourceRoundIdx].status = "locked";
    currentData.rounds.push(newRound);

    closeRoundGenModal();
    renderForm();
    updateSidebarStats();

    if (window.KSSS_UI_HOOKS?.saveToGitHub) {
        await window.KSSS_UI_HOOKS.saveToGitHub();
    } else {
        await saveToGitHub();
    }
    showStatus(`✅ Round ${newRoundId} created & saved!`, "#16a34a");
}