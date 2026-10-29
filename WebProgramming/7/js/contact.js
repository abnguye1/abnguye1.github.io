/**
 * Instrument History Explorer - Contact Us page
 * Saves contact form submissions to the Firebase Realtime Database under
 * /messages and confirms to the user that the message was stored.
 */

import { ref, push, serverTimestamp } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-database.js";
import { db } from "./firebase-init.js";
import { requireUser } from "./session.js";
import { setBusy, showMessage, clearMessage, describeError } from "./ui.js";

const contactForm = document.getElementById("contactForm");
const contactMessage = document.getElementById("contactMessage");
const { senderName, senderEmail, messageTopic, messageBody } = contactForm.elements;

/**
 * Validates the form and stores the submission in the database.
 * @param {import("firebase/auth").User} user - The signed-in user.
 * @param {SubmitEvent} event - Contact form submit event.
 */
async function handleContactSubmit(user, event) {
    event.preventDefault();
    clearMessage(contactMessage);

    const submitButton = contactForm.querySelector("button[type='submit']");
    const submission = {
        name: senderName.value.trim(),
        email: senderEmail.value.trim(),
        topic: messageTopic.value,
        message: messageBody.value.trim(),
        uid: user.uid,
        // Filled in by Firebase's server clock, so it can't be faked
        createdAt: serverTimestamp()
    };

    if (!submission.name || !submission.message) {
        showMessage(contactMessage, "Please fill in your name and a message before submitting.", "error");
        return;
    }

    setBusy(submitButton, true, "Sending message...");

    try {
        // push() saves the message under a new unique key
        const savedRef = await push(ref(db, "messages"), submission);
        const topicLabel = messageTopic.selectedOptions[0].text;
        const referenceCode = savedRef.key.slice(-6).toUpperCase();

        contactForm.reset();
        senderEmail.value = user.email;
        showMessage(
            contactMessage,
            `Thanks, ${submission.name}! Your "${topicLabel}" message was received and saved (reference #${referenceCode}). We'll reply to ${submission.email}.`,
            "success"
        );
    } catch (error) {
        showMessage(contactMessage, `Your message could not be sent: ${describeError(error)}`, "error");
    } finally {
        setBusy(submitButton, false);
    }
}

requireUser().then((user) => {
    senderEmail.value = user.email;
    contactForm.addEventListener("submit", (event) => handleContactSubmit(user, event));
});
