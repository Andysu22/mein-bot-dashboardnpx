import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/db";
import { GuildSettings } from "@/models/GuildSettings";
import { Whitelist } from "@/models/Whitelist"; 
import SettingsForm from "@/components/SettingsForm"; 
import Link from "next/link";
import { ArrowLeft, ShieldBan, Bot } from "lucide-react";

// 1. Admin Check (Nutzer-Seite)
async function checkAdmin(accessToken, guildId) {
  const res = await fetch("https://discord.com/api/users/@me/guilds", {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store" 
  });
  if (!res.ok) return false;
  const guilds = await res.json();
  const guild = guilds.find((g) => g.id === guildId);
  if (!guild) return false;
  const p = BigInt(guild.permissions);
  return (p & BigInt(0x8)) === BigInt(0x8) || (p & BigInt(0x20)) === BigInt(0x20);
}

// 2. NEU: Bot Membership Check (Bot-Seite)
async function checkBotMembership(guildId) {
  if (!process.env.DISCORD_TOKEN) return false;
  
  // Wir versuchen, die Server-Details als Bot abzurufen.
  // Wenn der Bot NICHT auf dem Server ist, gibt Discord einen 403 oder 404 Fehler zurück.
  const res = await fetch(`https://discord.com/api/v10/guilds/${guildId}`, {
    headers: { Authorization: `Bot ${process.env.DISCORD_TOKEN}` },
    next: { revalidate: 0 } // Kein Cache, wir wollen es live wissen
  });
  
  return res.ok; // True wenn Bot drauf ist, False wenn nicht
}

// Discord Data Funktion
async function getDiscordData(guildId) {
  const botToken = process.env.DISCORD_TOKEN;
  if (!botToken) return { channels: [], roles: [] };
  const headers = { Authorization: `Bot ${botToken}` };
  try {
    const [cRes, rRes] = await Promise.all([
      fetch(`https://discord.com/api/v10/guilds/${guildId}/channels`, { headers, next: { revalidate: 0 } }),
      fetch(`https://discord.com/api/v10/guilds/${guildId}/roles`, { headers, next: { revalidate: 0 } })
    ]);
    return { 
      channels: cRes.ok ? await cRes.json() : [], 
      roles: rRes.ok ? await rRes.json() : [] 
    };
  } catch { return { channels: [], roles: [] }; }
}

export default async function GuildSettingsPage(props) {
  const params = await props.params;
  const { guildId } = params;

  const session = await getServerSession(authOptions);
  if (!session) redirect("/");

  // A. Check: Ist der User Admin?
  const isAdmin = await checkAdmin(session.accessToken, guildId);
  if (!isAdmin) {
    return (
        <div className="min-h-screen bg-[#1a1c1f] flex flex-col items-center justify-center p-8 text-center">
            <div className="bg-red-500/10 p-6 rounded-full mb-6 text-red-500 border border-red-500/20">
                <ShieldBan className="w-16 h-16" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Zugriff verweigert</h1>
            <p className="text-gray-400 max-w-md mb-8">Du hast keine Administrator-Rechte auf diesem Server.</p>
            <Link href="/dashboard">
                <Button>Zurück zur Übersicht</Button>
            </Link>
        </div>
    );
  }

  // B. NEU: Check: Ist der Bot überhaupt drauf?
  const isBotInGuild = await checkBotMembership(guildId);
  if (!isBotInGuild) {
    const inviteUrl = `https://discord.com/api/oauth2/authorize?client_id=${process.env.DISCORD_CLIENT_ID}&permissions=8&scope=bot`;
    
    return (
        <div className="min-h-screen bg-[#1a1c1f] flex flex-col items-center justify-center p-8 text-center">
            <div className="bg-orange-500/10 p-6 rounded-full mb-6 text-orange-500 border border-orange-500/20 shadow-[0_0_30px_rgba(249,115,22,0.2)]">
                <Bot className="w-16 h-16" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Bot fehlt</h1>
            <p className="text-gray-400 max-w-md mb-8">
                Der Bot ist nicht Mitglied auf dem Server mit der ID <code>{guildId}</code>.<br/>
                Du kannst ihn hier nicht konfigurieren, bevor du ihn eingeladen hast.
            </p>
            <div className="flex gap-4">
                <Link href="/dashboard">
                    <button className="px-6 py-2 bg-[#2b2d31] hover:bg-[#35373c] text-white rounded transition-colors font-medium border border-white/5">
                        Zurück
                    </button>
                </Link>
                <a href={`${inviteUrl}&guild_id=${guildId}`} target="_blank">
                    <button className="px-6 py-2 bg-[#23a559] hover:bg-[#1f8b4c] text-white rounded transition-colors font-medium shadow-lg shadow-green-900/20">
                        Jetzt Einladen
                    </button>
                </a>
            </div>
        </div>
    );
  }

  // C. Whitelist Check (Optional, falls aktiviert)
  if (process.env.WHITELIST_ENABLED === 'true') {
      await connectDB();
      const isWhitelisted = await Whitelist.exists({ guildId });

      if (!isWhitelisted) {
        return (
          <div className="min-h-screen bg-[#1a1c1f] flex flex-col items-center justify-center p-8 text-center">
            <div className="bg-red-500/10 p-6 rounded-full mb-6 text-red-500 border border-red-500/20 shadow-[0_0_30px_rgba(239,68,68,0.2)]">
                <ShieldBan className="w-16 h-16" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Keine Lizenz</h1>
            <p className="text-gray-400 max-w-md mb-8">
                Dieser Server steht nicht auf der Whitelist.
            </p>
            <Link href="/dashboard">
                <button className="px-6 py-2 bg-[#5865F2] hover:bg-[#4752C4] text-white rounded transition-colors font-medium">
                    Zurück zur Übersicht
                </button>
            </Link>
          </div>
        );
      }
  }

  // --- ALLES OK: DATEN LADEN ---
  await connectDB();
  let settings = await GuildSettings.findOne({ guildId }).lean();
  if (!settings) settings = {};
  settings = JSON.parse(JSON.stringify(settings));

  const { channels, roles } = await getDiscordData(guildId);

  return (
    <div className="min-h-screen bg-[#1a1c1f] text-gray-100 pb-20">
      <div className="bg-[#1a1c1f]/80 backdrop-blur-md border-b border-white/5 sticky top-16 z-30">
          <div className="max-w-5xl mx-auto px-6 h-16 flex items-center gap-4">
            <Link href="/dashboard" className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-lg">
                <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="h-6 w-px bg-white/10 mx-2" />
            <h1 className="font-bold text-lg tracking-tight">Server Konfiguration</h1>
            <span className="text-xs text-gray-500 font-mono bg-[#2b2d31] px-2 py-1 rounded border border-white/5">ID: {guildId}</span>
          </div>
      </div>

      <div className="max-w-5xl mx-auto p-6 mt-4">
        <SettingsForm 
            guildId={guildId} 
            initialSettings={settings} 
            channels={channels} 
            roles={roles} 
        />
      </div>
    </div>
  );
}

// Kleiner Helper Button, falls du ihn oben im JSX noch nicht importiert hast,
// ansonsten nutze einfach <button ...> wie im Code oben.
function Button({children, className, ...props}) {
    return (
        <button className={`px-6 py-2 bg-[#5865F2] hover:bg-[#4752C4] text-white rounded transition-colors font-medium ${className}`} {...props}>
            {children}
        </button>
    )
}