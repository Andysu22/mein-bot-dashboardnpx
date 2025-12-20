import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/db";
import { GuildSettings } from "@/models/GuildSettings";
import SettingsForm from "@/components/SettingsForm"; 

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
  if (!botToken) return { channels: [], roles: [] };
  const headers = { Authorization: `Bot ${botToken}` };
  try {
    const [cRes, rRes] = await Promise.all([
      fetch(`https://discord.com/api/v10/guilds/${guildId}/channels`, { headers, next: { revalidate: 10 } }),
      fetch(`https://discord.com/api/v10/guilds/${guildId}/roles`, { headers, next: { revalidate: 10 } })
    ]);
    return { 
      channels: cRes.ok ? await cRes.json() : [], 
      roles: rRes.ok ? await rRes.json() : [] 
    };
  } catch { return { channels: [], roles: [] }; }
}

export default async function GuildSettingsPage(props) {
  // Params abwarten (Next.js 15)
  const params = await props.params;
  const { guildId } = params;

  if (!guildId) return <div>Fehler: Keine ID gefunden.</div>;

  const session = await getServerSession(authOptions);
  if (!session) redirect("/");

  const isAdmin = await checkAdmin(session.accessToken, guildId);
  if (!isAdmin) return <div className="p-10 text-red-500 font-bold">Zugriff verweigert.</div>;

  await connectDB();
  let settings = await GuildSettings.findOne({ guildId }).lean();
  if (!settings) settings = {};
  settings = JSON.parse(JSON.stringify(settings));

  const { channels, roles } = await getDiscordData(guildId);

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8 border-b pb-4">
        <h1 className="text-3xl font-bold">Server Konfiguration</h1>
        <p className="text-muted-foreground">ID: {guildId}</p>
      </div>
      <SettingsForm 
        guildId={guildId} 
        initialSettings={settings} 
        channels={channels} 
        roles={roles} 
      />
    </div>
  );
}