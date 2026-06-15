// CONFIGURATION: Paste your unique Supabase credential details strings inside the quotes below
const SUPABASE_URL = "https://vulywlemuadbywitzpik.supabase.co/rest/v1/";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1bHl3bGVtdWFkYnl3aXR6cGlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0ODYzNTgsImV4cCI6MjA5NzA2MjM1OH0.LdICYSCv3pjS0gZp1AwuXtf_MJ68zW_eFzOlcddiA7o";

// Initialize the secure cloud pipeline engine client instance
const supabase = libraryClientSupabase.createClient(SUPABASE_URL, SUPABASE_KEY);

document.addEventListener("DOMContentLoaded", () => {
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

    // Feature 1: Stream and Download Notes directly from the Cloud database server
    async function fetchCloudNotes() {
        boardGrid.innerHTML = "<p style='color: #718096; padding: 20px;'>Syncing data with cloud database...</p>";
        
        let { data: notes, error } = await supabase
            .from('notes')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error("Cloud download fault error:", error);
            boardGrid.innerHTML = "<p style='color: #ef4444; padding: 20px;'>Sync error. Check console configuration logs.</p>";
            return;
        }

        boardGrid.innerHTML = ""; // Clear loader text

        if (notes.length === 0) {
            boardGrid.innerHTML = "<p style='color: #4a5568; padding: 20px;'>No notes found. Click + Create Note to get started!</p>";
        }

        notes.forEach(note => {
            renderCardToDOM(note.id, note.title, note.tag, note.content);
        });

        renderTagButtons();
        filterNotes();
    }

    // Helper Utility: Paint card object elements onto the DOM workspace board canvas
    function renderCardToDOM(id, title, tag, content) {
        const newCard = document.createElement("div");
        newCard.className = "card";
        newCard.setAttribute("data-id", id); // Anchor reference index for cloud tracking actions
        newCard.innerHTML = `
            <div class="card-header">
                <span class="tag-label">${tag.toUpperCase()}</span>
                <span class="header-right">
                    <button class="delete-btn" title="Delete Note">🗑️</button>
                </span>
            </div>
            <h3>${title}</h3>
            <span class="card-tag">${tag.toUpperCase()}</span>
            <p>${content}</p>
        `;
        boardGrid.appendChild(newCard);
    }

    // Feature 2: Generate Tag Buttons list dynamically
    function renderTagButtons() {
        const cards = boardGrid.getElementsByClassName("card");
        const uniqueTags = new Set(["ALL"]);

        Array.from(cards).forEach(card => {
            const tagElement = card.querySelector(".card-tag");
            if (tagElement) {
                const cleanTagText = tagElement.textContent.replace("#", "").trim().toUpperCase();
                if (cleanTagText) uniqueTags.add(cleanTagText);
            }
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

    // Feature 3: Master Compound Search Filter Engine
    function filterNotes() {
        const searchQuery = searchBar.value.toLowerCase();
        const cards = boardGrid.getElementsByClassName("card");

        Array.from(cards).forEach(card => {
            const cardText = card.innerText.toLowerCase();
            const tagElement = card.querySelector(".card-tag");
            const cardTagText = tagElement ? tagElement.textContent.replace("#", "").trim().toUpperCase() : "";

            const matchesSearch = cardText.includes(searchQuery);
            const matchesTag = (currentSelectedTag === "ALL" || cardTagText === currentSelectedTag);

            if (matchesSearch && matchesTag) {
                card.classList.remove("hidden");
            } else {
                card.classList.add("hidden");
            }
        });
    }

    searchBar.addEventListener("input", filterNotes);

    // Feature 4: Toggle creation modal form drawer visibility
    togglePanelBtn.addEventListener("click", () => {
        creationPanel.classList.toggle("hidden");
        if (creationPanel.classList.contains("hidden")) {
            togglePanelBtn.textContent = "+ Create Note";
        } else {
            togglePanelBtn.textContent = "✕ Close Panel";
            titleInput.focus();
        }
    });

    // Feature 5: Create a new Note card item and save upload directly to Cloud Storage
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

        // Send payload structure to cloud server engine instantly
        const { error } = await supabase
            .from('notes')
            .insert([{ title: titleText, tag: tagText, content: contentText }]);

        if (error) {
            alert("Upload database fault: " + error.message);
            return;
        }

        // Clear input layout state elements and hide menu box panel drawer
        titleInput.value = "";
        tagInput.value = "";
        contentInput.value = "";
        creationPanel.classList.add("hidden");
        togglePanelBtn.textContent = "+ Create Note";

        // Pull down freshly updated dataset layout down onto screen board grid 
        fetchCloudNotes();
    });

    // Feature 6: Delete card item execution across current browser viewport and cloud backup
    boardGrid.addEventListener("click", async (e) => {
        if (e.target.classList.contains("delete-btn")) {
            const confirmed = confirm("Are you sure you want to delete this cloud backup note record permanently?");
            if (confirmed) {
                const targetCard = e.target.closest(".card");
                const cardId = targetCard.getAttribute("data-id");

                // Execute SQL line drop instruction remotely across data system tables
                const { error } = await supabase
                    .from('notes')
                    .delete()
                    .eq('id', cardId);

                if (error) {
                    alert("Delete task failed: " + error.message);
                    return;
                }

                // Drop node element target safely out from front end view grid
                targetCard.remove();
                renderTagButtons();
                
                // Fallback tag evaluation logic check guard bounds safety tracking validation block
                const activeTagStillExists = Array.from(boardGrid.querySelectorAll(".card-tag"))
                    .some(t => t.textContent.replace("#", "").trim().toUpperCase() === currentSelectedTag);
                
                if (!activeTagStillExists && currentSelectedTag !== "ALL") {
                    currentSelectedTag = "ALL";
                }
                filterNotes();
            }
        }
    });

    // Run remote retrieval pipeline scan setup tasks right at launch initialization 
    fetchCloudNotes();
});