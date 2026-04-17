import { store } from '../core/store.js';
import { initializePagination } from './pagination.js';
import { showStatus } from '../utils/dom.js';
import { CONFIG } from '../core/config.js';

export function populateRoundFilter() {
    const roundFilter = document.getElementById("round-filter");
    if (!roundFilter || !store.getCurrentData()) return;
    while (roundFilter.firstChild) roundFilter.removeChild(roundFilter.firstChild);
    const allOption = document.createElement("option");
    allOption.value = "all";
    allOption.textContent = "All Rounds";
    roundFilter.appendChild(allOption);
    store.getCurrentData().rounds.forEach((round, idx) => {
        const option = document.createElement("option");
        option.value = idx;
        option.textContent = round.name;
        roundFilter.appendChild(option);
    });
}

export function filterMatches() {
    const searchTerm = document.getElementById("match-search")?.value.toLowerCase() || "";
    const statusFilter = document.getElementById("status-filter")?.value || "all";
    const roundFilter = document.getElementById("round-filter")?.value || "all";

    const cards = document.querySelectorAll(".match-card");
    const dividers = document.querySelectorAll(".round-divider");

    let visibleCount = 0;
    const roundsWithMatches = new Set();

    // Build a fast lookup: "roundIdx-matchIdx" → { nameA, nameB }
    // so we don't re-query the store on every card during filtering.
    const currentData = store.getCurrentData();
    const nameMap = {};
    if (currentData) {
        currentData.rounds.forEach((round, rIdx) => {
            (round.matches || []).forEach((m, mIdx) => {
                nameMap[`${rIdx}-${mIdx}`] = {
                    a: (m.teamA?.name || "").toLowerCase(),
                    b: (m.teamB?.name || "").toLowerCase()
                };
            });
        });
    }

    cards.forEach((card) => {
        const roundIdx = parseInt(card.dataset.roundIdx);
        // data-match-idx is set by createMatchCard in render.js
        const matchIdx  = parseInt(card.dataset.matchIdx ?? 0);
        const names     = nameMap[`${roundIdx}-${matchIdx}`] || { a: "", b: "" };
        const teamAName = names.a;
        const teamBName = names.b;

        let matchStatus = "pending";
        if (card.classList.contains("locked")) matchStatus = "locked";
        else if (card.classList.contains("completed")) matchStatus = "completed";
        else if (card.classList.contains("in-progress")) matchStatus = "in-progress";

        const matchesSearch = searchTerm === "" || teamAName.includes(searchTerm) || teamBName.includes(searchTerm);
        const matchesStatus = statusFilter === "all" || matchStatus === statusFilter;
        const matchesRound = roundFilter === "all" || roundIdx === parseInt(roundFilter);

        if (matchesSearch && matchesStatus && matchesRound) {
            card.style.display = "";
            roundsWithMatches.add(roundIdx);
            visibleCount++;
        } else {
            card.style.display = "none";
        }
    });

    dividers.forEach((divider, idx) => {
        if (roundsWithMatches.has(idx)) {
            divider.style.display = "";
        } else {
            divider.style.display = "none";
        }
    });

    const matchesList = document.getElementById("matches-list");
    let noResultsMsg = document.getElementById("no-results-message");

    if (visibleCount === 0 && matchesList) {
        if (!noResultsMsg) {
            noResultsMsg = document.createElement("div");
            noResultsMsg.id = "no-results-message";
            noResultsMsg.style.cssText = "text-align: center; padding: 40px; color: #64748b; font-size: 16px;";
            noResultsMsg.innerHTML = `
                <div style="font-size: 48px; margin-bottom: 10px;">🔍</div>
                <p style="margin: 0; font-weight: 600;">No matches found</p>
                <p style="margin: 5px 0 0; font-size: 14px;">Try adjusting your search or filters</p>
            `;
            matchesList.appendChild(noResultsMsg);
        }
        noResultsMsg.style.display = "block";
    } else if (noResultsMsg) {
        noResultsMsg.style.display = "none";
    }

    initializePagination();
    if (CONFIG.debug) console.log(`🔍 Filter applied: ${visibleCount} matches visible`);
}

export function clearFilters() {
    document.getElementById("match-search").value = "";
    document.getElementById("status-filter").value = "all";
    document.getElementById("round-filter").value = "all";
    filterMatches();
    showStatus("✅ Filters cleared", "#16a34a");
}