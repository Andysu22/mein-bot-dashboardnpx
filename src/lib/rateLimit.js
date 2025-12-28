// src/lib/rateLimit.js
const trackers = new Map();

// ERLAUBT: 50 Anfragen pro 10 Sekunden pro IP
// Vorher war es 10. Da deine Seite beim Laden aber schon 6 Anfragen gleichzeitig macht,
// war das Limit viel zu niedrig. 50 ist ein guter Wert für Dashboards.
const LIMIT = 50; 
const WINDOW_MS = 10 * 1000;

function cleanup() {
    const now = Date.now();
    for (const [ip, data] of trackers.entries()) {
        if (now - data.startTime > WINDOW_MS) {
            trackers.delete(ip);
        }
    }
}
setInterval(cleanup, 2 * 60 * 1000); // Alle 2 Min aufräumen

export function checkRateLimit(req) {
    // Fallback für IP, falls Header fehlen
    const ip = req.headers.get("x-forwarded-for") || "unknown-ip";
    const now = Date.now();
    const data = trackers.get(ip) || { count: 0, startTime: now };

    // Wenn das Zeitfenster abgelaufen ist, Reset
    if (now - data.startTime > WINDOW_MS) {
        data.count = 0;
        data.startTime = now;
    }

    data.count++;
    trackers.set(ip, data);

    return data.count > LIMIT;
}