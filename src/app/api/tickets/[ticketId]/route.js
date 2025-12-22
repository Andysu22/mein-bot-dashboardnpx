import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/db";
import { Ticket } from "@/models/Ticket";

// GET: Lädt den Chat-Verlauf eines Tickets
export async function GET(req, { params }) {
    const { ticketId } = await params;
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();
    const ticket = await Ticket.findById(ticketId);
    if (!ticket) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });

    const botToken = process.env.DISCORD_TOKEN;
    try {
        const url = `https://discord.com/api/v10/channels/${ticket.channelId}/messages?limit=50`;
        const res = await fetch(url, {
            headers: { Authorization: `Bot ${botToken}` },
            cache: 'no-store'
        });

        if (!res.ok) return NextResponse.json([]); 
        const messages = await res.json();
        // Umdrehen, damit neueste unten sind (für Chat-View)
        return NextResponse.json(messages.reverse());
    } catch (e) {
        return NextResponse.json([], { status: 500 });
    }
}

// POST: Nachricht senden oder Aktionen (Claim, Delete)
export async function POST(req, { params }) {
    const { ticketId } = await params;
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json(); 
    const botToken = process.env.DISCORD_TOKEN;

    await connectDB();
    const ticket = await Ticket.findById(ticketId);
    if (!ticket) return NextResponse.json({ error: "Ticket 404" }, { status: 404 });

    try {
        // A) NACHRICHT SENDEN
        if (body.action === 'send') {
            await fetch(`https://discord.com/api/v10/channels/${ticket.channelId}/messages`, {
                method: 'POST',
                headers: { Authorization: `Bot ${botToken}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: `**Support (Dashboard):** ${body.content}` })
            });
            return NextResponse.json({ success: true });
        }

        // B) CLAIMEN
        if (body.action === 'claim') {
            ticket.claimedBy = session.user.id || "Dashboard Admin"; 
            await ticket.save();
            return NextResponse.json({ success: true });
        }

        // C) LÖSCHEN
        if (body.action === 'delete') {
            await fetch(`https://discord.com/api/v10/channels/${ticket.channelId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bot ${botToken}` }
            });
            await Ticket.deleteOne({ _id: ticketId });
            return NextResponse.json({ success: true });
        }

    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: "Action failed" }, { status: 500 });
    }
    
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}