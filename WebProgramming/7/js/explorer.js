/**
 * Instrument History Explorer - Interactive Explorer
 * Loads instrument data from the Firebase Realtime Database (signed-in users
 * only) and walks the user through three steps: family → instrument → details.
 */

import { ref, get } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-database.js";
import { db } from "./firebase-init.js";
import { requireUser } from "./session.js";
import { describeError } from "./ui.js";

const STEP_TITLES = ["Family", "Instrument", "Details"];
const container = document.getElementById("interactiveExplorer");

// Instrument families loaded from the database
let allFamilies = [];

/* ---------- Small DOM helpers ---------- */

/**
 * Creates an element with an optional class and text.
 * @param {string} tag - Element tag name.
 * @param {string} [className] - CSS class(es).
 * @param {string} [text] - Text content.
 * @returns {HTMLElement}
 */
function createElement(tag, className = "", text = "") {
    const element = document.createElement(tag);
    if (className) {
        element.className = className;
    }
    if (text) {
        element.textContent = text;
    }
    return element;
}

/**
 * Creates a <button type="button"> with a click handler.
 * @param {string} text - Visible label.
 * @param {string} className - CSS class(es), or "" for none.
 * @param {Function} onClick - Click handler.
 * @param {string} [ariaLabel] - Fuller label for screen readers.
 * @returns {HTMLButtonElement}
 */
function createButton(text, className, onClick, ariaLabel) {
    const button = createElement("button", className, text);
    button.type = "button";
    button.addEventListener("click", onClick);
    if (ariaLabel) {
        button.setAttribute("aria-label", ariaLabel);
    }
    return button;
}

/**
 * Converts a Realtime Database list (stored as an array or keyed object) to an array.
 * @param {Array|Object|null} value - The value returned by the database.
 * @returns {Array}
 */
function toArray(value) {
    if (!value) {
        return [];
    }
    return Array.isArray(value) ? value.filter(Boolean) : Object.values(value);
}

/* ---------- Shared pieces of each step ---------- */

/**
 * Creates the "Step 1 / 2 / 3" progress indicator.
 * @param {number} activeStep - The current step (1, 2, or 3).
 * @returns {HTMLElement}
 */
function createStepIndicator(activeStep) {
    const nav = createElement("nav", "step-progress");
    nav.setAttribute("aria-label", "Exploration progress");
    const list = createElement("ol", "step-list");

    STEP_TITLES.forEach((title, index) => {
        const number = index + 1;
        const isActive = number === activeStep;
        const status = isActive ? "active" : number < activeStep ? "completed" : "upcoming";

        const item = createElement("li", `step-item ${status}`);
        if (isActive) {
            item.setAttribute("aria-current", "step");
        }
        item.append(
            createElement("span", "step-badge", String(number)),
            createElement("span", "", isActive ? `Step ${number}: ${title}` : title)
        );
        list.appendChild(item);
    });

    nav.appendChild(list);
    return nav;
}

/**
 * Creates the breadcrumb trail. Items with href become links, items with
 * onClick become buttons, and the rest are plain text.
 * @param {Array<{label: string, href?: string, onClick?: Function}>} items
 * @returns {HTMLElement}
 */
function createBreadcrumb(items) {
    const paragraph = createElement("p", "breadcrumb");

    items.forEach((item, index) => {
        if (index > 0) {
            paragraph.append(" / ");
        }

        if (item.href) {
            const link = createElement("a", "", item.label);
            link.href = item.href;
            paragraph.append(link);
        } else if (item.onClick) {
            paragraph.append(createButton(item.label, "breadcrumb-btn", item.onClick));
        } else {
            paragraph.append(createElement("span", "", item.label));
        }
    });

    return paragraph;
}

/**
 * Creates a clickable card (image, title button, description) used for both
 * family and instrument choices.
 * @param {{name: string, image?: Object, description: string, ariaLabel: string, fallbackAlt: string}} card
 * @param {Function} onSelect - Runs when the image or title is clicked.
 * @returns {HTMLElement}
 */
function createChoiceCard({ name, image, description, ariaLabel, fallbackAlt }, onSelect) {
    const card = createElement("article", "card");

    if (image && image.src) {
        const media = createElement("div", "card-media");
        const img = document.createElement("img");
        img.src = image.src;
        img.alt = image.alt || fallbackAlt;
        img.loading = "lazy";
        media.appendChild(img);
        media.addEventListener("click", onSelect);
        card.appendChild(media);
    }

    const heading = document.createElement("h2");
    heading.appendChild(createButton(name, "", onSelect, ariaLabel));
    card.append(heading, createElement("p", "", description));
    return card;
}

/**
 * Clears the explorer, adds the breadcrumb and step indicator, and scrolls to the top.
 * @param {Array} breadcrumbItems - Items for createBreadcrumb.
 * @param {number} step - Active step number.
 */
function startStep(breadcrumbItems, step) {
    container.replaceChildren(createBreadcrumb(breadcrumbItems), createStepIndicator(step));
    window.scrollTo({ top: 0, behavior: "smooth" });
}

/* ---------- Step 1: families ---------- */

/**
 * Shows every instrument family as a card.
 */
function showFamilies() {
    startStep([{ label: "Home", href: "index.html" }, { label: "Explore" }], 1);

    const grid = createElement("div", "card-grid four");
    allFamilies.forEach((family) => {
        grid.appendChild(createChoiceCard({
            name: family.name,
            image: family.image,
            description: family.shortDescription,
            ariaLabel: `Explore ${family.name} family`,
            fallbackAlt: `${family.name} family`
        }, () => showInstruments(family)));
    });

    container.append(
        createElement("h1", "", "Choose an instrument family"),
        createElement("p", "flavor-text", "Each family groups instruments by the way its sound is produced. Select a card to see 4 instruments in that family and explore their history."),
        grid
    );
}

/* ---------- Step 2: instruments in a family ---------- */

/**
 * Shows the instruments in one family.
 * @param {Object} family - The selected family.
 */
function showInstruments(family) {
    startStep([{ label: "Choose a family", onClick: showFamilies }, { label: family.name }], 2);

    const grid = createElement("div", "card-grid four");
    family.instruments.forEach((instrument) => {
        grid.appendChild(createChoiceCard({
            name: instrument.name,
            image: instrument.image,
            description: instrument.summary,
            ariaLabel: `View history and details of the ${instrument.name}`,
            fallbackAlt: instrument.name
        }, () => showDetails(family, instrument)));
    });

    const actions = createElement("div", "stepper-actions");
    actions.appendChild(createButton("← Back to all families", "button secondary", showFamilies, "Return to instrument families selection"));

    container.append(
        createElement("h1", "", `${family.name}: choose an instrument`),
        createElement("p", "flavor-text", family.overview || family.shortDescription),
        grid,
        actions
    );
}

/* ---------- Step 3: instrument details ---------- */

/**
 * Adds a <p> to the parent for each string in the list.
 * @param {HTMLElement} parent - Where to add the paragraphs.
 * @param {string[]} paragraphs - Paragraph text.
 */
function appendParagraphs(parent, paragraphs) {
    paragraphs.forEach((text) => parent.appendChild(createElement("p", "", text)));
}

/**
 * Creates the instrument photo with its caption.
 * @param {Object} instrument - The selected instrument.
 * @returns {HTMLElement}
 */
function createDetailFigure(instrument) {
    const figure = createElement("figure", "detail-image");
    const img = document.createElement("img");
    img.src = instrument.image.src;
    img.alt = instrument.image.alt || `Photograph of ${instrument.name}`;
    figure.appendChild(img);

    if (instrument.image.caption) {
        const caption = document.createElement("figcaption");
        // Captions contain photographer credit links, so they are stored as HTML
        caption.innerHTML = instrument.image.caption;
        figure.appendChild(caption);
    }

    return figure;
}

/**
 * Creates the side box with listening details, further reading, and back buttons.
 * @param {Object} family - The instrument's family.
 * @param {Object} instrument - The selected instrument.
 * @returns {HTMLElement}
 */
function createFactsBox(family, instrument) {
    const facts = createElement("div", "detail-facts");

    if (instrument.listeningDetails && instrument.listeningDetails.length > 0) {
        const list = createElement("ul", "detail-list");
        instrument.listeningDetails.forEach((detail) => {
            const item = document.createElement("li");
            item.append(createElement("strong", "", `${detail.title}: `), createElement("span", "", detail.description));
            list.appendChild(item);
        });
        facts.append(createElement("h3", "", "Listening details"), list);
    }

    if (instrument.externalResources && instrument.externalResources.length > 0) {
        const list = document.createElement("ul");
        instrument.externalResources.forEach((resource) => {
            const link = createElement("a", "", resource.title);
            link.href = resource.url;
            link.target = "_blank";
            link.rel = "noopener noreferrer";

            const cite = document.createElement("cite");
            cite.appendChild(link);
            const item = document.createElement("li");
            item.appendChild(cite);
            list.appendChild(item);
        });
        facts.append(createElement("h3", "", "Instrument Profile"), createElement("p", "", "Further reading is available from:"), list);
    }

    const actions = createElement("div", "actions");
    actions.append(
        createButton(`Back to ${family.name.toLowerCase()}`, "button", () => showInstruments(family), `Back to ${family.name} instruments`),
        createButton("All families", "button secondary", showFamilies, "Return to instrument families selection")
    );
    facts.appendChild(actions);

    return facts;
}

/**
 * Shows the full history and details of one instrument.
 * @param {Object} family - The instrument's family.
 * @param {Object} instrument - The selected instrument.
 */
function showDetails(family, instrument) {
    startStep([{ label: family.name, onClick: () => showInstruments(family) }, { label: instrument.name }], 3);

    const copy = createElement("div", "detail-copy");
    copy.appendChild(createElement("h1", "", instrument.name));
    appendParagraphs(copy, instrument.intro);
    copy.appendChild(createElement("h2", "", "How it makes sound"));
    appendParagraphs(copy, instrument.soundMechanism);
    copy.appendChild(createElement("h2", "", "History and development"));
    appendParagraphs(copy, instrument.history);

    const layout = createElement("div", "detail-layout");
    layout.appendChild(copy);
    if (instrument.image && instrument.image.src) {
        layout.appendChild(createDetailFigure(instrument));
    }
    layout.appendChild(createFactsBox(family, instrument));
    container.appendChild(layout);
}

/* ---------- Loading data from Firebase ---------- */

/**
 * Shows a spinner while the data loads.
 */
function showLoading() {
    const box = createElement("div", "status-box");
    box.setAttribute("role", "status");
    box.setAttribute("aria-live", "polite");

    const spinner = createElement("span", "spinner large");
    spinner.setAttribute("aria-hidden", "true");

    box.append(spinner, createElement("p", "", "Loading the instrument collection from the database..."));
    container.replaceChildren(box);
}

/**
 * Shows an error panel with a Retry button.
 * @param {string} message - What went wrong.
 */
function showError(message) {
    const box = createElement("div", "status-box error");
    box.setAttribute("role", "alert");
    box.append(
        createElement("h2", "", "Unable to Load Data"),
        createElement("p", "", message),
        createButton("Retry Loading", "button", loadInstrumentData)
    );
    container.replaceChildren(box);
}

/**
 * Reads the instrument families from the database, then shows Step 1
 * (or Step 2 directly for links like explorer.html?family=brass).
 */
async function loadInstrumentData() {
    showLoading();

    try {
        const snapshot = await get(ref(db, "families"));
        if (!snapshot.exists()) {
            throw new Error("No instrument data was found in the database.");
        }

        allFamilies = toArray(snapshot.val()).map((family) => ({
            ...family,
            instruments: toArray(family.instruments)
        }));

        const requestedId = new URLSearchParams(window.location.search).get("family");
        const requestedFamily = allFamilies.find((family) => family.id === requestedId);
        if (requestedFamily) {
            showInstruments(requestedFamily);
        } else {
            showFamilies();
        }
    } catch (error) {
        showError(`Could not load the instrument database. ${describeError(error)}`);
    }
}

// The database only allows signed-in users to read, so wait for sign-in first
requireUser().then(loadInstrumentData);
