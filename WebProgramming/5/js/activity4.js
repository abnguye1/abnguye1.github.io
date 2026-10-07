async function onChangeClick() {
    try {
        const response = await fetch("js/boardingData.json");
        const data = await response.json();

        document.title = data.title;
        document.getElementById("styleName").textContent = data.header;

        document.getElementById("heroTitle").textContent = data.hero.headline;
        document.getElementById("heroDesc").textContent = data.hero.description;
        document.getElementById("heroSection").style.setProperty("--hero-img", `url('${data.hero.image}')`);

        document.getElementById("sec1Title").textContent = data.sections.overview.title;
        document.getElementById("sec1Subtitle").textContent = data.sections.overview.subtitle;
        updateCards("sec1Grid", data.sections.overview.cards);

        document.getElementById("sec2Title").textContent = data.sections.equipment.title;
        document.getElementById("sec2Subtitle").textContent = data.sections.equipment.subtitle;
        updateCards("sec2Grid", data.sections.equipment.cards);

    } catch (error) {
        console.error("Failed to load boarding data:", error);
    }
}

// helper function to update card elements
function updateCards(gridId, cards) {
    const cardElements = document.querySelectorAll(`#${gridId} .card`);
    cards.forEach((card, index) => {
        if (cardElements[index]) {
            cardElements[index].querySelector("h3").textContent = card.title;
            cardElements[index].querySelector("p").textContent = card.description;
        }
    });
}

const button = document.getElementById("changeThemeBtn");
button.addEventListener("click", onChangeClick);