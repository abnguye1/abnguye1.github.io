/**
 * Instrument History Explorer - Stage 3 Interactive Application
 * Handles asynchronous JSON data fetching and two-step dynamic DOM manipulation
 * with cognitive accessibility support and responsive navigation.
 */

// Global constant configuration values
const DATA_URL = "js/instruments.json";

const STEP_LABELS = [
    { number: 1, title: "Family" },
    { number: 2, title: "Instrument" },
    { number: 3, title: "Details" }
];

// Central application state
const appState = {
    allFamilies: [],
    currentFamilyId: null,
    currentInstrumentId: null
};

/**
 * Creates a compact step progress indicator for cognitive accessibility.
 * Completed and upcoming steps are static labels — navigation back is
 * handled by the breadcrumb directly above the indicator.
 * @param {number} activeStep - The currently active step number (1, 2, or 3).
 * @returns {HTMLElement} The step progress nav element.
 */
function createStepIndicator(activeStep) {
    const navElement = document.createElement("nav");
    navElement.className = "step-progress";
    navElement.setAttribute("aria-label", "Exploration progress");

    const listElement = document.createElement("ol");
    listElement.className = "step-list";

    STEP_LABELS.forEach((step) => {
        const itemElement = document.createElement("li");
        itemElement.className = "step-item";

        const badgeElement = document.createElement("span");
        badgeElement.className = "step-badge";

        const labelSpan = document.createElement("span");

        if (step.number === activeStep) {
            itemElement.classList.add("active");
            itemElement.setAttribute("aria-current", "step");
            badgeElement.textContent = String(step.number);
            labelSpan.textContent = `Step ${step.number}: ${step.title}`;
        } else if (step.number < activeStep) {
            itemElement.classList.add("completed");
            badgeElement.textContent = String(step.number);
            labelSpan.textContent = step.title;
        } else {
            itemElement.classList.add("upcoming");
            badgeElement.textContent = String(step.number);
            labelSpan.textContent = step.title;
        }

        itemElement.appendChild(badgeElement);
        itemElement.appendChild(labelSpan);
        listElement.appendChild(itemElement);
    });

    navElement.appendChild(listElement);
    return navElement;
}

/**
 * Creates an accessible breadcrumb paragraph matching the Stage 2 structure.
 * @param {Array<{label: string, onClick?: Function, href?: string}>} items - Breadcrumb items.
 * @returns {HTMLElement} The breadcrumb paragraph element.
 */
function createBreadcrumbParagraph(items) {
    const paragraph = document.createElement("p");
    paragraph.className = "breadcrumb";

    items.forEach((item, index) => {
        if (item.href) {
            const anchor = document.createElement("a");
            anchor.href = item.href;
            anchor.textContent = item.label;
            paragraph.appendChild(anchor);
        } else if (item.onClick) {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "breadcrumb-btn";
            button.textContent = item.label;
            button.addEventListener("click", item.onClick);
            paragraph.appendChild(button);
        } else {
            const textSpan = document.createElement("span");
            textSpan.textContent = item.label;
            paragraph.appendChild(textSpan);
        }

        if (index < items.length - 1) {
            paragraph.appendChild(document.createTextNode(" / "));
        }
    });

    return paragraph;
}

/**
 * Creates a family choice card with an image thumbnail matching the Stage 2 card structure.
 * @param {Object} family - Family data object.
 * @param {Function} onSelect - Click handler callback receiving the family ID.
 * @returns {HTMLElement} The article card element.
 */
function createFamilyCard(family, onSelect) {
    const cardArticle = document.createElement("article");
    cardArticle.className = "card";

    if (family.image && family.image.src) {
        const mediaContainer = document.createElement("div");
        mediaContainer.className = "card-media";

        const imageElement = document.createElement("img");
        imageElement.src = family.image.src;
        imageElement.alt = family.image.alt || `${family.name} family`;
        imageElement.loading = "lazy";

        mediaContainer.appendChild(imageElement);
        mediaContainer.style.cursor = "pointer";
        mediaContainer.addEventListener("click", () => onSelect(family.id));
        cardArticle.appendChild(mediaContainer);
    }

    const titleHeading = document.createElement("h2");
    const titleButton = document.createElement("button");
    titleButton.type = "button";
    titleButton.textContent = family.name;
    titleButton.setAttribute("aria-label", `Explore ${family.name} family`);
    titleButton.addEventListener("click", () => onSelect(family.id));
    titleHeading.appendChild(titleButton);

    const descriptionParagraph = document.createElement("p");
    descriptionParagraph.textContent = family.shortDescription;

    cardArticle.appendChild(titleHeading);
    cardArticle.appendChild(descriptionParagraph);

    return cardArticle;
}

/**
 * Creates an instrument choice card with an image thumbnail matching Stage 2 family cards.
 * @param {Object} instrument - Instrument data object.
 * @param {Function} onSelect - Click handler callback receiving instrument ID.
 * @returns {HTMLElement} The article card element.
 */
function createInstrumentCard(instrument, onSelect) {
    const cardArticle = document.createElement("article");
    cardArticle.className = "card";

    if (instrument.image && instrument.image.src) {
        const mediaContainer = document.createElement("div");
        mediaContainer.className = "card-media";

        const imageElement = document.createElement("img");
        imageElement.src = instrument.image.src;
        imageElement.alt = instrument.image.alt || instrument.name;
        imageElement.loading = "lazy";

        mediaContainer.appendChild(imageElement);
        mediaContainer.style.cursor = "pointer";
        mediaContainer.addEventListener("click", () => onSelect(instrument.id));
        cardArticle.appendChild(mediaContainer);
    }

    const titleHeading = document.createElement("h2");
    const titleButton = document.createElement("button");
    titleButton.type = "button";
    titleButton.textContent = instrument.name;
    titleButton.setAttribute("aria-label", `View history and details of the ${instrument.name}`);
    titleButton.addEventListener("click", () => onSelect(instrument.id));
    titleHeading.appendChild(titleButton);

    const summaryParagraph = document.createElement("p");
    summaryParagraph.textContent = instrument.summary;

    cardArticle.appendChild(titleHeading);
    cardArticle.appendChild(summaryParagraph);

    return cardArticle;
}

/**
 * Renders the loading state into the target container.
 * @param {HTMLElement} container - The DOM target container.
 */
function renderLoadingState(container) {
    container.innerHTML = "";

    const statusBox = document.createElement("div");
    statusBox.className = "status-box";
    statusBox.setAttribute("role", "status");
    statusBox.setAttribute("aria-live", "polite");

    const message = document.createElement("p");
    message.textContent = "Loading instrument collection from external database...";

    statusBox.appendChild(message);
    container.appendChild(statusBox);
}

/**
 * Renders an error state with a retry button if external data fails to load.
 * @param {HTMLElement} container - The DOM target container.
 * @param {string} errorMessage - Error description text.
 * @param {Function} onRetry - Callback to retry loading.
 */
function renderErrorState(container, errorMessage, onRetry) {
    container.innerHTML = "";

    const statusBox = document.createElement("div");
    statusBox.className = "status-box error";
    statusBox.setAttribute("role", "alert");

    const heading = document.createElement("h2");
    heading.textContent = "Unable to Load Data";

    const message = document.createElement("p");
    message.textContent = errorMessage || "An error occurred while loading the instrument collection. Please check your connection and try again.";

    const retryButton = document.createElement("button");
    retryButton.type = "button";
    retryButton.className = "button";
    retryButton.textContent = "Retry Loading";
    retryButton.addEventListener("click", onRetry);

    statusBox.appendChild(heading);
    statusBox.appendChild(message);
    statusBox.appendChild(retryButton);
    container.appendChild(statusBox);
}

/**
 * Renders Step 1: Instrument Families Selection view into the container.
 * @param {HTMLElement} container - The main container element.
 * @param {Array} families - Array of family data objects.
 * @param {Function} onSelectFamily - Handler invoked when a family is clicked.
 */
function renderFamiliesView(container, families, onSelectFamily) {
    container.innerHTML = "";

    const breadcrumb = createBreadcrumbParagraph([
        { label: "Home", href: "index.html" },
        { label: "Explore" }
    ]);
    container.appendChild(breadcrumb);

    const stepIndicator = createStepIndicator(1);
    container.appendChild(stepIndicator);

    const heading = document.createElement("h1");
    heading.textContent = "Choose an instrument family";
    container.appendChild(heading);

    const flavorText = document.createElement("p");
    flavorText.className = "flavor-text";
    flavorText.textContent = "Each family groups instruments by the way its sound is produced. Select a card to see 4 instruments in that family and explore their history.";
    container.appendChild(flavorText);

    const cardGrid = document.createElement("div");
    cardGrid.className = "card-grid four";

    families.forEach((family) => {
        const familyCard = createFamilyCard(family, onSelectFamily);
        cardGrid.appendChild(familyCard);
    });

    container.appendChild(cardGrid);
}

/**
 * Renders Step 2: Instruments in Family Selection view into the container.
 * @param {HTMLElement} container - The main container element.
 * @param {Object} family - Selected family data object.
 * @param {Function} onSelectInstrument - Handler invoked when an instrument is clicked.
 * @param {Function} onBackToFamilies - Handler invoked when returning to Step 1.
 */
function renderInstrumentsView(container, family, onSelectInstrument, onBackToFamilies) {
    container.innerHTML = "";

    const breadcrumb = createBreadcrumbParagraph([
        { label: "Choose a family", onClick: onBackToFamilies },
        { label: family.name }
    ]);
    container.appendChild(breadcrumb);

    const stepIndicator = createStepIndicator(2);
    container.appendChild(stepIndicator);

    const heading = document.createElement("h1");
    heading.textContent = `${family.name}: choose an instrument`;
    container.appendChild(heading);

    const flavorText = document.createElement("p");
    flavorText.className = "flavor-text";
    flavorText.textContent = family.overview || family.shortDescription;
    container.appendChild(flavorText);

    const cardGrid = document.createElement("div");
    cardGrid.className = "card-grid four";

    family.instruments.forEach((instrument) => {
        const instrumentCard = createInstrumentCard(instrument, onSelectInstrument);
        cardGrid.appendChild(instrumentCard);
    });

    container.appendChild(cardGrid);

    const bottomActions = document.createElement("div");
    bottomActions.className = "stepper-actions";

    const backButton = document.createElement("button");
    backButton.type = "button";
    backButton.className = "button secondary";
    backButton.textContent = "← Back to all families";
    backButton.setAttribute("aria-label", "Return to instrument families selection");
    backButton.addEventListener("click", onBackToFamilies);

    bottomActions.appendChild(backButton);
    container.appendChild(bottomActions);
}

/**
 * Renders Step 3: Complete In-Depth Instrument Detail view into the container.
 * @param {HTMLElement} container - The main container element.
 * @param {Object} family - Parent family data object.
 * @param {Object} instrument - Selected instrument data object.
 * @param {Function} onBackToInstruments - Handler to return to Step 2.
 * @param {Function} onBackToFamilies - Handler to return to Step 1.
 */
function renderDetailView(container, family, instrument, onBackToInstruments, onBackToFamilies) {
    container.innerHTML = "";

    const breadcrumb = createBreadcrumbParagraph([
        { label: family.name, onClick: onBackToInstruments },
        { label: instrument.name }
    ]);
    container.appendChild(breadcrumb);

    const stepIndicator = createStepIndicator(3);
    container.appendChild(stepIndicator);

    const detailLayout = document.createElement("div");
    detailLayout.className = "detail-layout";

    const copyColumn = document.createElement("div");
    copyColumn.className = "detail-copy";

    const mainHeading = document.createElement("h1");
    mainHeading.textContent = instrument.name;
    copyColumn.appendChild(mainHeading);

    instrument.intro.forEach((paragraphText) => {
        const paragraph = document.createElement("p");
        paragraph.textContent = paragraphText;
        copyColumn.appendChild(paragraph);
    });

    const soundHeading = document.createElement("h2");
    soundHeading.textContent = "How it makes sound";
    copyColumn.appendChild(soundHeading);

    instrument.soundMechanism.forEach((paragraphText) => {
        const paragraph = document.createElement("p");
        paragraph.textContent = paragraphText;
        copyColumn.appendChild(paragraph);
    });

    const historyHeading = document.createElement("h2");
    historyHeading.textContent = "History and development";
    copyColumn.appendChild(historyHeading);

    instrument.history.forEach((paragraphText) => {
        const paragraph = document.createElement("p");
        paragraph.textContent = paragraphText;
        copyColumn.appendChild(paragraph);
    });

    detailLayout.appendChild(copyColumn);

    if (instrument.image && instrument.image.src) {
        const figure = document.createElement("figure");
        figure.className = "detail-image";

        const image = document.createElement("img");
        image.src = instrument.image.src;
        image.alt = instrument.image.alt || `Photograph of ${instrument.name}`;

        figure.appendChild(image);

        if (instrument.image.caption) {
            const figcaption = document.createElement("figcaption");
            figcaption.innerHTML = instrument.image.caption;
            figure.appendChild(figcaption);
        }

        detailLayout.appendChild(figure);
    }

    const factsBox = document.createElement("div");
    factsBox.className = "detail-facts";

    if (instrument.listeningDetails && instrument.listeningDetails.length > 0) {
        const listeningHeading = document.createElement("h3");
        listeningHeading.textContent = "Listening details";
        factsBox.appendChild(listeningHeading);

        const listElement = document.createElement("ul");
        listElement.className = "detail-list";

        instrument.listeningDetails.forEach((detail) => {
            const listItem = document.createElement("li");

            const strongElement = document.createElement("strong");
            strongElement.textContent = `${detail.title}: `;

            const textSpan = document.createElement("span");
            textSpan.textContent = detail.description;

            listItem.appendChild(strongElement);
            listItem.appendChild(textSpan);
            listElement.appendChild(listItem);
        });

        factsBox.appendChild(listElement);
    }

    if (instrument.externalResources && instrument.externalResources.length > 0) {
        const profileHeading = document.createElement("h3");
        profileHeading.textContent = "Instrument Profile";
        factsBox.appendChild(profileHeading);

        const introParagraph = document.createElement("p");
        introParagraph.textContent = "Further reading is available from:";
        factsBox.appendChild(introParagraph);

        const resourcesList = document.createElement("ul");

        instrument.externalResources.forEach((resource) => {
            const listItem = document.createElement("li");

            const citeElement = document.createElement("cite");
            const linkElement = document.createElement("a");
            linkElement.href = resource.url;
            linkElement.target = "_blank";
            linkElement.rel = "noopener noreferrer";
            linkElement.textContent = resource.title;

            citeElement.appendChild(linkElement);
            listItem.appendChild(citeElement);
            resourcesList.appendChild(listItem);
        });

        factsBox.appendChild(resourcesList);
    }

    const actionsContainer = document.createElement("div");
    actionsContainer.className = "actions";

    const backToFamilyButton = document.createElement("button");
    backToFamilyButton.type = "button";
    backToFamilyButton.className = "button";
    backToFamilyButton.textContent = `Back to ${family.name.toLowerCase()}`;
    backToFamilyButton.setAttribute("aria-label", `Back to ${family.name} instruments`);
    backToFamilyButton.addEventListener("click", onBackToInstruments);

    const backToFamiliesButton = document.createElement("button");
    backToFamiliesButton.type = "button";
    backToFamiliesButton.className = "button secondary";
    backToFamiliesButton.textContent = "All families";
    backToFamiliesButton.setAttribute("aria-label", "Return to instrument families selection");
    backToFamiliesButton.addEventListener("click", onBackToFamilies);

    actionsContainer.appendChild(backToFamilyButton);
    actionsContainer.appendChild(backToFamiliesButton);
    factsBox.appendChild(actionsContainer);

    detailLayout.appendChild(factsBox);
    container.appendChild(detailLayout);
}

/**
 * Handles user selection of an instrument family (Step 1 -> Step 2 transition).
 * @param {string} familyId - The ID of the clicked family.
 */
function handleSelectFamily(familyId) {
    appState.currentFamilyId = familyId;
    appState.currentInstrumentId = null;

    const selectedFamily = appState.allFamilies.find((f) => f.id === familyId);
    const container = document.getElementById("interactiveExplorer");

    if (container && selectedFamily) {
        renderInstrumentsView(
            container,
            selectedFamily,
            (instrumentId) => handleSelectInstrument(familyId, instrumentId),
            handleReturnToFamilies
        );
        window.scrollTo({ top: 0, behavior: "smooth" });
    }
}

/**
 * Handles user selection of an individual instrument (Step 2 -> Step 3 transition).
 * @param {string} familyId - The ID of the instrument's family.
 * @param {string} instrumentId - The ID of the clicked instrument.
 */
function handleSelectInstrument(familyId, instrumentId) {
    appState.currentFamilyId = familyId;
    appState.currentInstrumentId = instrumentId;

    const selectedFamily = appState.allFamilies.find((f) => f.id === familyId);
    const container = document.getElementById("interactiveExplorer");

    if (container && selectedFamily) {
        const selectedInstrument = selectedFamily.instruments.find((i) => i.id === instrumentId);

        if (selectedInstrument) {
            renderDetailView(
                container,
                selectedFamily,
                selectedInstrument,
                () => handleSelectFamily(familyId),
                handleReturnToFamilies
            );
            window.scrollTo({ top: 0, behavior: "smooth" });
        }
    }
}

/**
 * Returns user to the Step 1 families selection view.
 */
function handleReturnToFamilies() {
    appState.currentFamilyId = null;
    appState.currentInstrumentId = null;

    const container = document.getElementById("interactiveExplorer");
    if (container) {
        renderFamiliesView(container, appState.allFamilies, handleSelectFamily);
        window.scrollTo({ top: 0, behavior: "smooth" });
    }
}

/**
 * Fetches the external JSON database via AJAX using the Fetch API with Promises.
 * Updates the UI or displays an error banner if the request fails.
 */
async function loadInstrumentData() {
    const container = document.getElementById("interactiveExplorer");
    if (!container) {
        return;
    }

    renderLoadingState(container);

    try {
        const response = await fetch(DATA_URL);
        if (!response.ok) {
            throw new Error(`HTTP error while fetching data: ${response.status}`);
        }

        const jsonData = await response.json();
        if (!jsonData || !Array.isArray(jsonData.families)) {
            throw new Error("Invalid instrument data structure received.");
        }

        appState.allFamilies = jsonData.families;
        renderFamiliesView(container, appState.allFamilies, handleSelectFamily);
    } catch (error) {
        const message = "Could not load the instrument database. Please ensure your connection is active and try again.";
        renderErrorState(container, message, loadInstrumentData);
    }
}

/**
 * Initializes the interactive explorer application on page load.
 */
function initializeExplorerApp() {
    loadInstrumentData();
}

// Bind initialization to DOM ready event
document.addEventListener("DOMContentLoaded", initializeExplorerApp);
