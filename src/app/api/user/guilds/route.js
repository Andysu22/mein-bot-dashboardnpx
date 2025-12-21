import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { NextResponse } from "next/server";

// Zwingt Next.js, immer frisch zu laden (kein Caching der Route)
export const dynamic = 'force-dynamic';

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

    try {
        const botToken = process.env.DISCORD_TOKEN;
        
        // 1. Echte Anfrage an Discord
        const userGuildsRes = await fetch("https://discord.com/api/users/@me/guilds", {
            headers: { Authorization: `Bearer ${session.accessToken}` },
            cache: 'no-store' 
        });

        // WICHTIG: Wenn Discord zickt (Rate Limit oder Token weg), fangen wir das hier ab:
        if (!userGuildsRes.ok) {
            console.warn(`[Discord API Warnung] Status: ${userGuildsRes.status} (429=Warten, 401=Neu einloggen)`);
            return NextResponse.json(
                { error: "Discord API Fehler (Rate Limit oder Auth)" }, 
                { status: userGuildsRes.status }
            );
        }

        const userGuilds = await userGuildsRes.json();

        // Sicherheitsnetz: Falls Discord Quatsch schickt
        if (!Array.isArray(userGuilds)) {
            return NextResponse.json({ error: "Ungültige Daten von Discord" }, { status: 500 });
        }

        // 2. Bot Guilds laden (Optional, darf fehlschlagen)
        let botGuildIds = new Set();
        if (botToken) {
            try {
                const botGuildsRes = await fetch("https://discord.com/api/v10/users/@me/guilds", {
                    headers: { Authorization: `Bot ${botToken}` },
                    cache: 'no-store'
                });
                if (botGuildsRes.ok) {
                    const botGuilds = await botGuildsRes.json();
                    if (Array.isArray(botGuilds)) {
                        botGuilds.map(g => g.id).forEach(id => botGuildIds.add(id));
                    }
                }
            } catch (e) {
                console.warn("Konnte Bot-Server nicht laden (Token falsch?)", e);
            }
        }

        // 3. Filtern (Nur Admins zeigen)
        const processedGuilds = userGuilds
            .filter(g => {
                const p = BigInt(g.permissions);
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
        console.error("[API Error] Interner Fehler:", error);
        return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
    }
}