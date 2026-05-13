// ======================================================
// Login.js — Authenticate a player
// CS50 Final Project
// ======================================================

const nameInput = document.getElementById("nameInput");
const passwordInput = document.getElementById("passwordInput");
const loginBtn = document.getElementById("loginBtn");
const messageBox = document.getElementById("loginMessage");

// Allow pressing ENTER to trigger login
passwordInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
        loginBtn.click();
    }
});

// Login by clicking the button
loginBtn.addEventListener("click", async () => {

    const name = nameInput.value.trim();
    const password = passwordInput.value;

    if (!name || !password) {
        showMessage("Please enter name and password.", "error");
        return;
    }

    try {
        const res = await apiPost("/login", { name, password });

        if (res.success) {
            window.location.href = "index.html";
        } else {
            showMessage(res.error, "error");
        }

    } catch (err) {
        console.error("Login error:", err);
        showMessage("Server error. Please try again.", "error");
    }
});

// Display feedback message
function showMessage(text, type) {
    messageBox.textContent = text;
    messageBox.className = "message " + type;
}
