// CONFIGURATION: Paste your unique Pipedream webhook endpoint URL inside the quotes below
const PIPEDREAM_SYNC_URL = "https://eod41xryrhhuaif.m.pipedream.net";

// Global data feed pointer matching your personal repository details
const READ_URL = "https://githubusercontent.com";

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
let globalNotesMasterList = []; // Holds all family notes retrieved from the cloud
let userPersonalNotes = [];     // Holds only the notes belonging to the current active user
let activeUserDashboardOwner = "";

// System Task 1: Ask for identity parameters and securely isolate the view profile workspace
function initializeFamilyIdentity() {
    let savedUser = localStorage.getItem("family_dashboard_user");
    
    while (!savedUser || savedUser.trim() === "") {
        savedUser = prompt("Welcome to the Family Dashboard! Please enter your name to view your private workspace:");
    }
    
    activeUserDashboardOwner = savedUser.trim().toUpperCase();
    localStorage.setItem("family_dashboard_user", activeUserDashboardOwner);
    
    // Inject a customized header name banner into the top navigation layout space dynamically
    const navHeader = document.querySelector(".top-nav");
    let userGreeting = document.getElementById("userGreetingBadge");
    if (!userGreeting) {
        userGreeting = document.createElement("span");
        userGreeting.id = "userGreetingBadge";
        userGreeting.style.cssText = "color: #38bdf8; font-weight: bold; font-size: 1.1rem; align-self: center; margin-right: auto; padding-left: 4px;";
        navHeader.prepend(userGreeting);
    }
    userGreeting.textContent = `📋 ${activeUserDashboardOwner}'S WORKSPACE`;
}

// System Task 2: Fetch the entire file from the repository securely
async function pullFromCloud() {
    boardGrid.innerHTML = "<p style='color: #718096; padding: 20px;'>Streaming live notes pipeline...</p>";
    try {
        const res = await fetch(`${READ_URL}?t=${Date.now()}`);
        if (res.ok) {
            globalNotesMasterList = await res.json();
            localStorage.setItem("masonry_master_family_backup", JSON.stringify(globalNotesMasterList));
        } else {
            throw new Error("Cloud delay");
        }
    } catch (err) {
        console.warn("Offline mode fallback triggered:", err);
        globalNotesMasterList = JSON.parse(localStorage.getItem("masonry_master_family_backup")) || [];
    }
    
    isolateUserNotesDataset();
}

// System Task 3: Filter the master notes file to show only rows matching the current user's profile owner ID
function isolateUserNotesDataset() {
    userPersonalNotes = globalNotesMasterList.filter(note => {
        return note.owner && note.owner.toUpperCase() === activeUserDashboardOwner;
    });
    
    loadDashboardContent();
}

// System Task 4: Push all changes directly to Pipedream to update GitHub
async function pushToCloud() {
    try {
        const jsonString = JSON.stringify(globalNotesMasterList, null, 2);
        const encodedContent = btoa(unescape(encodeURIComponent(jsonString)));

        await fetch(PIPEDREAM_SYNC_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content: encodedContent })
        });
        console.log("Global sync update complete.");
    } catch (err) {
        console.error("Sync pipeline tracking crash failure:", err);
    }
}

// System Task 5: Render cards onto the grid view area canvas
function loadDashboardContent() {
    boardGrid.innerHTML = "";
    
    if (userPersonalNotes.length === 0) {
        boardGrid.innerHTML = `<p style='color: #4a5568; padding: 20px;'>No notes found under ${activeUserDashboardOwner}. Click + Create Note to add some!</p>`;
    }

    userPersonalNotes.forEach(note => {
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

// System Task 6: Track and build tag filter navigation row buttons
function renderTagButtons() {
    const uniqueTags = new Set(["ALL"]);
    userPersonalNotes.forEach(note => {
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

// System Task 7: Client-side keyword sorting filters
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

togglePanelBtn.addEventListener("click", () => {
    creationPanel.classList.toggle("hidden");
    if (creationPanel.classList.contains("hidden")) {
        togglePanelBtn.textContent = "+ Create Note";
    } else {
        togglePanelBtn.textContent = "✕ Close Panel";
        titleInput.focus();
    }
});

// System Task 8: Save note and append identity ownership stamp metadata fields
addNoteBtn.addEventListener("click", async () => {
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
        owner: activeUserDashboardOwner, // Links this note to the active profile owner
        title: titleText,
        tag: tagText,
        content: contentText
    };

    // Prepend to master dataset array list 
    globalNotesMasterList.unshift(newNoteItem);
    localStorage.setItem("masonry_master_family_backup", JSON.stringify(globalNotesMasterList));

    titleInput.value = "";
    tagInput.value = "";
    contentInput.value = "";
    creationPanel.classList.add("hidden");
    togglePanelBtn.textContent = "+ Create Note";

    isolateUserNotesDataset();
    await pushToCloud(); // Synchronizes the master dataset file to the repository cleanly
});

// System Task 9: Remove note from master dataset safely
boardGrid.addEventListener("click", async (e) => {
    if (e.target.classList.contains("delete-btn")) {
        if (confirm("Delete this note permanently across all family devices?")) {
            const cardNode = e.target.closest(".card");
            const itemId = parseInt(cardNode.getAttribute("data-id"));

            globalNotesMasterList = globalNotesMasterList.filter(note => note.id !== itemId);
            localStorage.setItem("masonry_master_family_backup", JSON.stringify(globalNotesMasterList));

            isolateUserNotesDataset();
            await pushToCloud();
        }
    }
});

// Run deployment configuration setups sequentially 
initializeFamilyIdentity();
pullFromCloud();