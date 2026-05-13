// ======================================================
// CreateTeam.js — Create a team and assign members
// ======================================================

document.addEventListener("DOMContentLoaded", () => {
    const membersSelect = document.getElementById("membersSelect");
    if (!membersSelect) return;

    // Form elements
    const teamNameInput = document.getElementById("teamName");
    const captainSelect = document.getElementById("captainSelect");
    const createTeamBtn = document.getElementById("createTeamBtn");
    const messageBox = document.getElementById("teamMessage");

    // Load players when the page loads
    loadPlayers();

    // ======================================================
    // LOAD PLAYERS INTO MEMBERS LIST
    // ======================================================

async function loadPlayers() {
    try {

         // Fill players list
        let players = await apiGet("/players");
        //
        players = players.filter(p => p.active == 1);

        membersSelect.innerHTML = "";
        players.forEach(p => {
            const opt = document.createElement("option");
            opt.value = p.player_id;
            opt.textContent = p.player_name;
            membersSelect.appendChild(opt);
        });

        // Captain list starts empty (except "No captain")
        resetCaptainList();

    } catch (err) {
        console.error("Error loading players:", err);
        showMessage("Unable to load players.", "error");
    }
}

    // ======================================================
    // UPDATE CAPTAIN LIST WHEN MEMBERS CHANGE
    // ======================================================

    membersSelect.addEventListener("change", () => {
        updateCaptainList();
    });

    function resetCaptainList() {
        captainSelect.innerHTML = '<option value="">No captain</option>';
    }

    function updateCaptainList() {
        resetCaptainList();

        const selectedMembers = Array.from(membersSelect.selectedOptions);

        selectedMembers.forEach(opt => {
            const cOpt = document.createElement("option");
            cOpt.value = opt.value;
            cOpt.textContent = opt.textContent;
            captainSelect.appendChild(cOpt);
        });
    }

    // ======================================================
    // CREATE TEAM
    // ======================================================

    createTeamBtn.addEventListener("click", async () => {

        const teamName = teamNameInput.value.trim();
        const selectedMembers = Array.from(membersSelect.selectedOptions)
            .map(opt => opt.value);
        const captainId = captainSelect.value || null;

        // ----------------------------
        // Validation
        // ----------------------------
        if (!teamName) {
            showMessage("Team name is required.", "error");
            return;
        }

        if (selectedMembers.length === 0) {
            showMessage("Select at least one member.", "error");
            return;
        }

        if (selectedMembers.length > 6) {
            showMessage("A team cannot have more than 6 members.", "error");
            return;
        }

        // ----------------------------
        // Create team
        // ----------------------------
        try {
            const res = await apiPost("/create_team", {
                team_name: teamName
            });

            if (!res.team_id) {
                showMessage("Error creating team.", "error");
                return;
            }

            const teamId = res.team_id;

            // ----------------------------
            // Add members
            // ----------------------------
            for (const memberId of selectedMembers) {
                await apiPost("/join_team", {
                    team_id: teamId,
                    player_id: memberId,
                    role: (captainId === memberId ? "Captain" : null)
                });
            }

            // ----------------------------
            // Success
            // ----------------------------
            showMessage("Team created successfully!", "success");

            // Reset form
            teamNameInput.value = "";
            membersSelect.selectedIndex = -1;
            resetCaptainList();

            // Refresh team list on Teams page (if open)
            if (typeof loadTeams === "function") {
                loadTeams();
            }

        } catch (err) {
            console.error("Team creation error:", err);
            showMessage("Server error. Please try again.", "error");
        }
    });

    // ======================================================
    // MESSAGE DISPLAY
    // ======================================================

    function showMessage(text, type) {
        messageBox.textContent = text;
        messageBox.className = "message " + type;
    }
});