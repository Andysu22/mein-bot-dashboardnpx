import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rateLimit"; 

// ----------------------------------------------------------------------
// 1. CACHING SYSTEM (Verhindert Discord 429 Errors)
// ----------------------------------------------------------------------

// Cache für BOT Guilds (Global für den Bot)
let cachedBotGuilds = null;
let lastBotFetch = 0;
const BOT_CACHE_TTL = 30 * 1000; // 30 Sekunden

// Cache für USER Guilds (Pro User-Token)
// Map<AccessToken, { data: any, expiresAt: number }>
const userGuildsCache = new Map();
const USER_CACHE_TTL = 60 * 1000; // 60 Sekunden Cache pro User

// Aufräum-Interval: Löscht abgelaufene User-Caches alle 5 Minuten
setInterval(() => {
    const now = Date.now();
    for (const [token, cache] of userGuildsCache.entries()) {
        if (now > cache.expiresAt) userGuildsCache.delete(token);
    }
}, 5 * 60 * 1000);


export const dynamic = 'force-dynamic';

export async function GET(req) {
    // 1. Interner Spamschutz (Dein Rate Limit aus lib/rateLimit.js)
    if (checkRateLimit(req)) {
         return NextResponse.json({ error: "Zu schnell! Bitte warten." }, { status: 429 });
    }

    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

    try {
        const botToken = process.env.DISCORD_TOKEN;
        const now = Date.now();
        
        // ------------------------------------------------------------------
        // A) USER GUILDS (Mit Cache!)
        // ------------------------------------------------------------------
        let userGuilds = [];
        const cachedUser = userGuildsCache.get(session.accessToken);

        // Check: Haben wir gültige Daten im Cache?
        if (cachedUser && now < cachedUser.expiresAt) {
            userGuilds = cachedUser.data;
        } else {
            // Wenn NEIN: Frage Discord (das kostet "Rate Limit Punkte")
            const userGuildsRes = await fetch("https://discord.com/api/users/@me/guilds", {
                headers: { Authorization: `Bearer ${session.accessToken}` },
                cache: 'no-store' 
            });

            if (!userGuildsRes.ok) {
                if (userGuildsRes.status === 401) {
                    return NextResponse.json({ error: "Session abgelaufen" }, { status: 401 });
                }
                // Bei Discord Rate Limit (429) -> Warnung loggen
                console.warn(`[Discord API] User Guilds 429/Error: ${userGuildsRes.status}`);
                return NextResponse.json({ error: "Discord ist ausgelastet (429). Warte kurz." }, { status: 429 });
            }

            userGuilds = await userGuildsRes.json();
            
            if (!Array.isArray(userGuilds)) {
                return NextResponse.json({ error: "API Format Fehler" }, { status: 500 });
            }

            // Speichere das Ergebnis im Cache
            userGuildsCache.set(session.accessToken, {
                data: userGuilds,
                expiresAt: now + USER_CACHE_TTL
            });
        }

        // ------------------------------------------------------------------
        // B) BOT GUILDS (Auch mit Cache)
        // ------------------------------------------------------------------
        let botGuildIds = new Set();
        
        // Nutze Cache, wenn er frisch genug ist
        if (cachedBotGuilds && (now - lastBotFetch < BOT_CACHE_TTL)) {
            botGuildIds = cachedBotGuilds;
        } 
        else if (botToken) {
            try {
                const botGuildsRes = await fetch("https://discord.com/api/v10/users/@me/guilds", {
                    headers: { Authorization: `Bot ${botToken}` },
                    cache: 'no-store'
                });
                
                if (botGuildsRes.ok) {
                    const botGuilds = await botGuildsRes.json();
                    if (Array.isArray(botGuilds)) {
                        const ids = new Set(botGuilds.map(g => g.id));
                        cachedBotGuilds = ids;
                        botGuildIds = ids;
                        lastBotFetch = now;
                    }
                } else {
                    // Fallback auf alten Cache bei Fehler
                    console.warn(`[Discord API] Bot Guilds Error: ${botGuildsRes.status}`);
                    if (cachedBotGuilds) botGuildIds = cachedBotGuilds;
                }
            } catch (e) {
                console.warn("Netzwerkfehler Bot Fetch", e);
                if (cachedBotGuilds) botGuildIds = cachedBotGuilds;
            }
        }

        // ------------------------------------------------------------------
        // C) MERGE & FILTER
        // ------------------------------------------------------------------
        const processedGuilds = userGuilds
            .filter(g => {
                const p = BigInt(g.permissions);
                // Admin (0x8) oder Manage Guild (0x20)
                return (p & BigInt(0x8)) === BigInt(0x8) || (p & BigInt(0x20)) === BigInt(0x20);
            })
            .map(g => ({
                id: g.id,
                name: g.name,
                icon: g.icon,
                hasBot: botGuildIds.has(g.id),
                isPublic: g.features?.includes('COMMUNITY') || g.features?.includes('DISCOVERABLE')
            }));

        return NextResponse.json(processedGuilds);

    } catch (error) {
        console.error("[API Error]", error);
        return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
    }
}