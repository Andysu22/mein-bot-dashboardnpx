import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export const dynamic = 'force-dynamic';

export async function GET(req, { params }) {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const botToken = process.env.DISCORD_TOKEN;
    if (!botToken) return NextResponse.json([], { status: 200 }); // Leere Liste falls kein Bot

    try {
        const res = await fetch(`https://discord.com/api/v10/guilds/${id}/channels`, {
            headers: { Authorization: `Bot ${botToken}` },
            cache: 'no-store'
        });

        if (!res.ok) return NextResponse.json([], { status: res.status });

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
        return NextResponse.json([], { status: 500 });
    }
}