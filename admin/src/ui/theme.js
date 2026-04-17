// admin/src/ui/theme.js
// Handles dark mode toggling, sidebar toggle, role badge display

export function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    let theme = savedTheme;
    if (!theme) {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        theme = prefersDark ? 'dark' : 'light';
    }
    document.documentElement.setAttribute('data-theme', theme);
    updateThemeIcon(theme);
}

export function toggleDarkMode() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
}

function updateThemeIcon(theme) {
    const icon = document.getElementById('theme-icon');
    if (icon) icon.textContent = theme === 'dark' ? '☀️' : '🌙';
}

export function toggleSidebar() {
    const sidebar = document.getElementById('tournament-sidebar');
    const overlay = document.querySelector('.sidebar-overlay');
    if (sidebar && overlay) {
        sidebar.classList.toggle('open');
        overlay.classList.toggle('open');
    }
}

// FIX: Read role from the store (via window.__store) instead of
// sessionStorage.currentAdminRole which is never written anywhere.
export function showRoleBadge() {
    const badge = document.getElementById('role-badge');
    if (!badge) return;

    // window.__store is set in index.js: window.__store = store
    const role = window.__store?.getCurrentAdminRole?.() ?? null;

    if (role === 'absolute') {
        badge.textContent = 'Absolute Admin';
        badge.style.background = '#0d47a1';
        badge.style.display = 'inline-block';
    } else if (role === 'limited') {
        badge.textContent = 'Limited Admin';
        badge.style.background = '#64748b';
        badge.style.display = 'inline-block';
    } else {
        badge.style.display = 'none';
    }
}

// Close sidebar when clicking main content on mobile
export function setupMobileSidebarClose() {
    if (window.innerWidth <= 768) {
        const mainContent = document.querySelector('.main-content');
        if (mainContent) {
            mainContent.addEventListener('click', () => {
                const sidebar = document.getElementById('tournament-sidebar');
                const overlay = document.querySelector('.sidebar-overlay');
                if (sidebar && overlay && sidebar.classList.contains('open')) {
                    sidebar.classList.remove('open');
                    overlay.classList.remove('open');
                }
            });
        }
    }
}
