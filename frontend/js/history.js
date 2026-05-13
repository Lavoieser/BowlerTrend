// ============================================================
// History.js
// Handles: filters, loading games, infinite scroll, editing
// ============================================================

// ======== GLOBAL STATE ========
let limit = 20;              // Number of games per batch
let offset = 0;              // Current offset for infinite scroll
let isLoading = false;       // Prevents double loading
let reachedEnd = false;      // True when no more games to load
let currentEditGameId = null; // Game currently being edited

// Hard-coded categories (temporary)
const CATEGORIES = ["Practice", "League", "Tournament", "Casual"];


// ============================================================
// INITIALIZATION
// ============================================================
document.addEventListener("DOMContentLoaded", async () => {
    await loadNav();
    await applyUserPermissions();

    insertPlayerName();

    loadFilters().then(() => {
        document.getElementById("applyFiltersBtn").addEventListener("click", applyFilters);
        document.getElementById("resetFiltersBtn").addEventListener("click", resetFilters);
    });

    loadGames(true);

    document.getElementById("saveEditBtn").addEventListener("click", saveGameEdits);
    document.getElementById("cancelEditBtn").addEventListener("click", closeEditModal);

    // Infinite scroll
    window.addEventListener("scroll", handleScroll);
});

async function insertPlayerName() {
    try {
        const response = await fetch("/me");
        const user = await response.json();

        if (user && user.player_name) {
            const title = document.querySelector("#filters h2");
            title.textContent = `Filters for ${user.player_name}`;
        }
    } catch (error) {
        console.error("Error loading player name:", error);
    }
}

// ============================================================
// LOAD FILTERS (Balls, Locations, Categories)
// ============================================================
async function loadFilters() {
    await loadBalls();
    await loadLocations();
    loadCategories();
}

async function loadBalls() {
    try {
        const response = await fetch("/boules");
        const data = await response.json();

          // Merge active + inactive into a single list
        const balls = data.filter(ball => ball.active);

        const select = document.getElementById("ballFilter");
        select.innerHTML = '<option value="">Toutes les boules</option>';

        balls.forEach(ball => {
            const opt = document.createElement("option");
            opt.value = ball.boule_id;
            opt.textContent = ball.boule_name;   // IMPORTANT: backend uses boule_name
            select.appendChild(opt);
        });

    } catch (error) {
        console.error("Error loading balls:", error);
    }
}

async function loadLocations() {
    try {
        const response = await fetch("/lieux");
        const locations = await response.json();

        const select = document.getElementById("locationFilter");
        select.innerHTML = '<option value="">Tous les lieux</option>';

        locations.forEach(loc => {
            const opt = document.createElement("option");
            opt.value = loc.lieu_id;
            opt.textContent = loc.lieu_name;   // FIXED: correct property name
            select.appendChild(opt);
        });
    } catch (error) {
        console.error("Error loading locations:", error);
    }
}

function loadCategories() {
    const select = document.getElementById("categoryFilter");
    CATEGORIES.forEach(cat => {
        const opt = document.createElement("option");
        opt.value = cat;
        opt.textContent = cat;
        select.appendChild(opt);
    });
}


// ============================================================
// LOAD GAMES (with filters + infinite scroll)
// ============================================================
async function loadGames(reset = false) {
    console.log("loadGames called, reset =", reset);
    // FIRST: handle reset
    if (reset) {
        console.log("RESET BLOCK EXECUTED");
        offset = 0;
        reachedEnd = false;
        document.getElementById("historyBody").innerHTML = "";
    }

    // THEN: check if we should stop
    if (isLoading || reachedEnd) return;
    isLoading = true;

    const params = new URLSearchParams({
        limit,
        offset,
        start_date: document.getElementById("startDate").value || "",
        end_date: document.getElementById("endDate").value || "",
        boule_id: document.getElementById("ballFilter").value || "",
        lieu_id: document.getElementById("locationFilter").value || "",
        category: document.getElementById("categoryFilter").value || ""
    });

    try {
        const response = await fetch(`/games/history?${params.toString()}`, {
            credentials: "include"
        });
        const games = await response.json();

        if (games.length < limit) {
            reachedEnd = true;
        }

        games.forEach(game => renderGameItem(game));

        offset += limit;
    } catch (error) {
        console.error("Error loading games:", error);
    }

    isLoading = false;
}


// ============================================================
// RENDER A GAME ITEM
// ============================================================
function renderGameItem(game) {
    const tbody = document.getElementById("historyBody");

    const tr = document.createElement("tr");
    tr.className = "history-row";

    tr.innerHTML = `
        <td>${game.date}</td>
        <td>${game.score}</td>
        <td>${game.boule_name || "N/A"}</td>
        <td>${game.lieu_name || "N/A"}</td>
        <td>${game.category || "N/A"}</td>
        <td>
            <button class="edit-btn" data-id="${game.game_id}">Edit</button>
        </td>
    `;

    tr.querySelector(".edit-btn").addEventListener("click", () => openEditMode(game));

    tbody.appendChild(tr);
}

    function openEditMode(game) {
        // Mask table + filters
        document.getElementById("historyContainer").classList.add("hidden");
        document.getElementById("filters").classList.add("hidden");

        // Ouvrir le modal existant
        openEditModal(game);
    }

// ============================================================
// FILTER ACTIONS
// ============================================================
function applyFilters() {
    loadGames(true);
}

function resetFilters() {
    document.getElementById("startDate").value = "";
    document.getElementById("endDate").value = "";
    document.getElementById("ballFilter").value = "";
    document.getElementById("locationFilter").value = "";
    document.getElementById("categoryFilter").value = "";

    loadGames(true);
}


// ============================================================
// INFINITE SCROLL
// ============================================================
function handleScroll() {
    if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 200) {
        loadGames(false);
    }
}


// ============================================================
// EDIT MODAL
// ============================================================
function openEditModal(game) {
    currentEditGameId = game.game_id;

    document.getElementById("editScore").value = game.score;

    // Fill dropdowns
    fillEditDropdowns(game);

    document.getElementById("editModal").classList.remove("hidden");
}

function closeEditModal() {
    currentEditGameId = null;
    document.getElementById("editModal").classList.add("hidden");

     // Redisplay table + filters
    document.getElementById("historyContainer").classList.remove("hidden");
    document.getElementById("filters").classList.remove("hidden");
}

async function fillEditDropdowns(game) {
    // Balls
    const ballSelect = document.getElementById("editBall");
    ballSelect.innerHTML = "";
    const balls = await (await fetch("/boules")).json();
    balls.forEach(b => {
        const opt = document.createElement("option");
        opt.value = b.boule_id;
        opt.textContent = b.boule_name;
        if (b.boule_id === game.boule_id) opt.selected = true;
        ballSelect.appendChild(opt);
    });

    // Locations
    const locSelect = document.getElementById("editLocation");
    locSelect.innerHTML = "";
    const locations = await (await fetch("/lieux")).json();
    locations.forEach(l => {
        const opt = document.createElement("option");
        opt.value = l.lieu_id;
        opt.textContent = l.lieu_name;
        if (l.lieu_id === game.lieu_id) opt.selected = true;
        locSelect.appendChild(opt);
    });

    // Categories
    const catSelect = document.getElementById("editCategory");
    catSelect.innerHTML = "";
    CATEGORIES.forEach(cat => {
        const opt = document.createElement("option");
        opt.value = cat;
        opt.textContent = cat;
        if (cat === game.category) opt.selected = true;
        catSelect.appendChild(opt);
    });
}


// ============================================================
// SAVE GAME EDITS (PATCH)
// =================================================
async function saveGameEdits() {
    if (!currentEditGameId) return;

    const payload = {
        score: parseInt(document.getElementById("editScore").value),
        boule_id: parseInt(document.getElementById("editBall").value),
        lieu_id: parseInt(document.getElementById("editLocation").value),
        category: document.getElementById("editCategory").value
    };

    try {
        const response = await fetch(`/games/${currentEditGameId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            closeEditModal();
            loadGames(true); // reload list
        } else {
            console.error("Failed to update game");
        }
    } catch (error) {
        console.error("Error updating game:", error);
    }
}