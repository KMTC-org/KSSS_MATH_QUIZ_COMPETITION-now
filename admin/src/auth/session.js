// Session storage helpers
export function getGithubToken() {
    return sessionStorage.getItem("githubToken");
}

export function setGithubToken(token) {
    if (token) sessionStorage.setItem("githubToken", token);
    else sessionStorage.removeItem("githubToken");
}

export function getAdminUser() {
    return sessionStorage.getItem("adminUser");
}

export function setAdminUser(user) {
    if (user) sessionStorage.setItem("adminUser", user);
    else sessionStorage.removeItem("adminUser");
}

export function getSecureAdminRole() {
    return sessionStorage.getItem("secureAdminRole");
}

export function setSecureAdminRole(roleObj) {
    if (roleObj) sessionStorage.setItem("secureAdminRole", JSON.stringify(roleObj));
    else sessionStorage.removeItem("secureAdminRole");
}

export function clearSession() {
    sessionStorage.removeItem("githubToken");
    sessionStorage.removeItem("adminUser");
    sessionStorage.removeItem("currentAdminRole");
    sessionStorage.removeItem("secureAdminRole");
}