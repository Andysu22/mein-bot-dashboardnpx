import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/db";
import { GuildSettings } from "@/models/GuildSettings";
import { z } from "zod";
import { checkRateLimit } from "@/lib/rateLimit";

// ------------------------------------------------------------------
// CACHE FÜR ADMIN RECHTE
// ------------------------------------------------------------------
const adminCache = new Map(); // Speichert: "userId-guildId" -> { isAdmin: true/false, timestamp: 12345 }
const CACHE_TTL = 60 * 1000;  // 60 Sekunden Cache-Dauer

// ------------------------------------------------------------------
// Validierungs-Schemas
// ------------------------------------------------------------------
const embedSchema = z.object({
  title: z.string().max(256).optional().nullable(),
  description: z.string().max(4096).optional().nullable(),
  color: z.union([z.string(), z.number()]).optional().nullable(),
  author: z.object({
    name: z.string().max(256).optional().nullable(),
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
  fields: z.array(
    z.object({
      name: z.string().min(1).max(256),
      value: z.string().min(1).max(1024),
      inline: z.boolean().optional(),
    })
  ).max(25).optional().nullable(),
});

const settingsSchema = z.object({
  ticketsEnabled: z.boolean().optional(),
  logChannelId: z.string().nullable().optional(),
  supportRoleId: z.string().nullable().optional(),
  ticketCategoryId: z.string().nullable().optional(),
  ticketLanguage: z.string().optional(),
  panelChannelId: z.string().nullable().optional(),
  botNickname: z.string().nullable().optional(),
  panelEmbed: embedSchema.optional().nullable(),
  panelButtonText: z.string().max(80).optional(),
  panelButtonStyle: z.string().optional(),
  modalTitle: z.string().max(45).optional(),
  ticketWelcomeMessage: z.string().max(2000).optional(),
}).passthrough();

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

// ------------------------------------------------------------------
// VERBESSERTE CHECK-ADMIN FUNKTION (Jetzt mit Bot-Fallback!)
// ------------------------------------------------------------------
async function checkAdmin(accessToken, userId, guildId) {
  if (!guildId || !userId) return false;

  // 1. Cache prüfen
  const cacheKey = `${userId}-${guildId}`;
  const cached = adminCache.get(cacheKey);
  const now = Date.now();

  if (cached && (now - cached.timestamp < CACHE_TTL)) {
    return cached.isAdmin;
  }

  let isAdmin = false;

  try {
    // ---------------------------------------------------
    // SCHRITT A: Owner Check (Schnellste Methode)
    // ---------------------------------------------------
    const botToken = process.env.DISCORD_TOKEN;
    if (botToken) {
      const gRes = await fetch(`https://discord.com/api/v10/guilds/${guildId}`, { 
          headers: { Authorization: `Bot ${botToken}` },
          cache: "no-store" 
      });
      if (gRes.ok) {
        const g = await gRes.json();
        // Wenn User der Owner ist -> Admin
        if (g?.owner_id && String(g.owner_id) === String(userId)) {
           isAdmin = true;
        }
      }
    }
    
    // ---------------------------------------------------
    // SCHRITT B: User Token Check (OAuth2 Daten)
    // ---------------------------------------------------
    if (!isAdmin && accessToken) {
      const res = await fetch("https://discord.com/api/v10/users/@me/guilds", { 
          headers: { Authorization: `Bearer ${accessToken}` } 
      });
      if (res.ok) {
        const guilds = await res.json();
        const guild = Array.isArray(guilds) ? guilds.find((x) => x.id === guildId) : null;
        
        if (guild) {
             let p; 
             try { p = BigInt(guild.permissions); } catch { p = BigInt(0); }
             // Check ADMINISTRATOR (0x8) or MANAGE_GUILD (0x20)
             if ((p & BigInt(0x8)) === BigInt(0x8) || (p & BigInt(0x20)) === BigInt(0x20)) {
                isAdmin = true;
             }
        }
      }
    }

    // ---------------------------------------------------
    // SCHRITT C: Fallback via Bot Token (Die fehlende Rettung!)
    // Wenn A und B "false" sagten, fragen wir den Bot direkt nach den Rollen
    // ---------------------------------------------------
    if (!isAdmin && botToken) {
        const [rolesRes, memberRes] = await Promise.all([
            fetch(`https://discord.com/api/v10/guilds/${guildId}/roles`, {
                headers: { Authorization: `Bot ${botToken}` },
                cache: "no-store",
            }),
            fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${userId}`, {
                headers: { Authorization: `Bot ${botToken}` },
                cache: "no-store",
            }),
        ]);

        if (rolesRes.ok && memberRes.ok) {
            const roles = await rolesRes.json();
            const member = await memberRes.json();

            if (Array.isArray(roles) && Array.isArray(member?.roles)) {
                const roleMap = new Map();
                for (const r of roles) roleMap.set(r.id, r);

                // Rolle @everyone ist die GuildID selbst
                const roleIds = new Set([guildId, ...member.roles]);

                let perms = BigInt(0);
                for (const rid of roleIds) {
                    const r = roleMap.get(rid);
                    if (!r?.permissions) continue;
                    perms |= BigInt(r.permissions);
                }

                const ADMIN = BigInt(0x8);
                const MANAGE_GUILD = BigInt(0x20);
                
                if ((perms & ADMIN) === ADMIN || (perms & MANAGE_GUILD) === MANAGE_GUILD) {
                    isAdmin = true;
                }
            }
        }
    }

  } catch (err) {
    console.error("Admin Check Error:", err);
    isAdmin = false;
  }

  // 3. Ergebnis cachen
  adminCache.set(cacheKey, { isAdmin, timestamp: now });
  
  if (adminCache.size > 1000) adminCache.clear();

  return isAdmin;
}

// ------------------------------------------------------------------
// GET Handler
// ------------------------------------------------------------------
export async function GET(req, { params }) {
  if (checkRateLimit(req)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

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
  if (checkRateLimit(req)) {
    return NextResponse.json(
      { error: "Zu viele Anfragen. Bitte warte kurz." }, 
      { status: 429 }
    );
  }

  const { guildId } = await params;
  const session = await getServerSession(authOptions);
  
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const isAdmin = await checkAdmin(session.accessToken, session.user?.id, guildId);
  if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = await req.json();
    const validatedData = settingsSchema.parse(body);

    delete validatedData._id;
    delete validatedData.__v;

    console.log(`[API] Saving settings for ${guildId}`);

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
    return NextResponse.json({ error: "Invalid data", details: error.message || error.errors }, { status: 400 });
  }
}