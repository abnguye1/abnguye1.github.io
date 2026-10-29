/**
 * Instrument History Explorer - account page
 * Shows the signed-in Google user's details. Google owns the password for
 * Google Sign-In accounts, so "Change Password" reveals instructions and a
 * link to Google's security settings instead of a password form.
 */

import { requireUser } from "./session.js";

const changePasswordButton = document.getElementById("changePasswordButton");
const passwordInfo = document.getElementById("passwordInfo");

/**
 * Shows or hides the Google password instructions.
 */
function togglePasswordInfo() {
    passwordInfo.hidden = !passwordInfo.hidden;
    changePasswordButton.setAttribute("aria-expanded", String(!passwordInfo.hidden));

    // Move keyboard focus to the Google link when the message opens
    if (!passwordInfo.hidden) {
        passwordInfo.querySelector("a").focus();
    }
}

requireUser().then((user) => {
    document.getElementById("accountName").textContent = user.displayName || "Not provided";
    document.getElementById("accountEmail").textContent = user.email;
    changePasswordButton.addEventListener("click", togglePasswordInfo);
});
