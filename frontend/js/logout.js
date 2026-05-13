async function logout() {
    await fetch("/logout", { method: "POST" });
    localStorage.removeItem("player_id");
    window.location.href = "login.html";
}
