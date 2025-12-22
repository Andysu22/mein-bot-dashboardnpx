import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/db";
import { Ticket } from "@/models/Ticket";

export async function GET(req, { params }) {
    const { id } = await params; // Server ID
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Optional: Hier Admin-Check einfügen (wie in settings route)

    try {
        await connectDB();
        
        // Lade alle Tickets für diesen Server, sortiert nach Datum (neueste zuerst)
        // Wir laden nur 'open' Tickets für die Übersicht, oder alle wenn du willst
        const tickets = await Ticket.find({ guildId: id })
            .sort({ createdAt: -1 })
            .limit(50) // Sicherheitslimit
            .lean();

        return NextResponse.json(tickets);
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: "DB Error" }, { status: 500 });
    }
}