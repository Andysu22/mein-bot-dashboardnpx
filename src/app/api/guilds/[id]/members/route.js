import { NextResponse } from "next/server";

export async function GET(request, { params }) {
    const { id } = await params;
    const botToken = process.env.DISCORD_TOKEN;

    try {
        const res = await fetch(`https://discord.com/api/v10/guilds/${id}?with_counts=true`, {
            headers: { Authorization: `Bot ${botToken}` }
        });
        const data = await res.json();
        
        return NextResponse.json({ 
            count: data.approximate_member_count || 0 
        });
    } catch (e) {
        return NextResponse.json({ count: 0 }, { status: 500 });
    }
}