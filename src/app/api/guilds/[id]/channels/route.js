import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export const dynamic = 'force-dynamic';

export async function GET(req, { params }) {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const botToken = process.env.DISCORD_TOKEN;
    
    // Fehler logging, falls Token fehlt
    if (!botToken) {
        console.error("[API Error] DISCORD_TOKEN is missing in .env");
        return NextResponse.json([], { status: 200 }); 
    }

    try {
        const res = await fetch(`https://discord.com/api/v10/guilds/${id}/channels`, {
            headers: { Authorization: `Bot ${botToken}` },
            cache: 'no-store'
        });

        if (!res.ok) {
            console.warn(`[Discord API] Fetch Channels failed for guild ${id}. Status: ${res.status}`);
            // Wenn 403/404 kommt, geben wir leeres Array, damit Frontend nicht abstürzt
            return NextResponse.json([], { status: 200 });
        }

        const channels = await res.json();
        
        // Wir sortieren die Channels für bessere Übersicht
        // Types: 0=Text, 2=Voice, 4=Category
        const simplified = channels.map(c => ({
            id: c.id,
            name: c.name,
            type: c.type,
            parentId: c.parent_id,
            position: c.position
        })).sort((a, b) => a.position - b.position);

        return NextResponse.json(simplified);
    } catch (e) {
        console.error("[API Error] Fetch Channels Exception:", e);
        return NextResponse.json([], { status: 500 });
    }
}