import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/db";
import { GuildSettings } from "@/models/GuildSettings";

// Hier definieren wir das Standard-Panel mit deinem Bild
const DEFAULT_PANEL = {
    title: "🛠️ Support Center",
    description: "**Hilfe nötig?**\nKlicke unten, um ein Ticket zu öffnen.\n\n🔒 Sichtbar: Für dich & Support",
    color: "#5865F2",
    footer: { text: "Bitte kurz & klar beschreiben." },
    image_url: "https://dummyimage.com/600x200/2b2b2b/ffffff&text=Support" // <-- DEIN BILD
};

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

export async function POST(req, { params }) {
  const { id: guildId } = await params; // Next.js 15 requires awaiting params
  const session = await getServerSession(authOptions);
  
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const isAdmin = await checkAdmin(session, guildId);
  if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await connectDB();

  // Reset ticketForm AND panelEmbed settings
  const doc = await GuildSettings.findOneAndUpdate(
    { guildId },
    {
      $set: {
        // Reset Form Logic (Original)
        ticketForm: {
          mode: "default",
          version: 1,
          botCode: null,
          builderData: null,
          submitTemplate: null,
          ticketEmbed: null,
        },
        // Reset Panel Logic (NEU: Mit Bild)
        panelEmbed: DEFAULT_PANEL,
        panelButtonText: "Ticket erstellen",
        panelButtonStyle: "Primary"
      },
    },
    { new: true, upsert: true }
  ).lean();

  return NextResponse.json({ success: true, settings: doc }, { status: 200 });
}