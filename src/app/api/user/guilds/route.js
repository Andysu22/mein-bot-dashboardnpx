import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic'; // Zwingt Next.js, diese Route NIEMALS zu cachen

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

    try {
        const botToken = process.env.DISCORD_TOKEN;
        
        // Fetch mit no-store, um Cache zu umgehen
        const userGuildsRes = await fetch("https://discord.com/api/users/@me/guilds", {
            headers: { Authorization: `Bearer ${session.accessToken}` },
            cache: 'no-store' 
        });
        const userGuilds = await userGuildsRes.json();

        const botGuildsRes = await fetch("https://discord.com/api/v10/users/@me/guilds", {
            headers: { Authorization: `Bot ${botToken}` },
            cache: 'no-store'
        });
        const botGuilds = await botGuildsRes.json();
        const botGuildIds = new Set(Array.isArray(botGuilds) ? botGuilds.map(g => g.id) : []);

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
                isPublic: g.features.includes('COMMUNITY') || g.features.includes('DISCOVERABLE')
            }));

        return NextResponse.json(processedGuilds);
    } catch (error) {
        return NextResponse.json({ error: "Fehler" }, { status: 500 });
    }
}