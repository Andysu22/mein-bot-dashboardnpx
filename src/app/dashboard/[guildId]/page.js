import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/db";
import { GuildSettings } from "@/models/GuildSettings";
import { Whitelist } from "@/models/Whitelist";
import SettingsForm from "@/components/SettingsForm";
import Link from "next/link";
import { 
  ChevronLeft, ShieldBan, Bot, Settings, MessageSquare, 
  Users, ShieldCheck, Layers, LayoutDashboard 
} from "lucide-react";

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

async function getDiscordData(guildId) {
  const botToken = process.env.DISCORD_TOKEN;
  const headers = { Authorization: `Bot ${botToken}` };
  try {
    const [cRes, rRes, gRes] = await Promise.all([
      fetch(`https://discord.com/api/v10/guilds/${guildId}/channels`, { headers }),
      fetch(`https://discord.com/api/v10/guilds/${guildId}/roles`, { headers }),
      fetch(`https://discord.com/api/v10/guilds/${guildId}`, { headers })
    ]);
    return { 
      channels: cRes.ok ? await cRes.json() : [], 
      roles: rRes.ok ? await rRes.json() : [],
      botInGuild: gRes.ok
    };
  } catch { return { channels: [], roles: [], botInGuild: false }; }
}

export default async function GuildSettingsPage({ params }) {
  const { guildId } = await params;
  const session = await getServerSession(authOptions);
  if (!session) redirect("/");

  const isAdmin = await checkAdmin(session.accessToken, guildId);
  if (!isAdmin) return <ErrorView title="Zugriff verweigert" desc="Du hast keine Administrator-Rechte auf diesem Server." icon={<ShieldBan className="w-16 h-16"/>} />;

  const { channels, roles, botInGuild } = await getDiscordData(guildId);
  if (!botInGuild) return <ErrorView title="Bot fehlt" desc="Der Bot muss auf dem Server sein." icon={<Bot className="w-16 h-16"/>} isInvite guildId={guildId} />;

  if (process.env.WHITELIST_ENABLED === 'true') {
    await connectDB();
    if (!(await Whitelist.exists({ guildId }))) {
      return <ErrorView title="Keine Lizenz" desc="Dieser Server ist nicht für das Dashboard freigeschaltet." icon={<ShieldBan className="w-16 h-16"/>} />;
    }
  }

  await connectDB();
  let settings = (await GuildSettings.findOne({ guildId }).lean()) || {};
  settings = JSON.parse(JSON.stringify(settings));

  return (
    <div className="flex min-h-screen bg-[#1a1b1e]">
      {/* SIDEBAR */}
      <aside className="w-64 bg-[#111214] flex flex-col fixed top-16 left-0 bottom-0 z-40 border-r border-white/5">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <Link href="/dashboard" className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors text-sm font-semibold group">
            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" /> Alle Server
          </Link>
          <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5">
            <div className="w-10 h-10 bg-[#5865F2] rounded-lg flex items-center justify-center text-white"><Settings className="w-5 h-5" /></div>
            <div className="overflow-hidden">
              <p className="text-sm font-bold text-white truncate">Konfiguration</p>
              <p className="text-[10px] text-gray-500 font-mono truncate">{guildId}</p>
            </div>
          </div>
          <nav className="space-y-1">
            <SidebarLink icon={<LayoutDashboard className="w-4 h-4"/>} label="Übersicht" active />
            <SidebarLink icon={<MessageSquare className="w-4 h-4"/>} label="Ticket System" />
            <SidebarLink icon={<Layers className="w-4 h-4"/>} label="Voice Hubs" />
            <SidebarLink icon={<Users className="w-4 h-4"/>} label="Bewerbungen" />
          </nav>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 ml-64 pt-16">
        <div className="max-w-4xl mx-auto p-8 pb-32">
          <header className="mb-10">
            <h1 className="text-3xl font-bold text-white tracking-tight">Allgemeine Einstellungen</h1>
            <p className="text-gray-400 text-sm mt-2">Server-spezifische Optionen verwalten.</p>
          </header>
          <div className="bg-[#222327] border border-white/5 rounded-2xl p-8 shadow-xl">
            <SettingsForm guildId={guildId} initialSettings={settings} channels={channels} roles={roles} />
          </div>
        </div>
      </main>
    </div>
  );
}

function SidebarLink({ icon, label, active = false }) {
  return (
    <div className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all ${
      active ? "bg-[#5865F2] text-white" : "text-gray-400 hover:bg-white/5 cursor-pointer"
    }`}>
      {icon} {label}
    </div>
  );
}

function ErrorView({ title, desc, icon, isInvite = false, guildId }) {
  const inviteUrl = `https://discord.com/api/oauth2/authorize?client_id=${process.env.DISCORD_CLIENT_ID}&permissions=8&scope=bot`;
  return (
    <div className="min-h-screen bg-[#1a1b1e] flex flex-col items-center justify-center p-8 text-center">
      <div className="bg-white/5 p-6 rounded-full mb-6 text-gray-400 border border-white/5">{icon}</div>
      <h1 className="text-2xl font-bold text-white mb-2">{title}</h1>
      <p className="text-gray-400 mb-8 max-w-sm">{desc}</p>
      <div className="flex gap-4">
        <Link href="/dashboard" className="px-6 py-2 bg-[#2b2d31] text-white rounded-xl hover:bg-[#383a40] transition-colors">Zurück</Link>
        {isInvite && <a href={`${inviteUrl}&guild_id=${guildId}`} target="_blank" className="px-6 py-2 bg-[#5865F2] text-white rounded-xl hover:bg-[#4752c4] transition-colors">Bot einladen</a>}
      </div>
    </div>
  );
}