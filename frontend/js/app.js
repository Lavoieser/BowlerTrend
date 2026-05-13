// ======================================================
// App.js — Shared API helpers + session protection
// CS50 Final Project — All comments in English
// ======================================================

// currentUser hold the logged-in user's info, ex. is_admin
let currentUser = null;

// ------------------------------------------------------
// API HELPERS
// ------------------------------------------------------
async function apiGet(url) {
    const res = await fetch(url, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include"
    });

    // Try to parse JSON; if backend returned HTML (error), throw
    const text = await res.text();
    try {
        return JSON.parse(text);
    } catch {
        console.error("Invalid JSON from GET", url, text);
        throw new Error("Invalid JSON response");
    }
}

async function apiPost(url, data) {
    const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data)
    });

    const text = await res.text();
    try {
        return JSON.parse(text);
    } catch {
        console.error("Invalid JSON from POST", url, text);
        throw new Error("Invalid JSON response");
    }
}

// ------------------------------------------------------
// SESSION PROTECTION
// ------------------------------------------------------

// Pages that require authentication
const protectedPages = [
    "Index.html",
    "Sessions.html",
    "History.html",
    "Admin.html",
    "Teams.html",
    "Boules.html",
    "Lieux.html",
    "Stats.html"
];

// Determine current page
const currentPage = window.location.pathname.split("/").pop();

// Only check session on protected pages
if (protectedPages.includes(currentPage)) {
    checkSession();
}

// ------------------------------------------------------
// CHECK SESSION
// ------------------------------------------------------

async function checkSession() {
    try {
        const res = await apiGet("/me");

        // If backend says "not authenticated", redirect to login
        if (res.error) {
            window.location.href = "Login.html";
        }

    } catch (err) {
        // Any error → redirect to login
        console.error("Session check failed:", err);
        window.location.href = "Login.html";
    }
}

// ------------------------------------------------------
// NAVIGATION BAR AND USER PERMISSIONS FOR ADMIN LINKS
// ------------------------------------------------------
async function loadNav() {
    const res = await fetch("/nav", {
        credentials: "include"
    });
    document.querySelector("#navContainer .menu-inner").innerHTML = await res.text();
}

async function applyUserPermissions() {
    try {
        const res = await fetch("/me", {
            credentials: "include"
        });
        if (!res.ok) throw new Error("Not authenticated");

        currentUser = await res.json();
        currentUser.is_admin = Boolean(currentUser.is_admin);

        if (!currentUser.is_admin) {
            document.querySelectorAll(".admin-only").forEach(el => el.remove());
        }

    } catch {
        currentUser = null;
        document.querySelectorAll(".admin-only").forEach(el => el.remove());
    }
}
