import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/db";
import { Ticket } from "@/models/Ticket";

export async function GET(req, { params }) {
    // In Next.js 15 ist params ein Promise
    const { id } = await params; 
    
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        await connectDB();
        
        // 1. Tickets aus der DB holen
        const tickets = await Ticket.find({ guildId: id })
            .sort({ createdAt: -1 })
            .limit(50)
            .lean();

        const botToken = process.env.DISCORD_TOKEN;

        // 2. Tickets mit echten Discord-Daten (Name & Avatar) anreichern
        const enrichedTickets = await Promise.all(tickets.map(async (ticket) => {
            try {
                // Wir fragen die Discord API nach dem User, der das Ticket erstellt hat
                const userRes = await fetch(`https://discord.com/api/v10/users/${ticket.ownerId}`, {
                    headers: { Authorization: `Bot ${botToken}` },
                    next: { revalidate: 3600 } // Cache für 1 Stunde
                });
                
                if (userRes.ok) {
                    const userData = await userRes.json();
                    return {
                        ...ticket,
                        // Diese Felder braucht dein Frontend für die Anzeige:
                        userTag: userData.global_name || userData.username,
                        userAvatar: userData.avatar 
                            ? `https://cdn.discordapp.com/avatars/${userData.id}/${userData.avatar}.png`
                            : `https://cdn.discordapp.com/embed/avatars/${userData.discriminator % 5}.png`
                    };
                }
            } catch (err) {
                console.error("Discord Fetch failed for user:", ticket.ownerId);
            }
            // Fallback, falls der User nicht gefunden wird
            return { ...ticket, userTag: "Unbekannter User", userAvatar: null };
        }));

        return NextResponse.json(enrichedTickets);
    } catch (e) {
        console.error("[API Error] Tickets Fetch failed:", e);
        return NextResponse.json({ error: "DB Error" }, { status: 500 });
    }
}