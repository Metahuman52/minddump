// CONFIGURATION: Paste your unique credentials from your jsonbin dashboard profiles
const API_KEY = "$2a$10$gdF5GL/vXNb5KkIq2.jeaegny6qFLHAZI8ukKyjkgQ2XqjCxQE51u";
const BIN_ID = "6a2f862dda38895dfec18a66";

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

// Feature 1: Push local notes snapshot to online cloud bucket storage silently
async function pushToCloud() {
    try {
        await fetch(`https://jsonbin.io{BIN_ID}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "X-Master-Key": API_KEY
            },
            body: JSON.stringify({ notes: savedNotes })
        });
    } catch (err) {
        console.error("Cloud upload error:", err);
    }
}

// Feature 2: Pull cloud updates down onto device
async function pullFromCloud() {
    boardGrid.innerHTML = "<p style='color: #718096; padding: 20px;'>Syncing across devices...</p>";
    try {
        const res = await fetch(`https://jsonbin.io{BIN_ID}/latest`, {
            headers: { "X-Master-Key": API_KEY }
        });
        const data = await res.json();
        
        if (data.record && data.record.notes) {
            savedNotes = data.record.notes;
            localStorage.setItem("masonry_dashboard_notes", JSON.stringify(savedNotes));
        }
    } catch (err) {
        console.error("Cloud download fault, falling back to local file dataset:", err);
        savedNotes = JSON.parse(localStorage.getItem("masonry_dashboard_notes")) || [];
    }
    loadDashboardContent();
}

// Feature 3: Construct cards array visually onto screen canvas
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

// Feature 4: Parse tags array to build the top navigation pill filter row
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

// Feature 5: Front-end text filtering algorithm
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

// Feature 6: Toggle creation tray drop layout actions
togglePanelBtn.addEventListener("click", () => {
    creationPanel.classList.toggle("hidden");
    if (creationPanel.classList.contains("hidden")) {
        togglePanelBtn.textContent = "+ Create Note";
    } else {
        togglePanelBtn.textContent = "✕ Close Panel";
        titleInput.focus();
    }
});

// Feature 7: Add notes and trigger background sync pipeline tasks
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
    pushToCloud(); // Synchronizes your remote bucket silently
});

// Feature 8: Delete notes cleanly across local layout cache and cloud indexes
boardGrid.addEventListener("click", (e) => {
    if (e.target.classList.contains("delete-btn")) {
        if (confirm("Delete this card across all cloud devices?")) {
            const cardNode = e.target.closest(".card");
            const itemId = parseInt(cardNode.getAttribute("data-id"));

            savedNotes = savedNotes.filter(note => note.id !== itemId);
            localStorage.setItem("masonry_dashboard_notes", JSON.stringify(savedNotes));

            const tagStillExists = savedNotes.some(n => n.tag.replace("#", "").trim().toUpperCase() === currentSelectedTag);
            if (!tagStillExists && currentSelectedTag !== "ALL") {
                currentSelectedTag = "ALL";
            }

            loadDashboardContent();
            pushToCloud();
        }
    }
});

// Fire up initialization on boot sweep scanning cloud arrays
pullFromCloud();
