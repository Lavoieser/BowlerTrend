// ======================================================
// Sessions.js — Dynamic session creation and score entry
// ======================================================

// DOM references
const teamSelect = document.getElementById("teamSelect");
const gameCountSelect = document.getElementById("gameCount");
const locationSelect = document.getElementById("locationSelect");
const categorySelect = document.getElementById("categorySelect");
const dateInput = document.getElementById("dateInput");
const startBtn = document.getElementById("startSessionBtn");
const tableContainer = document.getElementById("sessionTableContainer");
const playerBallSection = document.getElementById("playerBallSection");

document.getElementById("dateInput").addEventListener("change", updateSessionTitle);
document.getElementById("locationSelect").addEventListener("change", updateSessionTitle);

// Global session state
let sessionId = null;
let players = [];
let numberOfGames = 3;

// ======================================================
// INITIALIZATION
// ======================================================

document.addEventListener("DOMContentLoaded", async () => {
    await loadNav();
    await applyUserPermissions();
    await loadTeams();
    await loadLocations();

    dateInput.value = new Date().toISOString().split("T")[0];

    startBtn.addEventListener("click", startSession);

    // Load ball selectors when team changes
    teamSelect.addEventListener("change", async () => {
        const teamId = parseInt(teamSelect.value);
        if (teamId) {
            players = await getTeamPlayers(teamId);
            await loadPlayerBallSelectors(players);
        } else {
            playerBallSection.innerHTML = "";
        }
    });
});

// ======================================================
// LOAD TEAMS AND LOCATIONS
// ======================================================

async function loadTeams() {
    const teams = await apiGet("/teams");
    teamSelect.innerHTML = '<option value="">Select team</option>';

    teams.forEach(t => {
        const opt = document.createElement("option");
        opt.value = t.team_id;
        opt.textContent = t.team_name;
        teamSelect.appendChild(opt);
    });
}

async function loadLocations() {
    const lieux = await apiGet("/lieux");
    locationSelect.innerHTML = '<option value="">Select location</option>';

    lieux.forEach(l => {
        const opt = document.createElement("option");
        opt.value = l.lieu_id;
        opt.textContent = l.lieu_name;
        locationSelect.appendChild(opt);
    });
}

// ======================================================
// PLAYER BALL SELECTORS
// ======================================================

async function loadPlayerBallSelectors(players) {
    playerBallSection.innerHTML = `
        <h3>Players & Balls</h3>
        <table class="ball-select-table">
            <tr><th>Player</th><th>Ball</th></tr>
        </table>
    `;

    const table = playerBallSection.querySelector("table");

    for (const p of players) {
        const row = document.createElement("tr");

        const nameCell = document.createElement("td");
        nameCell.textContent = p.player_name;

        const ballCell = document.createElement("td");
        const select = document.createElement("select");
        select.innerHTML = `<option value="">--</option>`;

        const boules = await fetchBoules(p.player_id);
        boules.forEach(b => {
            const opt = document.createElement("option");
            opt.value = b.boule_id;
            opt.textContent = b.boule_name;
            select.appendChild(opt);
        });

        select.addEventListener("change", () => {
            p.selectedBall = parseInt(select.value) || null;
        });

        ballCell.appendChild(select);

        row.appendChild(nameCell);
        row.appendChild(ballCell);
        table.appendChild(row);
    }
}

// ======================================================
// START SESSION
// ======================================================

async function startSession() {
    const teamId = parseInt(teamSelect.value);
    numberOfGames = parseInt(gameCountSelect.value);
    const category = categorySelect.value.trim();
    const locationId = parseInt(locationSelect.value);
    const date = dateInput.value;

    if (!teamId || !locationId || !date) {
        alert("Please fill all required fields.");
        return;
    }

    if (players.length === 0) {
        alert("This team has no players.");
        return;
    }

    // Create session
    const res = await apiPost("/session/start", {});
    sessionId = res.session_id;

    // Save ball selections
    for (const p of players) {
        if (p.selectedBall) {
            await apiPost("/session/ball", {
                session_id: sessionId,
                player_id: p.player_id,
                ball_id: p.selectedBall
            });
        }
    }

    generateSessionTable(players, numberOfGames, category, locationId, date);
}

// ======================================================
// FETCH HELPERS
// ======================================================

async function getTeamPlayers(teamId) {
    const response = await fetch(`/team_players/${teamId}`);
    if (!response.ok) throw new Error("Failed to fetch team players");
    return await response.json();
}

async function fetchBoules(playerId) {
    const response = await fetch(`/players/${playerId}/boules`, {
        credentials: "include"
    });
    if (!response.ok) throw new Error("Failed to fetch boules");
    return await response.json();
}

// ======================================================
// UPDATE SESSION TITLE
// ======================================================

function updateSessionTitle() {
    const date = dateInput.value;
    const location = locationSelect.selectedOptions[0]?.text || "";

    if (date && location) {
        const d = new Date(date);
        const formatted = d.toLocaleDateString("en-CA", {
            day: "numeric",
            month: "long",
            year: "numeric"
        });

        document.getElementById("sessionTitle").textContent =
            `Session on ${formatted} at ${location}`;
    }
}

// ======================================================
// BUILD SESSION TABLE (DESKTOP + MOBILE)
// ======================================================

async function generateSessionTable(players, gameCount, category, locationId, date) {

    const isMobilePortrait =
        window.matchMedia("(pointer: coarse) and (orientation: portrait)").matches;

    if (isMobilePortrait) {
        generateMobileTable(players, gameCount, category, locationId, date);
        return;
    }

    // DESKTOP VERSION
    tableContainer.innerHTML = "";

    const scrollWrapper = document.createElement("div");
    scrollWrapper.className = "games-scroll";

    const table = document.createElement("table");
    table.classList.add("session-table");
    scrollWrapper.appendChild(table);

    table.dataset.playerOrder = JSON.stringify(players.map(p => p.player_id));

    // HEADER
    const headerRow = document.createElement("tr");

    const gameHeader = document.createElement("th");
    gameHeader.textContent = "Game";
    gameHeader.classList.add("col-player", "sticky-player");
    headerRow.appendChild(gameHeader);

    players.forEach(p => {
        const th = document.createElement("th");
        th.textContent = p.player_name;
        th.classList.add("col-game");
        headerRow.appendChild(th);
    });

    const totalHeader = document.createElement("th");
    totalHeader.textContent = "Total";
    totalHeader.classList.add("col-player-total", "sticky-total");
    headerRow.appendChild(totalHeader);

    table.appendChild(headerRow);

    // GAME ROWS
    for (let g = 1; g <= gameCount; g++) {
        const row = document.createElement("tr");

        const label = document.createElement("td");
        label.textContent = `Game ${g}`;
        label.classList.add("col-player", "sticky-player");
        row.appendChild(label);

        for (const p of players) {
            const td = document.createElement("td");
            td.classList.add("col-game");

            const input = document.createElement("input");
            input.type = "number";
            input.min = 0;
            input.max = 300;
            input.classList.add("score-input");

            input.addEventListener("change", async () => {
                let score = parseInt(input.value);

                // Validation stricte
                if (isNaN(score) || score < 0 || score > 300) {
                    alert("Invalid score.");
                    input.value = "";   // Empty the invalid input
                    return;             // Do not record invalid score
                }

                try {
                    await apiPost("/session/score", {
                        session_id: sessionId,
                        player_id: p.player_id,
                        game_number: g,
                        score,
                        category,
                        location_id: locationId,
                        date
                    });

                    updateTotals(table, players, gameCount);

                } catch (err) {
                    console.error("Score save failed:", err);
                }
            });

            td.appendChild(input);
            row.appendChild(td);
        }

        const gameTotal = document.createElement("td");
        gameTotal.classList.add("game-total-cell", "col-player-total", "sticky-total");
        gameTotal.textContent = "0";
        row.appendChild(gameTotal);

        table.appendChild(row);
    }

    // FINAL TOTAL ROW
    const totalRow = document.createElement("tr");

    const totalLabel = document.createElement("th");
    totalLabel.textContent = "Total";
    totalLabel.classList.add("col-player", "sticky-player");
    totalRow.appendChild(totalLabel);

    players.forEach(() => {
        const td = document.createElement("td");
        td.classList.add("total-cell", "col-game");
        td.textContent = "0";
        totalRow.appendChild(td);
    });

    const finalSpacer = document.createElement("td");
    finalSpacer.classList.add("col-player-total", "sticky-total");
    totalRow.appendChild(finalSpacer);

    table.appendChild(totalRow);

    tableContainer.appendChild(scrollWrapper);
}

// ======================================================
// MOBILE VERSION
// ======================================================

async function generateMobileTable(players, gameCount, category, locationId, date) {

    tableContainer.innerHTML = "";

    const scrollWrapper = document.createElement("div");
    scrollWrapper.className = "games-scroll";

    const table = document.createElement("table");
    table.classList.add("session-table");
    table.style.tableLayout = "fixed";
    table.style.minWidth = "max-content";

    scrollWrapper.appendChild(table);

    table.dataset.playerOrder = JSON.stringify(players.map(p => p.player_id));

    // HEADER
    const headerRow = document.createElement("tr");

    const playerHeader = document.createElement("th");
    playerHeader.textContent = "Player";
    playerHeader.classList.add("col-player");
    headerRow.appendChild(playerHeader);

    const totalHeader = document.createElement("th");
    totalHeader.textContent = "Total";
    totalHeader.classList.add("col-player-total");
    headerRow.appendChild(totalHeader);

    for (let g = 1; g <= gameCount; g++) {
        const th = document.createElement("th");
        th.textContent = `G${g}`;
        th.classList.add("col-game");
        headerRow.appendChild(th);
    }

    table.appendChild(headerRow);

    // PLAYER ROWS
    for (const p of players) {
        const row = document.createElement("tr");

        const nameCell = document.createElement("td");
        nameCell.textContent = p.player_name;
        nameCell.classList.add("col-player", "sticky-player");
        row.appendChild(nameCell);

        const totalCell = document.createElement("td");
        totalCell.textContent = "0";
        totalCell.classList.add("total-cell", "col-player-total", "sticky-total");
        row.appendChild(totalCell);

        for (let g = 1; g <= gameCount; g++) {
            const td = document.createElement("td");
            td.classList.add("col-game");

            const input = document.createElement("input");
            input.type = "number";
            input.min = 0;
            input.max = 300;
            input.classList.add("score-input");

            input.addEventListener("change", async () => {
                let score = parseInt(input.value);

                // Number validation
                if (isNaN(score) || score < 0 || score > 300) {
                    alert("Invalid score.");
                    input.value = "";
                    return; // Do not record invalid score
                }

                try {
                    await apiPost("/session/score", {
                        session_id: sessionId,
                        player_id: p.player_id,
                        game_number: g,
                        score,
                        category,
                        location_id: locationId,
                        date
                    });

                    updateMobileTotals(table, players, gameCount);

                } catch (err) {
                    console.error("Score save failed:", err);
                }
            });

            td.appendChild(input);
            row.appendChild(td);
        }

        table.appendChild(row);
    }

    tableContainer.appendChild(scrollWrapper);
}

// ======================================================
// TOTALS
// ======================================================

function updateTotals(table, players, gameCount) {
    const totalCells = table.querySelectorAll(".total-cell");
    const playerOrder = JSON.parse(table.dataset.playerOrder);

    playerOrder.forEach((playerId, colIndex) => {
        let sum = 0;

        for (let g = 1; g <= gameCount; g++) {
            const row = table.rows[g];
            const input = row.cells[colIndex + 1].querySelector("input");
            if (input && input.value) sum += parseInt(input.value);
        }

        totalCells[colIndex].textContent = sum;
    });

    for (let g = 1; g <= gameCount; g++) {
        let rowSum = 0;

        const row = table.rows[g];
        const inputs = row.querySelectorAll("input");

        inputs.forEach(input => {
            if (input.value) rowSum += parseInt(input.value);
        });

        const totalCell = row.querySelector(".game-total-cell");
        totalCell.textContent = rowSum;
    }
}

function updateMobileTotals(table, players, gameCount) {
    const rows = table.querySelectorAll("tr");

    rows.forEach((row, rowIndex) => {
        if (rowIndex === 0) return;

        let sum = 0;
        const inputs = row.querySelectorAll("input");

        inputs.forEach(input => {
            if (input.value) sum += parseInt(input.value);
        });

        const totalCell = row.querySelector(".total-cell");
        if (totalCell) totalCell.textContent = sum;
    });
}
