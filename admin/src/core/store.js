class Store {
    constructor() {
        this.state = {
            currentUser: "",
            currentAdminRole: null,
            currentData: null,
            currentSha: "",
            switchModeActive: false,
            unlockedTeams: [],
            switchModeRoundIdx: null,
            currentPage: 1,
            totalPages: 1,
            allMatches: []
        };
        this.listeners = new Set();
        this.changeHistory = [];
    }

    set(key, value, source = 'unknown') {
        if (!this.state.hasOwnProperty(key)) {
            console.warn(`Store: setting unknown key "${key}"`);
        }
        const oldValue = this.state[key];
        this.state[key] = value;

        this.changeHistory.push({
            key,
            oldValue,
            newValue: value,
            source,
            timestamp: new Date().toISOString(),
            stack: new Error().stack
        });

        this.listeners.forEach(listener => listener(key, value, oldValue));
        return value;
    }

    get(key) {
        return this.state[key];
    }

    subscribe(listener) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    getChangeHistory() {
        return this.changeHistory;
    }

    clearHistory() {
        this.changeHistory = [];
    }

    // Convenience methods
    setCurrentUser(user, source) { return this.set('currentUser', user, source); }
    getCurrentUser() { return this.get('currentUser'); }

    setCurrentAdminRole(role, source) { return this.set('currentAdminRole', role, source); }
    getCurrentAdminRole() { return this.get('currentAdminRole'); }

    setCurrentData(data, source) { return this.set('currentData', data, source); }
    getCurrentData() { return this.get('currentData'); }

    setCurrentSha(sha, source) { return this.set('currentSha', sha, source); }
    getCurrentSha() { return this.get('currentSha'); }

    setSwitchModeActive(active, source) { return this.set('switchModeActive', active, source); }
    getSwitchModeActive() { return this.get('switchModeActive'); }

    setUnlockedTeams(teams, source) { return this.set('unlockedTeams', teams, source); }
    getUnlockedTeams() { return this.get('unlockedTeams'); }

    setSwitchModeRoundIdx(idx, source) { return this.set('switchModeRoundIdx', idx, source); }
    getSwitchModeRoundIdx() { return this.get('switchModeRoundIdx'); }

    setCurrentPage(page, source) { return this.set('currentPage', page, source); }
    getCurrentPage() { return this.get('currentPage'); }

    setTotalPages(pages, source) { return this.set('totalPages', pages, source); }
    getTotalPages() { return this.get('totalPages'); }

    setAllMatches(matches, source) { return this.set('allMatches', matches, source); }
    getAllMatches() { return this.get('allMatches'); }
}

export const store = new Store();