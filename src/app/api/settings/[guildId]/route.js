import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/db";
import { GuildSettings } from "@/models/GuildSettings";

// Hilfsfunktion: Prüft bei Discord, ob der User Admin auf dem Server ist
async function checkAdmin(accessToken, guildId) {
  const res = await fetch("https://discord.com/api/users/@me/guilds", {
    headers: { Authorization: `Bearer ${accessToken}` },
    next: { revalidate: 60 } // Cache für 60 Sekunden
  });

  if (!res.ok) return false;

  const guilds = await res.json();
  const guild = guilds.find((g) => g.id === guildId);

  if (!guild) return false;

  // Prüfe "Manage Server" Berechtigung (0x20)
  return (BigInt(guild.permissions) & BigInt(0x20)) === BigInt(0x20);
}

// --- GET: Einstellungen laden ---
export async function GET(req, { params }) {
  // 1. Session prüfen
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Parameter auslesen (in Next.js 15 muss params gewartet werden)
  const { guildId } = await params;

  // 3. Admin-Rechte prüfen
  const isAdmin = await checkAdmin(session.accessToken, guildId);
  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // 4. Datenbank verbinden & Daten laden
  await connectDB();
  const settings = await GuildSettings.findOne({ guildId }).lean();

  // Leeres Objekt zurückgeben, falls noch keine Settings existieren
  return NextResponse.json(settings || {});
}

// --- POST: Einstellungen speichern ---
export async function POST(req, { params }) {
  // 1. Session prüfen
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Parameter auslesen
  const { guildId } = await params;

  // 3. Admin-Rechte prüfen
  const isAdmin = await checkAdmin(session.accessToken, guildId);
  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // 4. Daten aus dem Request lesen
  const body = await req.json();

  // Sicherheits-Check: Verhindern, dass jemand die guildId im Body manipuliert
  delete body.guildId; 
  delete body._id;

  // 5. Speichern (Update oder Erstellen)
  await connectDB();
  const updatedSettings = await GuildSettings.findOneAndUpdate(
    { guildId },
    { $set: body },
    { upsert: true, new: true } // Erstellt Eintrag, falls nicht vorhanden
  );

  return NextResponse.json(updatedSettings);
}