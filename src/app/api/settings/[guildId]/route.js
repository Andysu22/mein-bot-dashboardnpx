import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/db";
import { GuildSettings } from "@/models/GuildSettings";
import { z } from "zod";

// --- 1. DAS SICHERHEITS-SCHEMA (ZOD) ---
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
  
  // Zahlen validieren
  appDeclineCooldownDays: z.coerce.number().min(0).max(365).optional(),
  
  translatorMinRoleId: z.string().nullable().optional(),

  botNickname: z.string().max(32).nullable().optional(),
});

// --- HELPER: Bot Nickname ändern ---
async function updateBotNickname(guildId, nickname) {
  const botToken = process.env.DISCORD_TOKEN;
  if (!botToken) return;

  try {
    const url = `https://discord.com/api/v10/guilds/${guildId}/members/@me`;
    const payload = { nick: nickname || null };

    const res = await fetch(url, {
      method: 'PATCH',
      headers: {
        Authorization: `Bot ${botToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      // Ignorieren wir 403 Fehler (wenn Bot keine Rechte hat), aber loggen andere
      if (res.status !== 403) {
          const err = await res.json();
          console.error("Fehler beim Nickname ändern:", err);
      }
    }
  } catch (e) {
    console.error("Netzwerkfehler beim Nickname:", e);
  }
}

// --- HELPER: User Admin Check ---
async function checkAdmin(accessToken, guildId) {
  try {
    const res = await fetch("https://discord.com/api/users/@me/guilds", {
        headers: { Authorization: `Bearer ${accessToken}` },
        next: { revalidate: 60 }
    });

    if (!res.ok) return false;

    const guilds = await res.json();
    const guild = guilds.find((g) => g.id === guildId);

    if (!guild) return false;
    return (BigInt(guild.permissions) & BigInt(0x20)) === BigInt(0x20); // Manage Server
  } catch (e) {
    return false;
  }
}

// --- HELPER: Bot Membership Check (NEU & WICHTIG) ---
async function isBotInGuild(guildId) {
    if (!process.env.DISCORD_TOKEN) return false;
    
    // Live-Check bei Discord ohne Cache
    const res = await fetch(`https://discord.com/api/v10/guilds/${guildId}`, {
        headers: { Authorization: `Bot ${process.env.DISCORD_TOKEN}` },
        next: { revalidate: 0 } 
    });
    
    return res.ok;
}

// --- GET: Einstellungen laden ---
export async function GET(req, props) {
  const params = await props.params;
  const { guildId } = params;

  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const isAdmin = await checkAdmin(session.accessToken, guildId);
  if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await connectDB();
  const settings = await GuildSettings.findOne({ guildId }).lean();

  return NextResponse.json(settings || {});
}

// --- POST: Einstellungen speichern ---
export async function POST(req, props) {
  const params = await props.params;
  const { guildId } = params;

  // 1. Session prüfen
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // 2. Admin-Rechte prüfen
  const isAdmin = await checkAdmin(session.accessToken, guildId);
  if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // 3. SICHERHEITS-CHECK: Ist der Bot noch da? (NEU)
  // Das verhindert, dass Daten für gekickte Server gespeichert werden.
  const botPresent = await isBotInGuild(guildId);
  if (!botPresent) {
      console.warn(`⚠️ SECURITY: User ${session.user.name} tried to save for guild ${guildId}, but bot is gone.`);
      return NextResponse.json({ 
          error: "Bot is no longer on this server. Saving blocked." 
      }, { status: 400 });
  }

  try {
    // 4. Daten aus Request
    const body = await req.json();

    // 5. ZOD VALIDIERUNG
    const validatedData = settingsSchema.parse(body);

    // 6. Speichern in DB
    await connectDB();
    const updatedSettings = await GuildSettings.findOneAndUpdate(
      { guildId },
      { $set: validatedData },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // 7. Nickname Update (nur wenn Bot noch da ist, was wir oben geprüft haben)
    if (validatedData.botNickname !== undefined) {
       // Wir warten nicht auf das Ergebnis, damit das Speichern schnell geht
       updateBotNickname(guildId, validatedData.botNickname);
    }

    return NextResponse.json(updatedSettings);

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Ungültige Daten", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Datenbank Fehler:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}