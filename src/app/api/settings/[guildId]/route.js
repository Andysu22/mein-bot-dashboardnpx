import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/db";
import { GuildSettings } from "@/models/GuildSettings";
import { z } from "zod";
import { checkRateLimit } from "@/lib/rateLimit";

// Helper & Cache
const adminCache = new Map();
const CACHE_TTL = 60 * 1000;

// Embed Schema
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
  fields: z.any().optional(),
});

// Form Schema
const formSchema = z.object({
    mode: z.string().optional(),
    version: z.number().optional(),
    botCode: z.string().nullable().optional(),
    builderData: z.any().optional(),
}).optional().nullable();

// Main Schema
const settingsSchema = z.object({
  // Tickets
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
  ticketForm: formSchema,

  // Bewerbungen
  appPanelChannelId: z.string().nullable().optional(),
  appReviewChannelId: z.string().nullable().optional(),
  appStaffRoleId: z.string().nullable().optional(),
  applicantRoleId: z.string().nullable().optional(),
  appDeclineCooldownDays: z.number().optional(),
  
  appPanelEmbed: embedSchema.optional().nullable(),
  appPanelButtonText: z.string().max(80).optional(),
  appPanelButtonStyle: z.string().optional(),
  applicationForm: formSchema,

  // NEU: Response Settings
  appResponse: z.object({
      mode: z.enum(["text", "embed"]).optional(),
      content: z.string().max(2000).optional(),
      embed: embedSchema.optional().nullable()
  }).optional(),

}).passthrough();

async function checkAdmin(accessToken, userId, guildId) {
  if (!guildId || !userId) return false;

  const cacheKey = `${userId}-${guildId}`;
  const cached = adminCache.get(cacheKey);
  const now = Date.now();

  if (cached && (now - cached.timestamp < CACHE_TTL)) {
    return cached.isAdmin;
  }

  let isAdmin = false;

  try {
    const botToken = process.env.DISCORD_TOKEN;
    if (botToken) {
      const gRes = await fetch(`https://discord.com/api/v10/guilds/${guildId}`, { 
          headers: { Authorization: `Bot ${botToken}` },
          cache: "no-store" 
      });
      if (gRes.ok) {
        const g = await gRes.json();
        if (g?.owner_id && String(g.owner_id) === String(userId)) {
           isAdmin = true;
        }
      }
    }
    
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
             if ((p & BigInt(0x8)) === BigInt(0x8) || (p & BigInt(0x20)) === BigInt(0x20)) {
                isAdmin = true;
             }
        }
      }
    }
  } catch (err) {
    console.error("Admin Check Error:", err);
    isAdmin = false;
  }

  adminCache.set(cacheKey, { isAdmin, timestamp: now });
  return isAdmin;
}

export async function GET(req, { params }) {
  if (checkRateLimit(req)) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const { guildId } = await params;
  const session = await getServerSession(authOptions);
  
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const isAdmin = await checkAdmin(session.accessToken, session.user?.id, guildId);
  if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await connectDB();
  const settings = await GuildSettings.findOne({ guildId }).lean();
  return NextResponse.json(settings || { guildId });
}

export async function POST(req, { params }) {
  if (checkRateLimit(req)) return NextResponse.json({ error: "Rate limit" }, { status: 429 });

  const { guildId } = await params;
  const session = await getServerSession(authOptions);
  
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const isAdmin = await checkAdmin(session.accessToken, session.user?.id, guildId);
  if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = await req.json();
    const validatedData = settingsSchema.parse(body);
    delete validatedData._id;

    await connectDB();
    const updated = await GuildSettings.findOneAndUpdate(
      { guildId },
      { $set: validatedData },
      { upsert: true, new: true }
    );
    return NextResponse.json(updated);
  } catch (error) {
    console.error("Settings save error:", error);
    return NextResponse.json({ error: "Invalid data", details: error }, { status: 400 });
  }
}