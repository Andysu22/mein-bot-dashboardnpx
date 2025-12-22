// src/lib/rateLimit.js
const trackers = new Map();

// ERLAUBT: 10 Anfragen pro 10 Sekunden pro IP
// Das ist streng genug gegen Angriffe, aber locker genug für normales Klicken.
const LIMIT = 10;
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
    const ip = req.headers.get("x-forwarded-for") || "unknown-ip";
    const now = Date.now();
    const data = trackers.get(ip) || { count: 0, startTime: now };

    if (now - data.startTime > WINDOW_MS) {
        data.count = 0;
        data.startTime = now;
    }

    data.count++;
    trackers.set(ip, data);

    return data.count > LIMIT;
}