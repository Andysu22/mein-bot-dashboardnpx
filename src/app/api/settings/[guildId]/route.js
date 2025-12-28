import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/db";
import { GuildSettings } from "@/models/GuildSettings";
import { z } from "zod";

// ------------------------------------------------------------------
// 1. Sicheres Schema für Discord Embeds definieren
// ------------------------------------------------------------------
const embedSchema = z.object({
  title: z.string().max(256).optional().nullable(),
  description: z.string().max(4096).optional().nullable(),
  // Farbe kann String (Hex) oder Number sein
  color: z.union([z.string(), z.number()]).optional().nullable(),
  
  author: z.object({
    name: z.string().max(256).optional().nullable(),
    // URLs müssen valide sein oder leerer String
    icon_url: z.string().url().optional().nullable().or(z.literal("")),
    url: z.string().url().optional().nullable().or(z.literal("")),
  }).optional().nullable(),
  
  footer: z.object({
    text: z.string().max(2048).optional().nullable(),
    icon_url: z.string().url().optional().nullable().or(z.literal("")),
  }).optional().nullable(),
  
  image_url: z.string().url().optional().nullable().or(z.literal("")),
  thumbnail_url: z.string().url().optional().nullable().or(z.literal("")),
  timestamp: z.boolean().optional().nullable(),
  
  // Discord erlaubt maximal 25 Felder
  fields: z.array(
    z.object({
      name: z.string().min(1).max(256),
      value: z.string().min(1).max(1024),
      inline: z.boolean().optional(),
    })
  ).max(25).optional().nullable(),
});

// ------------------------------------------------------------------
// 2. Settings Schema aktualisieren (inkl. Limits)
// ------------------------------------------------------------------
const settingsSchema = z.object({
  ticketsEnabled: z.boolean().optional(),
  logChannelId: z.string().nullable().optional(),
  supportRoleId: z.string().nullable().optional(),
  ticketCategoryId: z.string().nullable().optional(),
  ticketLanguage: z.string().optional(),
  panelChannelId: z.string().nullable().optional(),
  botNickname: z.string().nullable().optional(),
  
  // HIER: Das neue, sichere Schema einsetzen
  panelEmbed: embedSchema.optional().nullable(),
  
  // Limits für Buttons und Modals setzen
  panelButtonText: z.string().max(80).optional(),
  panelButtonStyle: z.string().optional(),
  
  modalTitle: z.string().max(45).optional(),
  ticketWelcomeMessage: z.string().max(2000).optional(),
}).passthrough(); // .passthrough() lässt unbekannte Felder zu (optional)

// ------------------------------------------------------------------
// Helper Funktionen
// ------------------------------------------------------------------

async function updateBotNickname(guildId, nickname) {
  const botToken = process.env.DISCORD_TOKEN;
  if (!botToken) return;
  try {
    await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/@me`, {
      method: "PATCH",
      headers: { Authorization: `Bot ${botToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ nick: nickname || null }),
    });
  } catch (e) { console.error("Nickname update failed", e); }
}

async function checkAdmin(accessToken, userId, guildId) {
  try {
    if (!guildId) return false;
    
    // Prüfen, ob User der Owner ist (via Bot Token)
    const botToken = process.env.DISCORD_TOKEN;
    if (botToken && userId) {
      const gRes = await fetch(`https://discord.com/api/v10/guilds/${guildId}`, { headers: { Authorization: `Bot ${botToken}` } });
      if (gRes.ok) {
        const g = await gRes.json();
        if (g?.owner_id && String(g.owner_id) === String(userId)) return true;
      }
    }
    
    // Prüfen über User Access Token (Permissions)
    if (!accessToken) return false;
    const res = await fetch("https://discord.com/api/v10/users/@me/guilds", { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!res.ok) return false;
    const guilds = await res.json();
    const guild = Array.isArray(guilds) ? guilds.find((x) => x.id === guildId) : null;
    if (!guild) return false;
    if (guild.owner === true) return true;
    
    let p; try { p = BigInt(guild.permissions); } catch { return false; }
    // Check ADMIN (0x8) or MANAGE_GUILD (0x20)
    return (p & BigInt(0x8)) === BigInt(0x8) || (p & BigInt(0x20)) === BigInt(0x20);
  } catch { return false; }
}

// ------------------------------------------------------------------
// GET Handler
// ------------------------------------------------------------------
export async function GET(req, { params }) {
  const { guildId } = await params;
  const session = await getServerSession(authOptions);
  
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const isAdmin = await checkAdmin(session.accessToken, session.user?.id, guildId);
  if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await connectDB();
  const settings = await GuildSettings.findOne({ guildId }).lean();

  return NextResponse.json(settings || { guildId, ticketsEnabled: true, panelEmbed: { title: "Support", color: "#5865F2" } });
}

// ------------------------------------------------------------------
// POST Handler (Speichern)
// ------------------------------------------------------------------
export async function POST(req, { params }) {
  const { guildId } = await params;
  const session = await getServerSession(authOptions);
  
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const isAdmin = await checkAdmin(session.accessToken, session.user?.id, guildId);
  if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = await req.json();
    
    // 1. Validierung mit dem neuen strikten Schema
    // Wenn hier etwas falsch ist, wirft Zod einen Fehler und der Code springt in den catch-Block
    const validatedData = settingsSchema.parse(body);

    // 2. Interne Felder entfernen (Sicherheitsmaßnahme für MongoDB Updates)
    delete validatedData._id;
    delete validatedData.__v;

    console.log(`[API] Saving settings for ${guildId}`);

    await connectDB();
    
    // 3. Speichern in der DB
    const updated = await GuildSettings.findOneAndUpdate(
      { guildId },
      { $set: validatedData },
      { upsert: true, new: true }
    );

    // 4. Nickname Update (optional)
    if (Object.prototype.hasOwnProperty.call(validatedData, "botNickname")) {
      await updateBotNickname(guildId, validatedData.botNickname);
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Settings save error:", error);
    // Gib dem Frontend Details, was falsch war (z.B. "Title too long")
    return NextResponse.json({ error: "Invalid data", details: error.message || error.errors }, { status: 400 });
  }
}