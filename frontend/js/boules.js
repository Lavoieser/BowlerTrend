// ===============================
// Load balls and players on page load
// ===============================
document.addEventListener("DOMContentLoaded", async () => {
    await loadNav();
    await applyUserPermissions();

    loadMyBalls();

    if (currentUser.is_admin) {
        document.getElementById("player-admin").style.display = "block";
        document.getElementById("add-ball-btn").style.display = "inline-block";
        loadPlayers();
        setupAddBall();
    } else {
        document.getElementById("player-user").style.display = "block";
        document.getElementById("player-name").value =
            currentUser.name || currentUser.player_name || "";
    }
});

// ===============================
// Load balls owned by logged-in user
// ===============================
function loadMyBalls() {
    const playerSelect = document.getElementById("player-select");
    const playerId = playerSelect ? playerSelect.value : null;

    let url = "/boules";
    if (playerId) {
        url += `?player_id=${playerId}`;
    }

    console.log("loadMyBalls fetch:", url);


    fetch(url, { credentials: "include" })
        .then(r => r.json())
        .then(data => {
            const activeList = document.getElementById("balls-list");
            const archivedList = document.getElementById("archived-balls-list");

            activeList.innerHTML = "";
            archivedList.innerHTML = "";

            const activeBalls = data.filter(ball => Number(ball.active) === 1);
            const inactiveBalls = data.filter(ball => Number(ball.active) === 0);

            // Active balls
            activeBalls.forEach(ball => {
                const div = document.createElement("div");
                div.className = "ball-item";

                const nameSpan = document.createElement("span");
                nameSpan.textContent = ball.boule_name;

                const deleteBtn = document.createElement("button");
                deleteBtn.textContent = "Delete";
                deleteBtn.className = "delete-btn";
                deleteBtn.addEventListener("click", () => {
                    deactivateBall(ball.boule_id);
                });

                div.appendChild(nameSpan);
                div.appendChild(deleteBtn);
                activeList.appendChild(div);
            });

            // Archived balls
            inactiveBalls.forEach(ball => {
                const div = document.createElement("div");
                div.className = "ball-item archived";
                div.textContent = ball.boule_name;
                archivedList.appendChild(div);
            });
        });
}

// ===============================
// Soft-delete (archive) a ball
// ===============================
function deactivateBall(bouleId) {
    if (!confirm("Archive this ball?")) {
        return;
    }

    fetch(`/boules/deactivate/${bouleId}`, {
        method: "POST",
        credentials: "include"
    })
    .then(response => {
        if (!response.ok) {
            throw new Error("Failed to archive ball");
        }
        loadMyBalls();   // refresh immediately
    })
    .catch(err => console.error("Error archiving ball:", err));
}

// ===============================
// Toggle archived balls section
// ===============================
document.getElementById("toggle-archived-btn").addEventListener("click", () => {
    const section = document.getElementById("archived-balls-section");
    const btn = document.getElementById("toggle-archived-btn");

    if (section.style.display === "none") {
        section.style.display = "block";
        btn.textContent = "Hide archived balls";
    } else {
        section.style.display = "none";
        btn.textContent = "Show archived balls";
    }
});

// ===============================
// Load players for dropdown
// ===============================
function loadPlayers() {
    Promise.all([
        fetch("/players", { credentials: "include" }).then(r => r.json()),
        fetch("/me", { credentials: "include" }).then(r => r.json())
    ])

    .then(([players, me]) => {
        const select = document.getElementById("player-select");
        select.innerHTML = "";

        players.forEach(player => {
            const option = document.createElement("option");
            option.value = player.player_id;
            option.textContent = player.player_name;

            if (player.player_id === me.player_id) {
                option.selected = true;
            }

            select.appendChild(option);
        });
        // À la fin de loadPlayers(), après avoir rempli le select
        select.onchange = () => {
            console.log("player-select changed to:", select.value);
            loadMyBalls();
        };

        console.log("player-select initial value:", select.value);
        loadMyBalls();

   })
    .catch(err => console.error("Error loading players:", err));
}

// ===============================
// Add a new ball
// ===============================
function setupAddBall() {
    document.getElementById("add-ball-btn").addEventListener("click", () => {
        const name = document.getElementById("ball-name").value.trim();
        const playerId = document.getElementById("player-select").value;

        if (!name) {
            return;
        }

        fetch("/boules", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
                boule_name: name,
                player_id: parseInt(playerId)
            })
        })
        .then(response => response.json())
        .then(result => {
            if (result.status === "ok") {
                document.getElementById("ball-name").value = "";
                loadMyBalls();
            }
        })
        .catch(err => console.error("Error adding ball:", err));
    });
}
