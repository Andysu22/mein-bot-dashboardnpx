import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import Link from "next/link";
import { Settings, Plus, ShieldAlert, CheckCircle2, LayoutGrid } from "lucide-react";
import connectDB from "@/lib/db";                
import { Whitelist } from "@/models/Whitelist";  
import LoginView from "@/components/LoginView";

async function getUserGuilds(accessToken) {
  const res = await fetch("https://discord.com/api/users/@me/guilds", {
    headers: { Authorization: `Bearer ${accessToken}` },
    next: { revalidate: 60 }
  });
  if (!res.ok) return [];
  return res.json();
}

async function getBotGuilds() {
  if (!process.env.DISCORD_TOKEN) return [];
  const res = await fetch("https://discord.com/api/users/@me/guilds", {
    headers: { Authorization: `Bot ${process.env.DISCORD_TOKEN}` },
    next: { revalidate: 0 } 
  });
  if (!res.ok) return [];
  return res.json();
}

export default async function DashboardOverview() {
  const session = await getServerSession(authOptions);
  if (!session) {
      return <LoginView />;
  }

  const [userGuilds, botGuilds] = await Promise.all([
    getUserGuilds(session.accessToken),
    getBotGuilds()
  ]);

  await connectDB();
  const whitelistedDocs = await Whitelist.find({}).lean();
  const whitelistedIds = new Set(whitelistedDocs.map(w => w.guildId));

  const isWhitelistActive = process.env.WHITELIST_ENABLED === 'true';
  const botGuildIds = new Set(Array.isArray(botGuilds) ? botGuilds.map(g => g.id) : []);

  const adminGuilds = Array.isArray(userGuilds) 
    ? userGuilds.filter((g) => {
        const p = BigInt(g.permissions);
        return (p & BigInt(0x8)) === BigInt(0x8) || (p & BigInt(0x20)) === BigInt(0x20);
      })
    : [];

  const inviteUrl = `https://discord.com/api/oauth2/authorize?client_id=${process.env.DISCORD_CLIENT_ID}&permissions=8&scope=bot`;

  return (
    <div className="min-h-screen bg-[#1a1b1e] text-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        
        {/* Header Bereich */}
        <div className="flex items-center justify-between mb-12 border-b border-white/5 pb-8">
            <div>
                <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-widest mb-2">
                    <LayoutGrid className="w-4 h-4" /> Management
                </div>
                <h1 className="text-4xl font-black text-white tracking-tight">Deine Server</h1>
                <p className="text-gray-500 text-sm mt-1">
                  {isWhitelistActive 
                    ? "Wähle einen lizenzierten Server aus." 
                    : "Wähle einen Server zum Konfigurieren aus."}
                </p>
            </div>
        </div>
      
        {/* Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {adminGuilds.map((guild) => {
            const isBotInGuild = botGuildIds.has(guild.id);
            const isWhitelisted = !isWhitelistActive || whitelistedIds.has(guild.id);

            return (
              <div 
                key={guild.id} 
                className={`flex flex-col p-5 rounded-2xl border transition-colors bg-[#222327]
                  ${isWhitelisted ? "border-white/5" : "border-red-500/10 opacity-60 grayscale"}`}
              >
                <div className="flex items-start justify-between mb-6">
                  {/* Server Icon mit dezentem Hover */}
                  <div className="relative group">
                    {guild.icon ? (
                      <img 
                        src={`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`} 
                        className="w-14 h-14 rounded-xl bg-[#111214] shadow-md transition-transform group-hover:scale-105" 
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-[#111214] flex items-center justify-center text-lg font-bold text-gray-500 transition-transform group-hover:scale-105 border border-white/5">
                        {guild.name.charAt(0)}
                      </div>
                    )}
                  </div>

                  {/* Status Badge */}
                  <div>
                    {isWhitelistActive && !isWhitelisted ? (
                        <div className="bg-red-500/5 text-red-500/70 px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-tighter border border-red-500/10">
                            No License
                        </div>
                    ) : isBotInGuild ? (
                        <div className="bg-emerald-500/5 text-emerald-500/70 px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-tighter border border-emerald-500/10">
                            Online
                        </div>
                    ) : (
                        <div className="bg-white/5 text-gray-500 px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-tighter border border-white/5">
                            Setup
                        </div>
                    )}
                  </div>
                </div>

                {/* Info Text */}
                <div className="mb-8">
                  <h3 className="font-bold text-white text-base truncate mb-0.5">{guild.name}</h3>
                  <p className="text-[10px] text-gray-500 font-mono tracking-tight uppercase">UID: {guild.id}</p>
                </div>

                {/* Action Button */}
                <div className="mt-auto">
                    {!isWhitelisted ? (
                         <button disabled className="w-full py-2.5 rounded-xl bg-white/5 text-gray-600 font-bold text-xs uppercase cursor-not-allowed">
                            Gesperrt
                        </button>
                    ) : isBotInGuild ? (
                        <Link href={`/dashboard/${guild.id}`} className="block w-full">
                            <button className="w-full py-2.5 rounded-xl bg-[#5865F2] hover:bg-[#4752C4] text-white font-bold text-xs uppercase transition-all">
                                Konfigurieren
                            </button>
                        </Link>
                    ) : (
                        <a href={`${inviteUrl}&guild_id=${guild.id}`} target="_blank" className="block w-full">
                            <button className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-xs uppercase border border-white/5 transition-all">
                                Bot Einladen
                            </button>
                        </a>
                    )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}