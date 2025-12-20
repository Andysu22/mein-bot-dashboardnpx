import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/db";
import { GuildSettings } from "@/models/GuildSettings";
import { z } from "zod"; // <--- WICHTIG: Zod für Validierung

// --- 1. DAS SICHERHEITS-SCHEMA ---
// Hier definieren wir strikt, was in die Datenbank darf.
// Alles andere wird automatisch entfernt.
const settingsSchema = z.object({
  // Tickets
  ticketsEnabled: z.boolean().optional(),
  logChannelId: z.string().nullable().optional(),
  supportRoleId: z.string().nullable().optional(),
  ticketCategoryId: z.string().nullable().optional(),
  ticketLanguage: z.string().optional(),
  panelChannelId: z.string().nullable().optional(),
  panelMessageId: z.string().nullable().optional(),
  deeplApiKey: z.string().nullable().optional(),
  adminRoles: z.array(z.string()).optional(),

  // TempVC
  tempVcEnabled: z.boolean().optional(),
  creatorChannelId: z.string().nullable().optional(),
  tempCategoryChannelId: z.string().nullable().optional(),
  tempVcAdminRoleId: z.string().nullable().optional(),

  // Applications
  appPanelChannelId: z.string().nullable().optional(),
  appReviewChannelId: z.string().nullable().optional(),
  appPanelMessageId: z.string().nullable().optional(),
  applicantRoleId: z.string().nullable().optional(),
  appStaffRoleId: z.string().nullable().optional(),
  
  // WICHTIG: coerce.number wandelt Strings ("7") in Zahlen (7) um
  // .min(0).max(365) verhindert unsinnige Werte
  appDeclineCooldownDays: z.coerce.number().min(0).max(365).optional(),
  
  translatorMinRoleId: z.string().nullable().optional(),
});

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
export async function GET(req, props) {
  const params = await props.params;
  const { guildId } = params;

  // 1. Session prüfen
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Admin-Rechte prüfen
  const isAdmin = await checkAdmin(session.accessToken, guildId);
  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // 3. Datenbank verbinden & Daten laden
  await connectDB();
  const settings = await GuildSettings.findOne({ guildId }).lean();

  // Leeres Objekt zurückgeben, falls noch keine Settings existieren
  return NextResponse.json(settings || {});
}

// --- POST: Einstellungen speichern ---
export async function POST(req, props) {
  const params = await props.params;
  const { guildId } = params;

  // 1. Session prüfen
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Admin-Rechte prüfen
  const isAdmin = await checkAdmin(session.accessToken, guildId);
  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    // 3. Daten aus dem Request lesen
    const body = await req.json();

    // 4. VALIDIERUNG MIT ZOD
    // parse() prüft die Daten und wirft unnötige Felder (wie _id, guildId) raus
    const validatedData = settingsSchema.parse(body);

    // 5. Speichern
    await connectDB();
    const updatedSettings = await GuildSettings.findOneAndUpdate(
      { guildId },
      { $set: validatedData }, // Wir speichern NUR die geprüften Daten
      { upsert: true, new: true }
    );

    return NextResponse.json(updatedSettings);

  } catch (error) {
    // Falls die Validierung fehlschlägt (z.B. Cooldown = 5000 Tage)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Ungültige Daten", details: error.errors },
        { status: 400 }
      );
    }
    
    // Sonstige Server-Fehler
    console.error("Datenbank Fehler:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}