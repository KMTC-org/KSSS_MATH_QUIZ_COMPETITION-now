import { store } from '../core/store.js';
import { showStatus } from '../utils/dom.js';
import { CONFIG } from '../core/config.js';
import { showAlertModal } from '../ui/modals.js'; // ADDED

export async function exportToCSV() {
    const currentData = store.getCurrentData();
    if (!currentData) {
        await showAlertModal("No Data", "No data loaded. Please load tournament data first.");
        return;
    }

    // CSV Headers
    let csv = "Round,Match ID,Team A,Score A,Team B,Score B,Winner,Date,Time,Location,Status\n";

    // Add data rows
    currentData.rounds.forEach((round) => {
        round.matches.forEach((match) => {
            const row = [
                `"${round.name}"`,
                match.id || "",
                `"${match.teamA.name}"`,
                match.teamA.points ?? "",
                `"${match.teamB.name}"`,
                match.teamB.points ?? "",
                `"${match.winner ?? "Pending"}"`,
                `"${match.schedule.date ?? "TBD"}"`,
                `"${match.schedule.time ?? "TBD"}"`,
                `"${match.schedule.location ?? "TBD"}"`,
                round.status === "locked" ? "Locked" : "Active"
            ];
            csv += row.join(",") + "\n";
        });
    });

    // Create download link
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `KSSS_Tournament_Grade${currentData.grade}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showStatus("✅ CSV exported successfully!", "#16a34a");
    if (CONFIG.debug) console.log("📊 CSV export completed");
}