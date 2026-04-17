import { AdminSecurity } from '../auth/adminSecurity.js';
import { ROLE_ABSOLUTE } from '../auth/roles.js';
import { store } from '../core/store.js';
import { logStructuralAction } from '../utils/logger.js';
import { hashString } from '../utils/security.js';
import { renderForm } from '../ui/render.js';
import { showSwapModal, cancelTeamSwap, showStructuralAuthModal, showAlertModal } from '../ui/modals.js'; // UPDATED
import { showStatus } from '../utils/dom.js';
import { saveToGitHub } from '../api/github.js';

export async function unlockTeam(rIdx, mIdx, side) { // MADE ASYNC
    if (!store.getSwitchModeActive() || store.getSwitchModeRoundIdx() !== rIdx) return;
    const unlockedTeams = store.getUnlockedTeams();
    if (unlockedTeams.length === 2) {
        await showAlertModal("Team Unlock", "You can only unlock two teams at a time. Re-lock one to select another.");
        return;
    }
    if (unlockedTeams.some(t => t.rIdx === rIdx && t.mIdx === mIdx && t.side === side)) return;
    unlockedTeams.push({ rIdx, mIdx, side });
    store.setUnlockedTeams(unlockedTeams, 'teamSwitch.unlock');
    renderForm();
    if (unlockedTeams.length === 2) {
        showSwapModal();
    }
}

export async function relockTeam(rIdx, mIdx, side) { // MADE ASYNC
    let unlockedTeams = store.getUnlockedTeams();
    unlockedTeams = unlockedTeams.filter(t => !(t.rIdx === rIdx && t.mIdx === mIdx && t.side === side));
    store.setUnlockedTeams(unlockedTeams, 'teamSwitch.relock');
    renderForm();
}

export async function activateTeamSwitchMode(rIdx) {
    console.log('activateTeamSwitchMode called, role:', AdminSecurity.getRole());
    if (AdminSecurity.getRole() !== ROLE_ABSOLUTE) {
        console.log('Role not absolute, aborting');
        return;
    }

    showStructuralAuthModal(async (code) => {
        const expectedHash = "45888f0c28b9e1007b74238f0dd90312efe9b3c4298957c80079845ed7725384";
        const codeHash = await hashString(code);
        if (codeHash !== expectedHash) {
            await showAlertModal("Access Denied", "❌ Incorrect password. Access denied.");
            return;
        }
        store.setSwitchModeActive(true, 'teamSwitch.activate');
        store.setUnlockedTeams([], 'teamSwitch.activate');
        store.setSwitchModeRoundIdx(rIdx, 'teamSwitch.activate');
        renderForm();
        console.log('Team switch mode activated for round', rIdx);
    });
}

export function exitTeamSwitchMode() {
    store.setSwitchModeActive(false, 'teamSwitch.exit');
    store.setUnlockedTeams([], 'teamSwitch.exit');
    store.setSwitchModeRoundIdx(null, 'teamSwitch.exit');
    renderForm();
}

export async function confirmTeamSwap() {
    const unlockedTeams = store.getUnlockedTeams();
    const [t1, t2] = unlockedTeams;
    if (AdminSecurity.getRole() !== ROLE_ABSOLUTE) {
        await showAlertModal("Permission Denied", "🚫 Only the absolute admin can perform this action.");
        cancelTeamSwap();
        return;
    }
    const currentData = store.getCurrentData();
    const round = currentData.rounds[t1.rIdx];
    const m1 = round.matches[t1.mIdx];
    const m2 = round.matches[t2.mIdx];
    const teamA = t1.side === 'A' ? m1.teamA : m1.teamB;
    const teamB = t2.side === 'A' ? m2.teamA : m2.teamB;
    if (teamA.points != null || teamB.points != null || m1.winner || m2.winner) {
        await showAlertModal("Invalid Swap", "❌ Cannot swap teams with recorded scores or completed matches.");
        cancelTeamSwap();
        return;
    }

    const originalTeamA_M1 = t1.side === 'A' ? m1.teamA : m1.teamB;
    const originalTeamB_M2 = t2.side === 'A' ? m2.teamA : m2.teamB;

    if (t1.side === 'A') m1.teamA = teamB; else m1.teamB = teamB;
    if (t2.side === 'A') m2.teamA = teamA; else m2.teamB = teamA;

    logStructuralAction("Team Swap", {
        admin: store.getCurrentUser(),
        timestamp: new Date().toISOString(),
        round: round.name,
        teamA: { name: teamA.name, match: m1.id, side: t1.side },
        teamB: { name: teamB.name, match: m2.id, side: t2.side }
    });

    try {
        showStatus("💾 Saving team swap to GitHub...", "#f59e0b");
        await saveToGitHub();
        showStatus(`✅ Teams swapped successfully: ${teamA.name} ↔ ${teamB.name}`, "#16a34a");
        store.setUnlockedTeams([], 'teamSwap.confirm');
        cancelTeamSwap();
        renderForm();
    } catch (error) {
        if (t1.side === 'A') m1.teamA = originalTeamA_M1; else m1.teamB = originalTeamA_M1;
        if (t2.side === 'A') m2.teamA = originalTeamB_M2; else m2.teamB = originalTeamB_M2;
        if (currentData.structuralLog && currentData.structuralLog.length > 0) {
            currentData.structuralLog.pop();
        }
        showStatus("❌ Swap failed - changes rolled back", "#ef4444");
        await showAlertModal("Save Failed", `Team swap failed to save to GitHub.\n\nError: ${error.message}\n\nThe swap has been rolled back. Please try again.`);
        renderForm();
    }
}