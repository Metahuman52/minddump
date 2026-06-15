// CONFIGURATION: Type your exact GitHub path strings below
const GITHUB_USERNAME = "Metahuman52";
const REPO_NAME = "minddump";

// Automatically configures the global raw data pipeline link
const DATA_URL = `https://raw.githubusercontent.com/${GITHUB_USERNAME}/${REPO_NAME}/main/data.json`;

const searchBar = document.getElementById("searchBar");
const boardGrid = document.getElementById("boardGrid");
const tagBar = document.getElementById("tagBar");

const togglePanelBtn = document.getElementById("togglePanelBtn");
const creationPanel = document.getElementById("creationPanel");

const addNoteBtn = document.getElementById("addNoteBtn");
const titleInput = document.getElementById("noteTitle");
const tagInput = document.getElementById("noteTag");
const contentInput = document.getElementById("noteContent");

let currentSelectedTag = "ALL";
let savedNotes = [];

// Feature 1: Pull centralized data from your GitHub source file
async function pullFromCloud() {
    boardGrid.innerHTML = "<p style='color: #718096; padding: 20px;'>Streaming cards data...</p>";
    try {
        // Cache busting URL parameters bypass browser proxy delay freezes
        const res = await fetch(`${DATA_URL}?t=${Date.now()}`);
        if (res.ok) {
            savedNotes = await res.json();
            localStorage.setItem("masonry_dashboard_notes", JSON.stringify(savedNotes));
        } else {
            throw new Error("Server response fault");
        }
    } catch (err) {
        console.warn("Falling back to local storage engine fallback cache:", err);
        savedNotes = JSON.parse(localStorage.getItem("masonry_dashboard_notes")) || [];
    }
    loadDashboardContent();
}

// Feature 2: Construct cards visually onto canvas screen
function loadDashboardContent() {
    boardGrid.innerHTML = "";
    
    if (savedNotes.length === 0) {
        boardGrid.innerHTML = "<p style='color: #4a5568; padding: 20px;'>No notes found. Click + Create Note to get started!</p>";
    }

    savedNotes.forEach(note => {
        const newCard = document.createElement("div");
        newCard.className = "card";
        newCard.setAttribute("data-id", note.id);
        newCard.innerHTML = `
            <div class="card-header">
                <span class="tag-label">${note.tag.toUpperCase()}</span>
                <span class="header-right">
                    <button class="delete-btn" title="Delete Note">🗑️</button>
                </span>
            </div>
            <h3>${note.title}</h3>
            <span class="card-tag">${note.tag.toUpperCase()}</span>
            <p>${note.content}</p>
        `;
        boardGrid.appendChild(newCard);
    });

    renderTagButtons();
    filterNotes();
}

// Feature 3: Generate tag pills navigations
function renderTagButtons() {
    const uniqueTags = new Set(["ALL"]);
    savedNotes.forEach(note => {
        const cleanTag = note.tag.replace("#", "").trim().toUpperCase();
        if (cleanTag) uniqueTags.add(cleanTag);
    });

    tagBar.innerHTML = "";

    uniqueTags.forEach(tag => {
        const btn = document.createElement("button");
        btn.className = `tag-btn ${currentSelectedTag === tag ? "active" : ""}`;
        btn.textContent = tag === "ALL" ? "#ALL" : `#${tag}`;
        
        btn.addEventListener("click", () => {
            currentSelectedTag = tag;
            document.querySelectorAll(".tag-btn").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            filterNotes();
        });
        tagBar.appendChild(btn);
    });
}

// Feature 4: Compound sorting logic search algorithms
function filterNotes() {
    const query = searchBar.value.toLowerCase();
    const cards = boardGrid.getElementsByClassName("card");

    Array.from(cards).forEach(card => {
        const text = card.innerText.toLowerCase();
        const tagElement = card.querySelector(".card-tag");
        const cardTag = tagElement ? tagElement.textContent.replace("#", "").trim().toUpperCase() : "";

        const matchesSearch = text.includes(query);
        const matchesTag = (currentSelectedTag === "ALL" || cardTag === currentSelectedTag);

        if (matchesSearch && matchesTag) {
            card.classList.remove("hidden");
        } else {
            card.classList.add("hidden");
        }
    });
}

searchBar.addEventListener("input", filterNotes);

// Feature 5: Toggle UI drop layout panel
togglePanelBtn.addEventListener("click", () => {
    creationPanel.classList.toggle("hidden");
    if (creationPanel.classList.contains("hidden")) {
        togglePanelBtn.textContent = "+ Create Note";
    } else {
        togglePanelBtn.textContent = "✕ Close Panel";
        titleInput.focus();
    }
});

// Feature 6: Add card item to array and download a copy
addNoteBtn.addEventListener("click", () => {
    const titleText = titleInput.value.trim();
    let tagText = tagInput.value.trim();
    const contentText = contentInput.value.trim();

    if (!titleText || !contentText) {
        alert("Please complete fields before saving!");
        return;
    }

    if (tagText && !tagText.startsWith("#")) {
        tagText = "#" + tagText;
    } else if (!tagText) {
        tagText = "#GENERAL";
    }

    const newNoteItem = {
        id: Date.now(),
        title: titleText,
        tag: tagText,
        content: contentText
    };

    savedNotes.unshift(newNoteItem);
    localStorage.setItem("masonry_dashboard_notes", JSON.stringify(savedNotes));

    titleInput.value = "";
    tagInput.value = "";
    contentInput.value = "";
    creationPanel.classList.add("hidden");
    togglePanelBtn.textContent = "+ Create Note";

    loadDashboardContent();
    triggerFileDownload();
});

// Feature 7: Delete card node and call tracking layout update functions
boardGrid.addEventListener("click", (e) => {
    if (e.target.classList.contains("delete-btn")) {
        if (confirm("Delete this card cross platform?")) {
            const cardNode = e.target.closest(".card");
            const itemId = parseInt(cardNode.getAttribute("data-id"));

            savedNotes = savedNotes.filter(note => note.id !== itemId);
            localStorage.setItem("masonry_dashboard_notes", JSON.stringify(savedNotes));

            const tagStillExists = savedNotes.some(n => n.tag.replace("#", "").trim().toUpperCase() === currentSelectedTag);
            if (!tagStillExists && currentSelectedTag !== "ALL") {
                currentSelectedTag = "ALL";
            }

            loadDashboardContent();
            triggerFileDownload();
        }
    }
});

// Feature 8: Automatic Backup Exporter
function triggerFileDownload() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(savedNotes, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "data.json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
}

// Bootstrap Initialization
pullFromCloud();