import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/app/api/auth/[...nextauth]/route"; 
import Link from "next/link"; 

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
    next: { revalidate: 60 }
  });
  if (!res.ok) return [];
  return res.json();
}

export default async function DashboardOverview() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/");

  const [userGuilds, botGuilds] = await Promise.all([
    getUserGuilds(session.accessToken),
    getBotGuilds()
  ]);

  const botGuildIds = new Set(Array.isArray(botGuilds) ? botGuilds.map(g => g.id) : []);

  const manageableGuilds = Array.isArray(userGuilds) 
    ? userGuilds.filter((g) => {
        // Admin (0x8) oder Manage Server (0x20) Rechte
        const p = BigInt(g.permissions);
        const hasRights = (p & BigInt(0x8)) === BigInt(0x8) || (p & BigInt(0x20)) === BigInt(0x20);
        return hasRights && botGuildIds.has(g.id);
      })
    : [];

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Deine Server</h1>
      <p className="text-muted-foreground mb-8">Wähle einen Server zum Bearbeiten.</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {manageableGuilds.map((guild) => (
          <Link 
            key={guild.id} 
            href={`/dashboard/${guild.id}`}
            className="flex items-center p-4 border rounded-xl hover:bg-slate-50 transition shadow-sm"
          >
            {guild.icon ? (
              <img src={`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`} alt="" className="w-16 h-16 rounded-full mr-4 bg-slate-200" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-slate-200 mr-4 flex items-center justify-center font-bold text-slate-500">
                {guild.name.charAt(0)}
              </div>
            )}
            <div className="overflow-hidden">
              <span className="font-semibold text-lg block truncate">{guild.name}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}