document.addEventListener("DOMContentLoaded", async () => {
    await loadNav();
    await applyUserPermissions();
    await loadLieux();
});

// Check if user is authenticated by calling /me endpoint
async function checkAuth() {
    const response = await fetch("/me");

    if (response.status === 401) {
        window.location.href = "login.html";
        return;
    }
}

checkAuth();

async function loadLieux() {
    const lieux = await apiGet("/lieux");

    const container = document.getElementById("lieuxList");
    container.innerHTML = "";

    lieux.forEach(l => {
        const row = document.createElement("div");
        row.classList.add("lieu-row");

        row.innerHTML = `
            <span class="lieu-name">${l.lieu_name}</span>
            <button class="delete-lieu" data-id="${l.lieu_id}">Delete</button>
        `;

        container.appendChild(row);
    });
}


async function addLieu() {
    const lieuName = document.getElementById("lieu-name").value.trim();

    if (!lieuName) {
        alert("Veuillez entrer un nom de lieu.");
        return;
    }

    const response = await fetch("/lieux", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ lieu_name: lieuName })
    });

    const data = await response.json();

    if (response.ok) {
        alert("Lieu ajouté !");
        document.getElementById("lieu-name").value = "";
        loadLieux(); // recharge la liste
    } else {
        alert("Erreur : " + data.error);
    }
}

document.addEventListener("click", async (e) => {
    if (e.target.classList.contains("delete-lieu")) {
        const id = e.target.dataset.id;
        await fetch(`/lieux/${id}`, { method: "DELETE" });
        loadLieux(); // recharge la liste
    }
});
