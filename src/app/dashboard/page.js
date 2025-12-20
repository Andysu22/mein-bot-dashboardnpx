import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import Link from "next/link";
import { Settings, Plus, ShieldAlert, CheckCircle2 } from "lucide-react";
import connectDB from "@/lib/db";                
import { Whitelist } from "@/models/Whitelist";  
import LoginView from "@/components/LoginView"; // <--- NEU IMPORTIEREN

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
    // ÄNDERUNG: revalidate auf 0 setzen (= kein Cache, immer live)
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
    <div className="min-h-screen bg-[#1a1c1f] text-gray-100 p-8">
      <div className="max-w-7xl mx-auto pt-4">
        
        <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-4">
            <div>
                <h1 className="text-3xl font-bold text-white">Deine Server</h1>
                <p className="text-gray-400 mt-1">
                  {isWhitelistActive 
                    ? "Nur gewhitelistete Server können verwaltet werden." 
                    : "Wähle einen Server zum Verwalten."}
                </p>
            </div>
            {/* User-Info ist jetzt in der Navbar, können wir hier weglassen oder als "Welcome" lassen */}
        </div>
      
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {adminGuilds.map((guild) => {
            const isBotInGuild = botGuildIds.has(guild.id);
            const isWhitelisted = !isWhitelistActive || whitelistedIds.has(guild.id);

            return (
              <div 
                key={guild.id} 
                className={`group relative flex flex-col p-6 rounded-2xl border transition-all duration-300 shadow-xl
                  ${isWhitelisted 
                    ? "bg-[#232529] border-white/5 hover:border-indigo-500/50 hover:shadow-indigo-500/10 hover:-translate-y-1" 
                    : "bg-[#232529]/60 border-red-500/20 opacity-80"
                  }`}
              >
                {/* Status Badge */}
                <div className="absolute top-4 right-4">
                     {isWhitelistActive && !isWhitelisted ? (
                        <div className="bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-1 rounded text-xs font-bold flex items-center gap-1">
                             <ShieldAlert className="w-3 h-3" /> Gesperrt
                        </div>
                     ) : isBotInGuild ? (
                        <div className="bg-green-500/10 text-green-400 border border-green-500/20 px-2 py-1 rounded text-xs font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Aktiv
                        </div>
                     ) : (
                        <div className="bg-gray-700/50 text-gray-400 px-2 py-1 rounded text-xs font-bold border border-white/5">
                            Invite
                        </div>
                     )}
                </div>

                <div className="flex items-center gap-5 mb-6">
                  {guild.icon ? (
                    <img src={`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`} className="w-16 h-16 rounded-2xl bg-[#1e1f22] shadow-lg group-hover:scale-105 transition-transform" />
                  ) : (
                    <div className="w-16 h-16 rounded-2xl bg-[#1e1f22] flex items-center justify-center text-xl font-bold text-gray-500 group-hover:scale-105 transition-transform border border-white/5">
                      {guild.name.charAt(0)}
                    </div>
                  )}
                  <div className="overflow-hidden">
                    <h3 className="font-bold text-lg text-white truncate">{guild.name}</h3>
                    <p className="text-xs text-gray-500 font-mono mt-1">ID: {guild.id}</p>
                  </div>
                </div>

                <div className="mt-auto">
                    {!isWhitelisted ? (
                         <button disabled className="w-full py-3 px-4 rounded-xl bg-red-500/5 text-red-500/50 font-medium flex items-center justify-center gap-2 cursor-not-allowed border border-red-500/10">
                            <ShieldAlert className="w-4 h-4" />
                            Keine Lizenz
                        </button>
                    ) : isBotInGuild ? (
                        <Link href={`/dashboard/${guild.id}`} className="block w-full">
                            <button className="w-full py-3 px-4 rounded-xl bg-[#5865F2] hover:bg-[#4752C4] text-white font-semibold flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-500/20">
                                <Settings className="w-4 h-4" />
                                Konfigurieren
                            </button>
                        </Link>
                    ) : (
                        <a href={`${inviteUrl}&guild_id=${guild.id}`} target="_blank" className="block w-full">
                            <button className="w-full py-3 px-4 rounded-xl bg-[#23a559] hover:bg-[#1f8b4c] text-white font-semibold flex items-center justify-center gap-2 transition-all shadow-lg shadow-green-500/20">
                                <Plus className="w-4 h-4" />
                                Setup Starten
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