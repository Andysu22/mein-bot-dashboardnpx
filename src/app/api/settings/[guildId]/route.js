import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/db";
import { GuildSettings } from "@/models/GuildSettings";
import { Whitelist } from "@/models/Whitelist";
import { z } from "zod";
import { checkRateLimit } from "@/lib/rateLimit"; // <--- IMPORT

// Vollständiges Schema
const settingsSchema = z.object({
  ticketsEnabled: z.boolean().optional(),
  logChannelId: z.string().nullable().optional(),
  supportRoleId: z.string().nullable().optional(),
  ticketCategoryId: z.string().nullable().optional(),
  ticketLanguage: z.string().optional(),
  panelChannelId: z.string().nullable().optional(),
  panelMessageId: z.string().nullable().optional(),
  deeplApiKey: z.string().nullable().optional(),
  adminRoles: z.array(z.string()).optional(),
  tempVcEnabled: z.boolean().optional(),
  creatorChannelId: z.string().nullable().optional(),
  tempCategoryChannelId: z.string().nullable().optional(),
  tempVcAdminRoleId: z.string().nullable().optional(),
  appPanelChannelId: z.string().nullable().optional(),
  appReviewChannelId: z.string().nullable().optional(),
  appPanelMessageId: z.string().nullable().optional(),
  applicantRoleId: z.string().nullable().optional(),
  appStaffRoleId: z.string().nullable().optional(),
  appDeclineCooldownDays: z.coerce.number().min(0).max(365).optional(),
  translatorMinRoleId: z.string().nullable().optional(),
  botNickname: z.string().max(32).nullable().optional(),
});

// --- HILFSFUNKTIONEN ---

async function updateBotNickname(guildId, nickname) {
  const botToken = process.env.DISCORD_TOKEN;
  if (!botToken) return;
  try {
    const url = `https://discord.com/api/v10/guilds/${guildId}/members/@me`;
    const res = await fetch(url, {
      method: 'PATCH',
      headers: {
        Authorization: `Bot ${botToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ nick: nickname || null }),
    });
  } catch (e) {
    console.error("Nickname update failed", e);
  }
}

async function checkAdmin(accessToken, guildId) {
  try {
    const res = await fetch("https://discord.com/api/users/@me/guilds", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return false;
    const guilds = await res.json();
    const guild = guilds.find((g) => g.id === guildId);
    if (!guild) return false;
    const p = BigInt(guild.permissions);
    // 0x8 = Admin, 0x20 = Manage Server
    return (p & BigInt(0x8)) === BigInt(0x8) || (p & BigInt(0x20)) === BigInt(0x20);
  } catch { return false; }
}

async function isBotInGuild(guildId) {
  const res = await fetch(`https://discord.com/api/v10/guilds/${guildId}`, {
    headers: { Authorization: `Bot ${process.env.DISCORD_TOKEN}` },
  });
  return res.ok;
}

// --- ROUTEN HANDLER ---

export async function GET(req, { params }) {
  // Rate Limit Check
  if (checkRateLimit(req)) return NextResponse.json({ error: "Zu schnell" }, { status: 429 });

  const { guildId } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const isAdmin = await checkAdmin(session.accessToken, guildId);
  if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await connectDB();
  const settings = await GuildSettings.findOne({ guildId }).lean();
  return NextResponse.json(settings || {});
}

export async function POST(req, { params }) {
  // Rate Limit Check (Wichtig beim Speichern!)
  if (checkRateLimit(req)) return NextResponse.json({ error: "Zu schnell" }, { status: 429 });

  const { guildId } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const isAdmin = await checkAdmin(session.accessToken, guildId);
  if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (process.env.WHITELIST_ENABLED === 'true') {
    await connectDB();
    const isWhitelisted = await Whitelist.exists({ guildId });
    if (!isWhitelisted) return NextResponse.json({ error: "Not whitelisted" }, { status: 403 });
  }

  if (!(await isBotInGuild(guildId))) {
    return NextResponse.json({ error: "Bot not in guild" }, { status: 400 });
  }

  try {
    const body = await req.json();
    const validatedData = settingsSchema.parse(body);
    await connectDB();
    const updated = await GuildSettings.findOneAndUpdate(
      { guildId },
      { $set: validatedData },
      { upsert: true, new: true }
    );
    if (validatedData.botNickname !== undefined) {
      await updateBotNickname(guildId, validatedData.botNickname);
    }
    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }
}