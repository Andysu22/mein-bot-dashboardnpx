import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/db";
import { Application } from "@/models/Application";
import { ApplicationStats } from "@/models/ApplicationStats"; // <--- NEU

export async function GET(req, { params }) {
    const { id } = await params;
    
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        await connectDB();

        // 1. Stats Tabelle abrufen (Lifetime Counter)
        const statsDoc = await ApplicationStats.findOne({ guildId: id });
        
        // 2. Live Dokumente zählen (Status Counter)
        const [pending, accepted, declined, realCount] = await Promise.all([
            Application.countDocuments({ guildId: id, status: "pending" }),
            Application.countDocuments({ guildId: id, status: "accepted" }),
            Application.countDocuments({ guildId: id, status: "declined" }),
            Application.countDocuments({ guildId: id }) // Echte Anzahl Dokumente
        ]);

        // "Total" ist entweder der Wert aus Stats (falls höher) oder die echte Anzahl (Fallback)
        const total = Math.max(statsDoc?.totalApplications || 0, realCount);

        return NextResponse.json({ total, pending, accepted, declined });

    } catch (e) {
        console.error("[API Error] App Stats failed:", e);
        return NextResponse.json({ total: 0, pending: 0, accepted: 0, declined: 0 });
    }
}