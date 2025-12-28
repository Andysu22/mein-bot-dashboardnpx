import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/db";
import { Ticket } from "@/models/Ticket";
import { TicketStats } from "@/models/TicketStats"; // Wichtig: Importieren!

export async function GET(req, { params }) {
    const { id } = await params; // (Next.js 15 Syntax)
    
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        await connectDB();
        
        // 1. Offene Tickets zählen wir IMMER LIVE aus der Ticket-Tabelle.
        // Die sind ja noch da (noch nicht gelöscht).
        const open = await Ticket.countDocuments({ guildId: id, status: 'open' });

        // 2. Für Gesamt/Woche/Geschlossen laden wir die Statistik-Tabelle
        const allStats = await TicketStats.find({ guildId: id }).lean();

        let total = 0;
        let closed = 0;
        let thisWeek = 0;

        // Datum von vor 7 Tagen berechnen (YYYY-MM-DD)
        const d = new Date();
        d.setDate(d.getDate() - 7);
        const dateStrLimit = d.toISOString().split('T')[0];

        for (const entry of allStats) {
            total += (entry.opened || 0);
            closed += (entry.closed || 0);

            // Wenn das Datum des Eintrags neuer/gleich vor 7 Tagen ist
            if (entry.date >= dateStrLimit) {
                thisWeek += (entry.opened || 0);
            }
        }

        // Falls die TicketStats noch leer sind (weil du das System gerade erst startest),
        // zählen wir zur Sicherheit auch die aktuell existierenden Tickets dazu.
        // Das verhindert, dass "Gesamt" kleiner ist als "Offen".
        if (total < open) total = open;

        return NextResponse.json({
            total,
            open,
            thisWeek,
            closed
        });
    } catch (e) {
        console.error("[API Error] Ticket Stats failed:", e);
        return NextResponse.json({ error: "DB Error" }, { status: 500 });
    }
}