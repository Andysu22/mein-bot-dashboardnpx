import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { checkRateLimit } from "@/lib/rateLimit"; // <--- IMPORT

export async function GET(request, { params }) {
    // 1. Rate Limit
    if (checkRateLimit(request)) {
         return NextResponse.json({ count: 0 }, { status: 429 });
    }

    const { id } = await params;

    // 2. Auth Check (Sicherheit!)
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const botToken = process.env.DISCORD_TOKEN;

    try {
        const res = await fetch(`https://discord.com/api/v10/guilds/${id}?with_counts=true`, {
            headers: { Authorization: `Bot ${botToken}` },
            next: { revalidate: 60 } // Cache für 60sek
        });
        
        // Wenn Bot nicht drauf ist oder Fehler -> 0 zurückgeben
        if (!res.ok) return NextResponse.json({ count: 0 });

        const data = await res.json();
        return NextResponse.json({ 
            count: data.approximate_member_count || 0 
        });
    } catch (e) {
        return NextResponse.json({ count: 0 }, { status: 500 });
    }
}