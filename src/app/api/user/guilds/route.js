import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rateLimit"; 

// GLOBALER CACHE (im Arbeitsspeicher)
let cachedBotGuilds = null;
let lastFetchTime = 0;
const MIN_INTERVAL = 2000; // Mindestens 2 Sekunden Pause zwischen Discord-Calls

export const dynamic = 'force-dynamic';

export async function GET(req) {
    // 1. Eigener Rate Limit Check
    if (checkRateLimit(req)) {
         return NextResponse.json({ error: "Zu schnell! Bitte warten." }, { status: 429 });
    }

    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

    try {
        const botToken = process.env.DISCORD_TOKEN;
        const now = Date.now();

        // --- A) USER GUILDS (Immer versuchen, außer bei Auth-Fehlern) ---
        const userGuildsRes = await fetch("https://discord.com/api/users/@me/guilds", {
            headers: { Authorization: `Bearer ${session.accessToken}` },
            cache: 'no-store' 
        });

        if (!userGuildsRes.ok) {
            // Wenn Token abgelaufen (401), müssen wir das melden
            if (userGuildsRes.status === 401) {
                return NextResponse.json({ error: "Session abgelaufen" }, { status: 401 });
            }
            // Bei Rate Limit (429) vom User-Token können wir leider nichts machen -> Fehler
            console.warn(`[Discord User] Fehler: ${userGuildsRes.status}`);
            return NextResponse.json({ error: "Discord Rate Limit" }, { status: 429 });
        }

        const userGuilds = await userGuildsRes.json();
        if (!Array.isArray(userGuilds)) return NextResponse.json({ error: "API Fehler" }, { status: 500 });

        // --- B) BOT GUILDS (Der intelligente Teil) ---
        let botGuildIds = new Set();
        
        // 1. Haben wir gerade erst (vor < 2 sek) geladen? Dann nimm Cache!
        if (cachedBotGuilds && (now - lastFetchTime < MIN_INTERVAL)) {
            // console.log("Nutze 'Hot Cache' (Spam-Schutz)");
            botGuildIds = cachedBotGuilds;
        } 
        else if (botToken) {
            // 2. Versuche frische Daten zu laden
            try {
                const botGuildsRes = await fetch("https://discord.com/api/v10/users/@me/guilds", {
                    headers: { Authorization: `Bot ${botToken}` },
                    cache: 'no-store' // Wir wollen FRISCHE Daten
                });
                
                if (botGuildsRes.ok) {
                    // Juhu, frische Daten!
                    const botGuilds = await botGuildsRes.json();
                    if (Array.isArray(botGuilds)) {
                        const ids = new Set(botGuilds.map(g => g.id));
                        cachedBotGuilds = ids; // Cache aktualisieren
                        botGuildIds = ids;
                        lastFetchTime = now;
                    }
                } else if (botGuildsRes.status === 429) {
                    // 3. OHA! Rate Limit! -> Nimm den alten Cache (Fallback)
                    console.warn("Discord Rate Limit (Bot) -> Nutze Cache als Fallback");
                    if (cachedBotGuilds) botGuildIds = cachedBotGuilds;
                } else {
                    console.warn(`Bot Fetch Error: ${botGuildsRes.status}`);
                    if (cachedBotGuilds) botGuildIds = cachedBotGuilds;
                }
            } catch (e) {
                console.warn("Netzwerkfehler Bot Fetch", e);
                if (cachedBotGuilds) botGuildIds = cachedBotGuilds;
            }
        }

        // --- C) ZUSAMMENBAUEN ---
        const processedGuilds = userGuilds
            .filter(g => {
                const p = BigInt(g.permissions);
                return (p & BigInt(0x8)) === BigInt(0x8) || (p & BigInt(0x20)) === BigInt(0x20);
            })
            .map(g => ({
                id: g.id,
                name: g.name,
                icon: g.icon,
                hasBot: botGuildIds.has(g.id), // Hier nutzen wir die (frischen oder gecachten) Daten
                isPublic: g.features?.includes('COMMUNITY') || g.features?.includes('DISCOVERABLE')
            }));

        return NextResponse.json(processedGuilds);

    } catch (error) {
        console.error("[API Error]", error);
        return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
    }
}