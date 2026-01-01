import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import PageWrapper from "@/components/PageWrapper"; 

async function getDiscordData(guildId) {
  const botToken = process.env.DISCORD_TOKEN;
  try {
    const res = await fetch(`https://discord.com/api/v10/guilds/${guildId}`, {
      headers: { Authorization: `Bot ${botToken}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = await res.json();
    return {
      guildName: data.name,
      guildIcon: data.icon ? `https://cdn.discordapp.com/icons/${guildId}/${data.icon}.png` : null,
    };
  } catch {
    return null;
  }
}

export default async function DashboardLayout({ children, params }) {
  const { guildId } = await params;
  const session = await getServerSession(authOptions);
  if (!session) redirect("/");

  const guildData = await getDiscordData(guildId);
  if (!guildData) redirect("/dashboard?error=bot_missing");

  return (
    // Hintergrund & Text Farben angepasst an dein Theme
    <div className="flex min-h-screen bg-background text-foreground transition-colors duration-300">
      <Sidebar guildId={guildId} guildName={guildData.guildName} guildIcon={guildData.guildIcon} />

      {/* lg:ml-72 sorgt für den Platz neben der Sidebar auf Desktop.
         w-full sorgt für volle Breite im verbleibenden Raum.
      */}
      <main className="flex-1 lg:ml-72 w-full h-full">
        <PageWrapper>
          {children}
        </PageWrapper>
      </main>
    </div>
  );
}