document.addEventListener("DOMContentLoaded", async () => {

    const statsContainer = document.getElementById("statsContainer");
    if (!statsContainer) return;

    await loadNav();
    await applyUserPermissions();
    await loadStats();

});

let rawData = [];
let chartProgress = null;
let chartHistogram = null;

async function loadStats() {
    // 1. Récupérer l'utilisateur
    const me = await fetch("/me").then(r => r.json());
    document.getElementById("playerName").textContent = me.player_name;

    // 2. Récupérer toutes les parties
    rawData = await fetch(`/stats/player/${me.player_id}`).then(r => r.json());

    if (!rawData.length) {
        alert("No games recorded yet.");
        return;
    }

    // Tri chronologique réel
    rawData.sort((a, b) => new Date(a.date) - new Date(b.date));

    // 3. Initialiser les dates par défaut
    if (!document.getElementById("paramStart").value) {
        document.getElementById("paramStart").value = rawData[0].date;
    }
    if (!document.getElementById("paramEnd").value) {
        document.getElementById("paramEnd").value = new Date().toISOString().slice(0, 10);
    }

    reloadStats();
}

    // Reload statistics when filtering parameters change
function reloadStats() {
    const MB = parseInt(document.getElementById("paramMB").value);
    const ET = parseInt(document.getElementById("paramET").value);
    const start = document.getElementById("paramStart").value;
    const end = document.getElementById("paramEnd").value;

    // Filtrer les données
    const data = rawData.filter(g => g.date >= start && g.date <= end);
    const scores = data.map(g => g.score);

    if (scores.length === 0) {
        alert("Aucune partie dans cette période.");
        return;
    }

    // --- CALCULS ---

    // Moyenne mobile
    const movingAvg = movingAverage(scores, MB);

    // Médiane
    const median = computeMedian(scores);

    // Écart-type
    const stddev = computeStdDev(scores.slice(-ET));

    // Meilleur score
    const best = Math.max(...scores);

    // Tendance (régression linéaire)
    const trend = computeTrend(scores);

    // Affichage
    document.getElementById("statMovingAvg").textContent = movingAvg.at(-1).toFixed(0);
    document.getElementById("statMedian").textContent = median.toFixed(0);
    document.getElementById("statStdDev").textContent = stddev.toFixed(0);
    document.getElementById("statBest").textContent = best;
    document.getElementById("statCount").textContent = scores.length;

    document.getElementById("statTrend").textContent =
        trend > 0.01 ? "🔼 positive" :
        trend < -0.01 ? "🔽 négative" :
        "➖ neutre";

    // --- GRAPHIQUES ---
    drawProgressChart(data, movingAvg, stddev);
    drawHistogram(scores);
}

// ----------------------
// CALCULS STATISTIQUES
// ----------------------

function movingAverage(arr, windowSize) {
    const result = [];
    for (let i = 0; i < arr.length; i++) {
        const start = Math.max(0, i - windowSize + 1);
        const slice = arr.slice(start, i + 1);
        result.push(slice.reduce((a, b) => a + b, 0) / slice.length);
    }
    return result;
}

function computeMedian(arr) {
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ?
        (sorted[mid - 1] + sorted[mid]) / 2 :
        sorted[mid];
}

function computeStdDev(arr) {
    if (arr.length === 0) return 0;
    const avg = arr.reduce((a, b) => a + b, 0) / arr.length;
    const variance = arr.map(x => (x - avg) ** 2).reduce((a, b) => a + b, 0) / arr.length;
    return Math.sqrt(variance);
}

function computeTrend(scores) {
    const n = scores.length;
    const x = [...Array(n).keys()];
    const y = scores;

    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((a, b, i) => a + b * y[i], 0);
    const sumX2 = x.reduce((a, b) => a + b * b, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX ** 2);
    return slope;
}

// ----------------------
// GRAPHIQUES
// ----------------------

function drawProgressChart(data, movingAvg, stddev) {
    // 1. Axe X = numéro de partie
    const labels = data.map((_, i) => i + 1);
    const scores = data.map(g => g.score);

    const upper = movingAvg.map(m => m + 2 * stddev);

    if (chartProgress) chartProgress.destroy();

    chartProgress = new Chart(document.getElementById("chartProgress"), {
        type: "line",
        data: {
            labels,
            datasets: [
                {
                    label: "Scores",
                    data: scores,
                    borderColor: "blue",
                    pointRadius: 3,
                    showLine: false
                },
                {
                    label: "Moyenne mobile",
                    data: movingAvg,
                    borderColor: "red",
                    fill: false,
                    pointRadius: 0   // 2. Ligne continue
                },
                {
                    label: "Zone 95%",
                    data: upper,
                    borderColor: "orange",
                    borderDash: [5, 5],
                    pointRadius: 0
                }
                // 3. Dataset -2σ retiré
            ]
        },
        options: {
            scales: {
                x: {
                    title: {
                        display: true,
                        text: "Parties (1 → n)"
                    }
                },
                y: {
                    min: 100,
                    max: 300
                }
            }
        }
    });
}

function drawHistogram(scores) {
    const bins = Array(20).fill(0); // 100–300 par bandes de 10

    scores.forEach(s => {
        const idx = Math.floor((s - 100) / 10);
        if (idx >= 0 && idx < bins.length) bins[idx]++;
    });

    const labels = bins.map((_, i) => `${100 + i * 10}–${109 + i * 10}`);

    if (chartHistogram) chartHistogram.destroy();

    chartHistogram = new Chart(document.getElementById("chartHistogram"), {
        type: "bar",
        data: {
            labels,
            datasets: [{
                label: "Fréquence",
                data: bins,
                backgroundColor: "green"
            }]
        }
    });
}
