// src/lib/rateLimit.js
const trackers = new Map();

// ERLAUBT: 50 Anfragen pro 10 Sekunden pro IP
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
    // 1. Versuche den Header zu lesen
    let ip = req.headers.get("x-forwarded-for");

    // 2. Falls mehrere IPs drinstehen (durch Proxies), nimm die erste (die echte Client-IP)
    if (ip && ip.includes(',')) {
        ip = ip.split(',')[0].trim();
    }

    // 3. Fallback, falls Header leer
    if (!ip) {
        ip = req.headers.get("x-real-ip") || "unknown-ip";
    }

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