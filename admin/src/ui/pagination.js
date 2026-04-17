import { CONSTANTS } from '../utils/constants.js';
import { store } from '../core/store.js';

export function changePage(page) {
    const totalPages = store.getTotalPages();
    if (page < 1 || page > totalPages) return;
    store.setCurrentPage(page, 'pagination.changePage');
    displayCurrentPage();
}

export function displayCurrentPage() {
    const currentPage = store.getCurrentPage();
    const startIdx = (currentPage - 1) * CONSTANTS.MATCHES_PER_PAGE;
    const endIdx = startIdx + CONSTANTS.MATCHES_PER_PAGE;
    const matchCards = document.querySelectorAll('.match-card');
    matchCards.forEach((card, idx) => {
        if (idx >= startIdx && idx < endIdx) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
    updatePaginationControls();
    const matchesList = document.getElementById('matches-list');
    if (matchesList) matchesList.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export function updatePaginationControls() {
    const paginationContainer = document.getElementById('pagination-controls');
    if (!paginationContainer) return;
    const totalPages = store.getTotalPages();
    const currentPage = store.getCurrentPage();
    if (totalPages <= 1) {
        paginationContainer.style.display = 'none';
        return;
    }
    paginationContainer.style.display = 'flex';
    let html = `
        <button data-action="changePage" data-params="[${currentPage - 1}]" ${currentPage === 1 ? 'disabled' : ''} 
                style="padding: 8px 16px; border-radius: 8px; border: 2px solid var(--border-color); 
                       background: var(--card-bg); color: var(--text-main); cursor: pointer;">
            ← Previous
        </button>
        <div style="display: flex; gap: 8px; align-items: center;">
    `;
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    if (endPage - startPage < maxVisiblePages - 1) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    if (startPage > 1) {
        html += `<button data-action="changePage" data-params="[1]" style="padding: 8px 12px; border-radius: 8px; 
                        border: 2px solid var(--border-color); background: var(--card-bg); 
                        color: var(--text-main); cursor: pointer;">1</button>`;
        if (startPage > 2) html += `<span style="color: var(--text-muted);">...</span>`;
    }
    for (let i = startPage; i <= endPage; i++) {
        const isActive = i === currentPage;
        html += `
            <button data-action="changePage" data-params="[${i}]" 
                    style="padding: 8px 12px; border-radius: 8px; 
                           border: 2px solid ${isActive ? 'var(--primary)' : 'var(--border-color)'}; 
                           background: ${isActive ? 'var(--primary)' : 'var(--card-bg)'}; 
                           color: ${isActive ? 'white' : 'var(--text-main)'}; 
                           cursor: pointer; font-weight: ${isActive ? 'bold' : 'normal'};">
                ${i}
            </button>
        `;
    }
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) html += `<span style="color: var(--text-muted);">...</span>`;
        html += `<button data-action="changePage" data-params="[${totalPages}]" style="padding: 8px 12px; border-radius: 8px; 
                        border: 2px solid var(--border-color); background: var(--card-bg); 
                        color: var(--text-main); cursor: pointer;">${totalPages}</button>`;
    }
    html += `
        </div>
        <button data-action="changePage" data-params="[${currentPage + 1}]" ${currentPage === totalPages ? 'disabled' : ''}
                style="padding: 8px 16px; border-radius: 8px; border: 2px solid var(--border-color); 
                       background: var(--card-bg); color: var(--text-main); cursor: pointer;">
            Next →
        </button>
        <div style="margin-left: 16px; color: var(--text-muted); font-size: 14px;">
            Page ${currentPage} of ${totalPages}
        </div>
    `;
    paginationContainer.innerHTML = html;
}

export function initializePagination() {
    const visibleCount = Array.from(document.querySelectorAll('.match-card')).filter(card => {
        return card.style.display !== 'none';
    }).length;
    store.setTotalPages(Math.ceil(visibleCount / CONSTANTS.MATCHES_PER_PAGE), 'pagination.init');
    store.setCurrentPage(1, 'pagination.init');
    displayCurrentPage();
}