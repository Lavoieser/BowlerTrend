// ======================================================
// ADMIN ACCESS CONTROL
// ======================================================
function checkAdmin() {
    fetch("/me", { credentials: "include" })
        .then(res => res.json())
        .then(user => {
            if (!user.active) {
                document.body.innerHTML =
                    "<h2>Your account is inactive.</h2><p>Please contact an administrator.</p>";
                return;
            }

            if (!user.is_admin) {
                document.getElementById("adminOnly").innerHTML =
                    "<p>You do not have admin access.</p>";
                return;
            }

            loadPlayers();
        });
}

document.addEventListener("DOMContentLoaded", async () => {
    await loadNav();
    checkAdmin();
});

// ======================================================
// MARK ROW AS DIRTY
// ======================================================
function markDirty(row) {
    row.classList.add("dirty");
    const saveBtn = row.querySelector(".save-btn");
    if (saveBtn) saveBtn.disabled = false;
}

// ======================================================
// LOAD PLAYERS
// ======================================================
async function loadPlayers() {
    const tbody = document.querySelector("#adminPlayersTable tbody");
    tbody.innerHTML = "";

    try {
        const players = await apiGet("/admin/players");

        players.forEach(p => {
            const tr = document.createElement("tr");
            tr.dataset.id = p.player_id;

            const statusColor = p.active ? "green" : "red";
            const statusText = p.active ? "Active" : "Inactive";

            tr.innerHTML = `
                <td>
                    <input type="text" 
                           class="admin-name"
                           value="${p.player_name}" 
                           data-field="player_name">
                </td>

                <td style="color:${statusColor}; font-weight:bold;">
                    ${statusText}
                </td>

                <td>
                    ${
                        p.active
                        ? `<button class="status-btn" data-action="deactivate">Deactivate</button>`
                        : `<button class="status-btn" data-action="activate">Activate</button>`
                    }
                    <button class="save-btn" disabled>Save</button>
                </td>
                
                <td>
                    <input type="checkbox" 
                           class="admin-checkbox"
                           data-field="is_admin"
                           ${p.is_admin ? "checked" : ""}>
                </td>
                
                <td>
                    <input type="text" 
                           class="admin-email"
                           value="${p.email || ""}" 
                           data-field="email">
                </td>
            `;

            // Mark row dirty when any input changes
            tr.querySelectorAll("input").forEach(input => {
                input.addEventListener("input", () => markDirty(tr));
            });

            // Save button
            tr.querySelector(".save-btn").addEventListener("click", () => savePlayer(tr));

            // Activate / Deactivate button
            tr.querySelector(".status-btn").addEventListener("click", () => {
                const action = tr.querySelector(".status-btn").dataset.action;
                if (action === "activate") activatePlayer(p.player_id);
                else deactivatePlayer(p.player_id);
            });

            tbody.appendChild(tr);
        });

    } catch (err) {
        console.error("Error loading players:", err);
        alert("Failed to load players.");
    }
}

// ======================================================
// SAVE PLAYER (name, email, admin)
// ======================================================
async function savePlayer(row) {
    const id = row.dataset.id;

    const name = row.querySelector('input[data-field="player_name"]').value.trim();
    const email = row.querySelector('input[data-field="email"]').value.trim();
    const is_admin = row.querySelector('input[data-field="is_admin"]').checked ? 1 : 0;

    if (!name) return alert("Player name cannot be empty.");

    try {
        await fetch(`/admin/players/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
                player_name: name,
                email: email,
                is_admin: is_admin
            })
        });

        row.classList.remove("dirty");
        row.querySelector(".save-btn").disabled = true;

        loadPlayers();

    } catch (err) {
        console.error("Error saving player:", err);
        alert("Failed to update player.");
    }
}

// ======================================================
// ACTIVATE / DEACTIVATE PLAYER
// ======================================================
async function deactivatePlayer(id) {
    await fetch(`/admin/players/${id}/deactivate`, {
        method: "PUT",
        credentials: "include"
    });
    loadPlayers();
}

async function activatePlayer(id) {
    await fetch(`/admin/players/${id}/activate`, {
        method: "PUT",
        credentials: "include"
    });
    loadPlayers();
}
