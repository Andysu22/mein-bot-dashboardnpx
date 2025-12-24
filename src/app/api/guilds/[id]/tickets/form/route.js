import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/db";
import { GuildSettings } from "@/models/GuildSettings";
import { z } from "zod";

const ticketFormSchema = z.object({
  mode: z.enum(["default", "custom"]).optional(),
  version: z.coerce.number().int().min(1).max(100).optional(),
  botCode: z.string().max(20000).nullable().optional(),
  builderData: z.any().nullable().optional(),
  submitTemplate: z.string().max(2000).nullable().optional(),
  ticketEmbed: z
    .object({
      title: z.string().max(256).optional(),
      description: z.string().max(4000).optional(),
      color: z.string().max(16).optional(),
      includeFields: z.boolean().optional(),
      footerText: z.string().max(2048).optional(),
      timestamp: z.boolean().optional(),
      authorName: z.string().max(256).optional(),
      authorIconUrl: z.string().max(1024).optional(),
      authorUrl: z.string().max(1024).optional(),
      thumbnailUrl: z.string().max(1024).optional(),
      imageUrl: z.string().max(1024).optional(),
      url: z.string().max(1024).optional(),
      fields: z
        .array(
          z.object({
            name: z.string().max(256),
            value: z.string().max(1024),
            inline: z.boolean().optional(),
          })
        )
        .max(25)
        .optional(),
    })
    .nullable()
    .optional(),
});

async function checkAdmin(session, guildId) {
  // 1) Try user OAuth token (requires "guilds" scope)
  try {
    const accessToken = session?.accessToken;
    if (accessToken) {
      const res = await fetch("https://discord.com/api/users/@me/guilds", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        const guilds = await res.json();
        const guild = guilds.find((g) => g.id === guildId);
        if (guild?.permissions != null) {
          const p = BigInt(guild.permissions);
          const ADMIN = BigInt(0x8);
          const MANAGE_GUILD = BigInt(0x20);
          if ((p & ADMIN) === ADMIN || (p & MANAGE_GUILD) === MANAGE_GUILD) return true;
        }
      }
    }
  } catch {
    // ignore
  }

  // 2) Fallback: compute permissions via Bot token
  const botToken = process.env.DISCORD_TOKEN;
  const userId = session?.user?.id;
  if (!botToken || !userId) return false;

  try {
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

    if (!rolesRes.ok || !memberRes.ok) return false;

    const roles = await rolesRes.json();
    const member = await memberRes.json();

    if (!Array.isArray(roles) || !Array.isArray(member?.roles)) return false;

    const roleMap = new Map();
    for (const r of roles) roleMap.set(r.id, r);

    // include @everyone role (id === guildId)
    const roleIds = new Set([guildId, ...member.roles]);

    let perms = BigInt(0);
    for (const rid of roleIds) {
      const r = roleMap.get(rid);
      if (!r?.permissions) continue;
      perms |= BigInt(r.permissions);
    }

    const ADMIN = BigInt(0x8);
    const MANAGE_GUILD = BigInt(0x20);
    return (perms & ADMIN) === ADMIN || (perms & MANAGE_GUILD) === MANAGE_GUILD;
  } catch {
    return false;
  }
}

export async function GET(req, { params }) {
  const { id: guildId } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const isAdmin = await checkAdmin(session, guildId);
  if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await connectDB();
  const settings = await GuildSettings.findOne({ guildId }).lean();

  const ticketForm = settings?.ticketForm || { mode: "default", version: 1, botCode: null, builderData: null };
  return NextResponse.json(ticketForm, { status: 200 });
}

export async function PUT(req, { params }) {
  const { id: guildId } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const isAdmin = await checkAdmin(session, guildId);
  if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = ticketFormSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  await connectDB();

  const update = {
    "ticketForm.mode": parsed.data.mode ?? "custom",
    "ticketForm.version": parsed.data.version ?? 1,
    "ticketForm.botCode": parsed.data.botCode ?? null,
    "ticketForm.builderData": parsed.data.builderData ?? null,
    "ticketForm.submitTemplate": parsed.data.submitTemplate ?? null,
    "ticketForm.ticketEmbed": parsed.data.ticketEmbed ?? null,
  };

  const doc = await GuildSettings.findOneAndUpdate(
    { guildId },
    { $set: update },
    { new: true, upsert: true }
  ).lean();

  return NextResponse.json(doc?.ticketForm || null, { status: 200 });
}
