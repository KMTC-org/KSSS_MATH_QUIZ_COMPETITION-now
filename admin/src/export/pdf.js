// admin/src/export/pdf.js
import { store } from '../core/store.js';
import { showStatus } from '../utils/dom.js';
import { CONFIG } from '../core/config.js';
import { showAlertModal } from '../ui/modals.js';

// URL of the watermark image. Change this string when you provide the final watermark!
const WATERMARK_IMAGE_URL = 'static/images/MTC--LOGO--NO--B.webp';

// Fetch an image and return it as a base64 data URL
async function getImageDataURL(url) {
  try {
    const res  = await fetch(url);
    if (!res.ok) throw new Error('Image fetch failed');
    const blob = await res.blob();
    return new Promise(resolve => {
      const reader     = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror   = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function exportToPDF() {
  const currentData = store.getCurrentData();
  if (!currentData) {
    await showAlertModal("No Data", "No data loaded. Please load tournament data first.");
    return;
  }

  const printWindow = window.open("", "_blank", "width=900,height=700");
  if (!printWindow) {
    await showAlertModal("Pop-up Blocked", "Pop-up blocked! Please allow pop-ups for this site to export PDF.");
    return;
  }

  // Fetch logo and watermark so the print window can embed them as base64
  const [logoDataURL, watermarkDataURL] = await Promise.all([
    getImageDataURL('../static/images/Kotusss_logo.png'),
    getImageDataURL(WATERMARK_IMAGE_URL)
  ]);

  const smallWatermarkHTML = watermarkDataURL
    ? `<img src="${watermarkDataURL}" alt="KMTC Badge" class="header-watermark-badge">`
    : "";

  // ── Stats ────────────────────────────────────────────────────
  const totalMatches     = currentData.rounds.reduce((s, r) => s + r.matches.length, 0);
  const completedMatches = currentData.rounds.reduce(
    (s, r) => s + r.matches.filter(m => m.winner && m.winner !== "Pending").length, 0
  );

  // ── Round sections ────────────────────────────────────────────
  const roundSections = currentData.rounds.map((round, rIdx) => {
    const rows = round.matches.map(match => {
      const isPending = !match.winner || match.winner === "Pending";
      const winA = match.winner === match.teamA.name;
      const winB = match.winner === match.teamB.name;
      
      return `
        <tr>
          <td><strong>#${match.id}</strong>${match.type === "best_loser" ? " (Playoff)" : ""}</td>
          <td class="${winA ? 'winner-highlight' : ''}">${match.teamA.name}</td>
          <td class="score-cell ${winA ? 'winner-highlight' : ''}">${match.teamA.points ?? "—"}</td>
          <td class="${winB ? 'winner-highlight' : ''}">${match.teamB.name}</td>
          <td class="score-cell ${winB ? 'winner-highlight' : ''}">${match.teamB.points ?? "—"}</td>
          <td class="${isPending ? "pending-cell" : "winner-cell"}">${isPending ? "Pending" : "🏆 " + match.winner}</td>
          <td class="schedule-cell">${match.schedule.date ?? "TBD"}${match.schedule.time ? "<br><small>" + match.schedule.time + "</small>" : ""}</td>
        </tr>`;
    }).join("");

    return `
      <div class="round-section" id="rs-${rIdx}">
        <div class="round-header">
          <span class="round-name">${round.name}</span>
          <span class="round-status ${round.status === "locked" ? "locked" : "active"}">
            ${round.status === "locked" ? "🔒 Archived" : "🔓 Active"}
          </span>
        </div>
        <table>
          <thead>
            <tr>
              <th>Match</th>
              <th>Team A</th>
              <th>Score</th>
              <th>Team B</th>
              <th>Score</th>
              <th>Winner</th>
              <th>Schedule</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  }).join("");

  // ── Full HTML document ─────────────────────────────────────────
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>KSSS Math Quiz — Grade ${currentData.grade} Report</title>
  <style>
    /* ── Reset & page ─────────────────────────────────────── */
    @page { size: A4; margin: 1.2cm; }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      font-size: 12.5pt;
      line-height: 1.55;
      color: #1a1a1a;
      background: #fff;
      position: relative;
    }

    /* ── Print Options (Hidden on Print) ──────────────────── */
    .print-options {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      padding: 15px;
      border-radius: 8px;
      margin-bottom: 20px;
      display: flex;
      flex-wrap: wrap;
      gap: 15px;
      align-items: center;
    }
    .print-options h3 { margin: 0; font-size: 15px; color: #0f172a; }
    .round-toggle {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 15px;
      color: #334155;
      cursor: pointer;
    }
    .round-toggle input { cursor: pointer; transform: scale(1.2); }

    /* ── All content sits above the watermark ─────────────── */
    .page-content { position: relative; z-index: 1; }

    /* ── Header ───────────────────────────────────────────── */
    .doc-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 3px solid #0D1B5E;
      padding-bottom: 16px;
      margin-bottom: 24px;
    }
    .doc-header-left {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .header-logo {
      width: 64px;
      height: 64px;
      object-fit: contain;
    }
    .header-text h1 {
      font-size: 20pt;
      font-weight: 800;
      color: #0D1B5E;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      line-height: 1.1;
    }
    .header-text p {
      font-size: 11pt;
      color: #555;
      margin-top: 4px;
      line-height: 1.1;
    }
    .header-meta {
      text-align: right;
      font-size: 11pt;
      color: #555;
      line-height: 1.6;
    }
    .header-watermark-badge {
      width: 44px;
      height: 44px;
      object-fit: contain;
    }
    .header-meta .grade-badge {
      display: inline-block;
      background: #0D1B5E;
      color: #fff;
      padding: 5px 16px;
      border-radius: 20px;
      font-weight: 800;
      font-size: 11.5pt;
    }

    /* ── Navy rule ────────────────────────────────────────── */
    .navy-rule {
      border: none;
      border-top: 8px solid #0D1B5E;
      margin: 0 0 24px 0;
    }

    /* ── Summary box ─────────────────────────────────────── */
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      margin-bottom: 28px;
    }
    .summary-card {
      border: 1.5px solid #CCCCCC;
      border-radius: 8px;
      padding: 14px 10px;
      text-align: center;
      background: #EEF0FB;
    }
    .summary-card .value {
      font-size: 26pt;
      font-weight: 800;
      color: #0D1B5E;
      line-height: 1;
    }
    .summary-card .label {
      font-size: 10pt;
      color: #555;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      margin-top: 6px;
      font-weight: 700;
    }

    /* ── Round sections ───────────────────────────────────── */
    .round-section {
      margin-bottom: 30px;
      page-break-inside: avoid;
    }
    .round-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: #0D1B5E;
      color: #fff;
      padding: 12px 16px;
      border-radius: 6px 6px 0 0;
      font-weight: 800;
      font-size: 13pt;
    }
    .round-status {
      font-size: 10pt;
      font-weight: 700;
      padding: 3px 12px;
      border-radius: 12px;
    }
    .round-status.locked { background: rgba(255,255,255,0.15); }
    .round-status.active { background: rgba(255,255,255,0.25); }

    /* ── Table ────────────────────────────────────────────── */
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11pt;
    }
    thead tr { background: #EEF0FB; }
    th {
      padding: 10px 12px;
      text-align: left;
      color: #0D1B5E;
      font-weight: 800;
      border: 1px solid #CCCCCC;
      font-size: 10.5pt;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    td {
      padding: 10px 12px;
      border: 1px solid #CCCCCC;
      vertical-align: middle;
    }
    tbody tr:nth-child(even) { background: #F8FAFC; }
    tbody tr:hover { background: #EEF0FB; }

    .score-cell    { text-align: center; font-weight: 700; color: #0D1B5E; }
    
    /* ── WINNER HIGHLIGHT ────────────────────────────────── */
    .winner-highlight {
      color: #15803d !important;
      font-weight: 900 !important;
      background: #dcfce7 !important;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .winner-cell   { font-weight: 900; color: #15803d; font-size: 12pt; }
    .pending-cell  { color: #92400E; font-style: italic; font-weight: 600; }
    .schedule-cell { font-size: 10pt; color: #555; }

    /* ── Motto footer ─────────────────────────────────────── */
    .doc-footer {
      margin-top: 30px;
      padding-top: 12px;
      border-top: 2px solid #CCCCCC;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 9pt;
      color: #555;
    }
    .doc-footer .motto {
      font-style: italic;
      color: #0D1B5E;
      font-weight: 600;
    }

    .print-btn {
      position: fixed;
      top: 14px;
      right: 14px;
      background: #16a34a;
      color: white;
      padding: 10px 22px;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 700;
      font-size: 13px;
      box-shadow: 0 4px 12px rgba(22,163,74,0.3);
      z-index: 100;
    }
    .print-btn:hover { background: #15803d; }

    @media print {
      .print-btn, .print-options { display: none !important; }
      body { margin: 0; }
    }
  </style>
</head>
<body>
  <button class="print-btn" onclick="window.print()">🖨️ Print Document</button>

  <div class="page-content">

    <!-- Interactive Print Options -->
    <div class="print-options no-print">
      <h3>🖨️ Select Rounds to Print:</h3>
      ${currentData.rounds.map((r, i) => `
        <label class="round-toggle">
          <input type="checkbox" checked onchange="document.getElementById('rs-${i}').style.display = this.checked ? 'block' : 'none';">
          ${r.name}
        </label>
      `).join('')}
    </div>

    <!-- Header -->
    <div class="doc-header">
      <div class="doc-header-left">
        ${logoDataURL
          ? `<img src="${logoDataURL}" alt="KSSS Logo" class="header-logo">`
          : ""}
        ${smallWatermarkHTML}
        <div class="header-text">
          <h1>KSSS Maths &amp; Tech Club (KMTC)</h1>
          <p>Kotu Senior Secondary School &middot; Mathematics Quiz Competition</p>
        </div>
      </div>
      <div class="header-meta">
        <div class="grade-badge">Grade ${currentData.grade}</div><br>
        <strong>Tournament Report</strong><br>
        ${new Date().toLocaleDateString("en-GB", { weekday:"long", year:"numeric", month:"long", day:"numeric" })}
      </div>
    </div>

    <!-- Summary -->
    <div class="summary-grid">
      <div class="summary-card">
        <div class="value">${currentData.grade}</div>
        <div class="label">Grade Level</div>
      </div>
      <div class="summary-card">
        <div class="value">${currentData.rounds.length}</div>
        <div class="label">Total Rounds</div>
      </div>
      <div class="summary-card">
        <div class="value">${totalMatches}</div>
        <div class="label">Total Matches</div>
      </div>
      <div class="summary-card">
        <div class="value">${completedMatches}</div>
        <div class="label">Completed</div>
      </div>
    </div>

    <!-- Round sections -->
    ${roundSections}

    <!-- Footer -->
    <div class="doc-footer">
      <span class="motto">&ldquo;Multiply Your Knowledge &middot; Divide Your Doubts&rdquo;</span>
      <span>KMTC Tournament Management System &middot; v${CONFIG.version}</span>
    </div>

  </div>
</body>
</html>`;

  printWindow.document.write(html);
  printWindow.document.close();

  printWindow.onload = () => {
    // Instead of auto-printing instantly, we let them pick their rounds first!
    // They can click the big green "Print Document" button when ready.
  };

  showStatus("✅ PDF report opened in new window", "#16a34a");
  if (CONFIG.debug) console.log("📄 PDF export window opened");
}
