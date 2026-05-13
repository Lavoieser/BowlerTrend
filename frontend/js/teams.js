// ======================================================
// Teams.js — Display teams, expand members, delete team
// ======================================================

document.addEventListener("DOMContentLoaded", async () => {

    // Container where teams will be displayed
    const teamsContainer = document.getElementById("teamsContainer");
    if (!teamsContainer) return;

    await loadNav();
    await applyUserPermissions();

    loadTeams()

    // ======================================================
    // LOAD TEAMS
    // ======================================================
async function loadTeams() {
    teamsContainer.innerHTML = ""; // reset container

    try {
        const teams = await apiGet("/teams");

        if (teams.length === 0) {
            teamsContainer.innerHTML = "<p>No teams created yet.</p>";
            return;
        }

        teams.forEach(team => {

            // Main row container
            const row = document.createElement("div");
            row.className = "team-row";   // <-- your new grid layout

            // Column 1 — Team name
            const nameSpan = document.createElement("span");
            nameSpan.className = "team-name";
            nameSpan.textContent = team.team_name;

            // Column 2 — Toggle button
            const toggleBtn = document.createElement("button");
            toggleBtn.className = "toggle-btn";
            toggleBtn.textContent = "Show";
            toggleBtn.dataset.teamId = team.team_id;

            // Column 3 — Delete icon
            const deleteBtn = document.createElement("span");
            deleteBtn.className = "delete-icon";
            deleteBtn.textContent = "🗑️";
            deleteBtn.dataset.teamId = team.team_id;

            // Add the 3 columns to the row
            row.appendChild(nameSpan);
            row.appendChild(toggleBtn);
            row.appendChild(deleteBtn);

            // Members list (hidden by default)
            const membersDiv = document.createElement("div");
            membersDiv.className = "members-list";
            membersDiv.style.display = "none";

            // Add row + members list to container
            teamsContainer.appendChild(row);
            teamsContainer.appendChild(membersDiv);

            // Event listeners
            toggleBtn.addEventListener("click", () => {
                toggleMembers(team.team_id, membersDiv);
            });

            deleteBtn.addEventListener("click", () => {
                deleteTeam(team.team_id, team.team_name);
            });
        });

    } catch (err) {
        console.error("Error loading teams:", err);
        teamsContainer.innerHTML = "<p>Error loading teams.</p>";
    }
}

    // ======================================================
    // TOGGLE MEMBERS LIST
    // ======================================================

    async function toggleMembers(teamId, container) {
        if (container.style.display === "block") {
            container.style.display = "none";
            container.innerHTML = "";
            return;
        }

        try {
            const players = await apiGet(`/team_players/${teamId}`);

            if (players.length === 0) {
                container.innerHTML = "<p class='member-item'>(No members)</p>";
            } else {
                players.forEach(p => {
                    const pDiv = document.createElement("div");
                    pDiv.className = "member-item";
                    pDiv.textContent = "- " + p.player_name;
                    container.appendChild(pDiv);
                });
            }

            container.style.display = "block";

        } catch (err) {
            console.error("Error loading team members:", err);
            container.innerHTML = "<p class='member-item'>Error loading members.</p>";
            container.style.display = "block";
        }
    }

    // ======================================================
    // DELETE TEAM
    // ======================================================

    async function deleteTeam(teamId, teamName) {
        const confirmDelete = confirm(
            `Are you sure you want to delete the team "${teamName}"?\nThis action cannot be undone.`
        );

        if (!confirmDelete) return;

        try {
            await fetch(`/delete_team/${teamId}`, { method: "DELETE" });
            alert("Team deleted successfully.");
            loadTeams(); // refresh list

        } catch (err) {
            console.error("Error deleting team:", err);
            alert("Error deleting team.");
        }
    }
});