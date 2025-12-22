import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/db";
import { Ticket } from "@/models/Ticket";

export async function GET(req, { params }) {
    // Wichtig: params ist in Next.js 15 ein Promise
    const { id } = await params; 
    
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        await connectDB();
        
        // Lädt alle Tickets für diesen Server, sortiert nach Datum (neueste zuerst)
        const tickets = await Ticket.find({ guildId: id })
            .sort({ createdAt: -1 })
            .limit(50) // Sicherheitslimit
            .lean();

        return NextResponse.json(tickets);
    } catch (e) {
        console.error("[API Error] Tickets Fetch failed:", e);
        return NextResponse.json({ error: "DB Error" }, { status: 500 });
    }
}