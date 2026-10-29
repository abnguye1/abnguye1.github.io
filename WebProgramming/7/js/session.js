/**
 * Instrument History Explorer - session handling (loaded on every page)
 * Keeps the navigation in sync with the signed-in user, provides Account and
 * Log Out, and protects pages marked with <body data-protected> so only
 * signed-in users can view them.
 */

import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js";
import { auth } from "./firebase-init.js";
import { setBusy } from "./ui.js";

const isProtectedPage = document.body.hasAttribute("data-protected");

/**
 * Resolves with the signed-in user once Firebase has restored the session.
 * A signed-out visitor on a protected page is redirected to the login page
 * instead, so for them this never resolves and page code never runs.
 * @returns {Promise<import("firebase/auth").User>}
 */
export async function requireUser() {
    await auth.authStateReady();
    return auth.currentUser || new Promise(() => {});
}

/**
 * Signs the user out and sends them to the login page with a confirmation.
 * @param {MouseEvent} event - Click event from the Log Out button.
 */
async function handleLogOut(event) {
    const button = event.currentTarget;
    setBusy(button, true, "Logging out...");

    try {
        await signOut(auth);
        window.location.href = "login.html?loggedOut=1";
    } catch (error) {
        setBusy(button, false);
        button.textContent = "Log out failed. Retry";
    }
}

/**
 * Swaps the navigation Log In link for Account and Log Out when signed in.
 * @param {import("firebase/auth").User|null} user - Current user or null.
 */
function renderNavAccount(user) {
    const loginLink = document.getElementById("navAccount");
    document.querySelectorAll("#navAccountPage, #navLogOut").forEach((element) => element.remove());
    loginLink.hidden = Boolean(user);

    if (!user) {
        return;
    }

    const accountLink = document.createElement("a");
    accountLink.href = "account.html";
    accountLink.id = "navAccountPage";
    accountLink.textContent = "Account";
    if (window.location.pathname.endsWith("/account.html")) {
        accountLink.setAttribute("aria-current", "page");
    }

    const logOutButton = document.createElement("button");
    logOutButton.type = "button";
    logOutButton.id = "navLogOut";
    logOutButton.className = "nav-login nav-logout";
    logOutButton.textContent = "Log Out";
    // Screen readers still hear which account is signed in
    logOutButton.setAttribute("aria-label", `Log out, signed in as ${user.displayName || user.email}`);
    logOutButton.addEventListener("click", handleLogOut);

    loginLink.after(accountLink, logOutButton);
}

// Runs on page load and again whenever the user logs in or out
onAuthStateChanged(auth, (user) => {
    renderNavAccount(user);

    if (!isProtectedPage) {
        return;
    }

    if (user) {
        document.body.classList.remove("auth-pending");
    } else {
        // Remember this page (and any ?family=...) so login can send the user back
        const currentPage = window.location.pathname.split("/").pop() + window.location.search;
        window.location.replace(`login.html?next=${encodeURIComponent(currentPage)}`);
    }
});
