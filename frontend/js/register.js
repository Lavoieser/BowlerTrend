// ======================================================
// Register.js — Create a new player account
// CS50 Final Project — All comments in English
// ======================================================

const nameInput = document.getElementById("nameInput");
const emailInput = document.getElementById("emailInput");
const passwordInput = document.getElementById("passwordInput");
const confirmInput = document.getElementById("confirmInput");
const registerBtn = document.getElementById("registerBtn");
const messageBox = document.getElementById("registerMessage");

// Register only happens when clicking the button
registerBtn.addEventListener("click", async () => {

    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const confirm = confirmInput.value;

    if (!name || !password || !confirm) {
        showMessage("Name and password are required.", "error");
        return;
    }

    if (password !== confirm) {
        showMessage("Passwords do not match.", "error");
        return;
    }

    try {
        const res = await apiPost("/register", {
            name,
            email: email || null,
            password
        });

        if (res.success) {
            showMessage("Registration successful! Redirecting...", "success");
            setTimeout(() => window.location.href = "Login.html", 1500);
        } else {
            showMessage(res.error || "Registration failed.", "error");
        }

    } catch (err) {
        console.error("Register error:", err);
        showMessage("Server error. Please try again.", "error");
    }
});

// Display feedback message
function showMessage(text, type) {
    messageBox.textContent = text;
    messageBox.className = "message " + type;
}
