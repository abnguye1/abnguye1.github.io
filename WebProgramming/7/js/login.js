/**
 * Instrument History Explorer - login page (Google sign-in)
 * Signs the user in with their Google account through Firebase Authentication.
 * A user's first Google sign-in also creates their Firebase account (sign up),
 * then the user is returned to the page they were trying to reach.
 */

import { GoogleAuthProvider, signInWithPopup, getAdditionalUserInfo } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js";
import { auth } from "./firebase-init.js";
import { setBusy, showMessage, clearMessage, describeError } from "./ui.js";

// Only these local pages may be used as a post-login destination
const ALLOWED_NEXT_PAGES = ["index.html", "explorer.html", "concepts.html", "contact.html", "account.html"];
const REDIRECT_DELAY_MS = 1200;

const params = new URLSearchParams(window.location.search);
const requestedPage = params.get("next");
// The page name must be on the list; a query string after it (e.g. ?family=brass) is kept
const requestedFile = (requestedPage || "").split("?")[0];
const nextPage = ALLOWED_NEXT_PAGES.includes(requestedFile) ? requestedPage : "explorer.html";

const pageMessage = document.getElementById("pageMessage");
const googleButton = document.getElementById("googleSignInButton");
const loginMessage = document.getElementById("loginMessage");

// Always show Google's account chooser so users can switch accounts
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

/**
 * Opens the Google sign-in popup and reports whether this was a new account.
 */
async function handleGoogleSignIn() {
    clearMessage(loginMessage);
    setBusy(googleButton, true, "Waiting for Google...");

    try {
        const result = await signInWithPopup(auth, googleProvider);
        const { isNewUser } = getAdditionalUserInfo(result);
        const name = result.user.displayName || result.user.email;
        const greeting = isNewUser
            ? `Account created. Welcome, ${name}!`
            : `Welcome back, ${name}!`;

        showMessage(loginMessage, `${greeting} Taking you there now...`, "success");
        window.setTimeout(() => {
            window.location.href = nextPage;
        }, REDIRECT_DELAY_MS);
    } catch (error) {
        setBusy(googleButton, false);
        showMessage(loginMessage, describeError(error), "error");
    }
}

/**
 * Shows context about why the visitor is here (redirected, logged out, already signed in).
 */
async function renderPageContext() {
    if (params.has("loggedOut")) {
        showMessage(pageMessage, "You have been logged out. See you next time!", "success");
    } else if (requestedPage) {
        showMessage(pageMessage, "Please log in with Google to continue exploring.", "info");
    }

    // Wait for Firebase to restore any saved login before checking
    await auth.authStateReady();
    if (auth.currentUser) {
        showMessage(pageMessage, `You're already logged in as ${auth.currentUser.email}. Continue to the explorer or use the Log Out button above.`, "info");
    }
}

googleButton.addEventListener("click", handleGoogleSignIn);
renderPageContext();
