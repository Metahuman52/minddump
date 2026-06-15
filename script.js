// CONFIGURATION: Paste your unique Pipedream webhook endpoint URL inside the quotes below
const PIPEDREAM_SYNC_URL = "https://pipedream.net";

// Global data feed pointer matching your personal repository details
const READ_URL = "https://githubusercontent.com";

const searchBar = document.getElementById("searchBar");
const boardGrid = document.getElementById("boardGrid");
const tagBar = document.getElementById("tagBar");

let currentSelectedTag = "ALL";
let savedNotes = [];
let currentFileSha = ""; 

// Dynamic Token Vault System (Keeps your token hidden from public GitHub code)
function getSecureToken() {
    let token = localStorage.getItem("gh_sync_token");
    if (!token) {
        token = prompt("Please enter your GitHub Personal Access Token to enable cross-device sync:");
        if (token) {
            localStorage.setItem("gh_sync_token", token.trim());
        }
    }
    return token;
}

// Feature 1: Fetch and pull your data directly from GitHub on page load
async function pullFromCloud() {
    const GITHUB_TOKEN = getSecureToken();
    if (!GITHUB_TOKEN) {
        boardGrid.innerHTML = "<p style='color: #ef4444; padding: 20px;'>Sync disabled. Refresh and enter your token to connect.</p>";
        return;
    }

    boardGrid.innerHTML = "<p style='color: #718096; padding: 20px;'>Streaming cards data...</p>";
    try {
        const res = await fetch(`${API_URL}?t=${Date.now()}`, {
            headers: { "Authorization": `token ${GITHUB_TOKEN}` }
        });
        
        if (res.ok) {
            const fileData = await res.json();
            currentFileSha = fileData.sha; 
            
            const decodedContent = atob(fileData.content);
            savedNotes = JSON.parse(decodedContent);
            localStorage.setItem("masonry_dashboard_notes", JSON.stringify(savedNotes));
        } else {
            throw new Error("Failed to load GitHub file");
        }
    } catch (err) {
        console.warn("Falling back to local storage cache engine:", err);
        savedNotes = JSON.parse(localStorage.getItem("masonry_dashboard_notes")) || [];
    }
    loadDashboardContent();
}

// Feature 2: Push changes automatically to GitHub
async function pushToCloud() {
    const GITHUB_TOKEN = getSecureToken();
    if (!GITHUB_TOKEN) return;

    try {
        const encodedContent = btoa(unescape(encodeURIComponent(JSON.stringify(savedNotes, null, 2))));
        
        const res = await fetch(API_URL, {
            method: "PUT",
            headers: {
                "Authorization": `token ${GITHUB_TOKEN}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                message: "Automated dashboard sync update",
                content: encodedContent,
                sha: currentFileSha 
            })
        });

        if (res.ok) {
            const updatedData = await res.json();
            currentFileSha = updatedData.content.sha; 
            console.log("Cloud sync successful!");
        } else {
            const errData = await res.json();
            console.error("Cloud push rejected:", errData);
            if(res.status === 401) {
                alert("GitHub token invalid or expired. Clearing saved token, please refresh.");
                localStorage.removeItem("gh_sync_token");
            }
        }
    } catch (err) {
        console.error("Cloud push network error:", err);
    }
}

// Feature 3: Construct cards visually onto canvas screen
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

// Feature 4: Generate tag navigation buttons dynamically
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

// Feature 5: Front-end live text filter engine
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

// Feature 6: Toggle form panel tray drawer view actions
togglePanelBtn.addEventListener("click", () => {
    creationPanel.classList.toggle("hidden");
    if (creationPanel.classList.contains("hidden")) {
        togglePanelBtn.textContent = "+ Create Note";
    } else {
        togglePanelBtn.textContent = "✕ Close Panel";
        titleInput.focus();
    }
});

// Feature 7: Create a new note and trigger automatic background upload sync
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
    await pushToCloud(); 
});

// Feature 8: Delete notes and push clean snapshot up to cloud
boardGrid.addEventListener("click", async (e) => {
    if (e.target.classList.contains("delete-btn")) {
        if (confirm("Delete this card cross-platform permanently?")) {
            const cardNode = e.target.closest(".card");
            const itemId = parseInt(cardNode.getAttribute("data-id"));

            savedNotes = savedNotes.filter(note => note.id !== itemId);
            localStorage.setItem("masonry_dashboard_notes", JSON.stringify(savedNotes));

            const tagStillExists = savedNotes.some(n => n.tag.replace("#", "").trim().toUpperCase() === currentSelectedTag);
            if (!tagStillExists && currentSelectedTag !== "ALL") {
                currentSelectedTag = "ALL";
            }

            loadDashboardContent();
            await pushToCloud(); 
        }
    }
});

// Fire up initialization on boot sweep scanning GitHub files
pullFromCloud();