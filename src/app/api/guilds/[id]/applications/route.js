import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/db";
import { Application } from "@/models/Application";

export async function GET(req, { params }) {
    // In neueren Next.js Versionen ist params ein Promise und muss erwartet werden
    const { id } = await params; 
    
    // 1. Session prüfen (Sicherheit)
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        // 2. Datenbank verbinden
        await connectDB();
        
        // 3. Bewerbungen suchen
        // Filter: guildId muss übereinstimmen
        // Sortierung: Neueste zuerst (createdAt: -1)
        // Limit: Max 50, damit es schnell bleibt
        const apps = await Application.find({ guildId: id })
            .sort({ createdAt: -1 })
            .limit(50)
            .lean();

        // 4. Ergebnis zurücksenden
        return NextResponse.json(apps);

    } catch (e) {
        console.error("[API Error] Applications Fetch failed:", e);
        // Falls was schiefgeht, leeres Array oder Fehler senden
        return NextResponse.json({ error: "DB Error" }, { status: 500 });
    }
}