import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/db";
import { GuildSettings } from "@/models/GuildSettings";
import { Whitelist } from "@/models/Whitelist";
import { z } from "zod";

// Schema definition
const settingsSchema = z.object({
  ticketsEnabled: z.boolean().optional(),
  logChannelId: z.string().nullable().optional(),
  supportRoleId: z.string().nullable().optional(),
  ticketCategoryId: z.string().nullable().optional(),
  ticketLanguage: z.string().optional(),
  panelChannelId: z.string().nullable().optional(),
  botNickname: z.string().nullable().optional(),
  
  // Explizit Panel Felder erlauben
  panelEmbed: z.any().optional(),
  panelButtonText: z.string().optional(),
  panelButtonStyle: z.string().optional(),
  
  modalTitle: z.string().optional(),
  ticketWelcomeMessage: z.string().optional(),
}).passthrough();

// Helpers
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
    const botToken = process.env.DISCORD_TOKEN;
    if (botToken && userId) {
      const gRes = await fetch(`https://discord.com/api/v10/guilds/${guildId}`, { headers: { Authorization: `Bot ${botToken}` } });
      if (gRes.ok) {
        const g = await gRes.json();
        if (g?.owner_id && String(g.owner_id) === String(userId)) return true;
      }
    }
    if (!accessToken) return false;
    const res = await fetch("https://discord.com/api/v10/users/@me/guilds", { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!res.ok) return false;
    const guilds = await res.json();
    const guild = Array.isArray(guilds) ? guilds.find((x) => x.id === guildId) : null;
    if (!guild) return false;
    if (guild.owner === true) return true;
    let p; try { p = BigInt(guild.permissions); } catch { return false; }
    return (p & BigInt(0x8)) === BigInt(0x8) || (p & BigInt(0x20)) === BigInt(0x20);
  } catch { return false; }
}

// GET
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

// POST
export async function POST(req, { params }) {
  const { guildId } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const isAdmin = await checkAdmin(session.accessToken, session.user?.id, guildId);
  if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = await req.json();
    
    // Validierung
    const validatedData = settingsSchema.parse(body);

    // Entferne _id und __v aus den Daten, falls vorhanden (verhindert Crash)
    delete validatedData._id;
    delete validatedData.__v;

    console.log(`[API] Saving settings for ${guildId}:`, JSON.stringify(validatedData.panelEmbed));

    await connectDB();
    
    const updated = await GuildSettings.findOneAndUpdate(
      { guildId },
      { $set: validatedData },
      { upsert: true, new: true }
    );

    if (Object.prototype.hasOwnProperty.call(validatedData, "botNickname")) {
      await updateBotNickname(guildId, validatedData.botNickname);
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Settings save error:", error);
    return NextResponse.json({ error: "Invalid data", details: error.message }, { status: 400 });
  }
}