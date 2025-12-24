import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/db";
import { GuildSettings } from "@/models/GuildSettings";
import { Whitelist } from "@/models/Whitelist";
import { z } from "zod";
import { checkRateLimit } from "@/lib/rateLimit";

// Vollständiges Schema (so wie bei dir, nur hier komplett belassen)
const settingsSchema = z.object({
  ticketsEnabled: z.boolean().optional(),
  logChannelId: z.string().nullable().optional(),
  supportRoleId: z.string().nullable().optional(),
  ticketCategoryId: z.string().nullable().optional(),
  ticketLanguage: z.string().optional(),

  panelChannelId: z.string().nullable().optional(),
  botNickname: z.string().nullable().optional(),

  // falls du weitere Felder hast, bleiben sie hier wie gehabt
}).passthrough();

// --- HILFSFUNKTIONEN ---

async function updateBotNickname(guildId, nickname) {
  const botToken = process.env.DISCORD_TOKEN;
  if (!botToken) return;
  try {
    const url = `https://discord.com/api/v10/guilds/${guildId}/members/@me`;
    await fetch(url, {
      method: "PATCH",
      headers: {
        Authorization: `Bot ${botToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ nick: nickname || null }),
    });
  } catch (e) {
    console.error("Nickname update failed", e);
  }
}

// ✅ ROBUSTER Admin-Check
// 1) Owner-Check per Bot (stabil, unabhängig von OAuth-Scopes)
// 2) Fallback: User-OAuth /users/@me/guilds (Admin oder Manage Server)
async function checkAdmin(accessToken, userId, guildId) {
  try {
    if (!guildId) return false;

    // 1) Owner-Check über Bot Token
    const botToken = process.env.DISCORD_TOKEN;
    if (botToken && userId) {
      const gRes = await fetch(`https://discord.com/api/v10/guilds/${guildId}`, {
        headers: { Authorization: `Bot ${botToken}` },
      });

      if (gRes.ok) {
        const g = await gRes.json();
        if (g?.owner_id && String(g.owner_id) === String(userId)) {
          return true;
        }
      }
    }

    // 2) Fallback: Admin/Manage Server über User Token
    if (!accessToken) return false;

    const res = await fetch("https://discord.com/api/v10/users/@me/guilds", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) return false;

    const guilds = await res.json();
    const guild = Array.isArray(guilds) ? guilds.find((x) => x.id === guildId) : null;
    if (!guild) return false;

    // Owner flag aus dem OAuth-Response akzeptieren
    if (guild.owner === true) return true;

    // permissions kann fehlen -> dann false (Owner wurde oben schon geprüft)
    if (guild.permissions === undefined || guild.permissions === null) return false;

    let p;
    try {
      // Discord liefert permissions als string
      p = BigInt(guild.permissions);
    } catch {
      return false;
    }

    // 0x8 = Admin, 0x20 = Manage Guild
    return (p & BigInt(0x8)) === BigInt(0x8) || (p & BigInt(0x20)) === BigInt(0x20);
  } catch {
    return false;
  }
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

  // ✅ neu: userId mitgeben
  const isAdmin = await checkAdmin(session.accessToken, session.user?.id, guildId);
  if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await connectDB();
  const settings = await GuildSettings.findOne({ guildId }).lean();

  // Wenn noch nichts existiert, wenigstens Default-Objekt zurückgeben
  return NextResponse.json(
    settings || {
      guildId,
      ticketsEnabled: true,
      logChannelId: null,
      supportRoleId: null,
      ticketCategoryId: null,
      ticketLanguage: "en",
      panelChannelId: null,
      botNickname: null,
    }
  );
}

export async function POST(req, { params }) {
  // Rate Limit Check (Wichtig beim Speichern!)
  if (checkRateLimit(req)) return NextResponse.json({ error: "Zu schnell" }, { status: 429 });

  const { guildId } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // ✅ neu: userId mitgeben
  const isAdmin = await checkAdmin(session.accessToken, session.user?.id, guildId);
  if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (process.env.WHITELIST_ENABLED === "true") {
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
      { $set: { guildId, ...validatedData } },
      { upsert: true, new: true }
    );

    // Nickname optional aktualisieren
    if (Object.prototype.hasOwnProperty.call(validatedData, "botNickname")) {
      await updateBotNickname(guildId, validatedData.botNickname);
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Settings save error:", error);
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }
}
