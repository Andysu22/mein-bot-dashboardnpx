import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import PageWrapper from "@/components/PageWrapper"; // ✅ NEU

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
    <div className="flex min-h-screen bg-[#0f1012]">
      <Sidebar guildId={guildId} guildName={guildData.guildName} guildIcon={guildData.guildIcon} />

      {/* ✅ w-72 Sidebar -> ml-72 statt ml-64 */}
      <main className="flex-1 lg:ml-72 w-full h-full">
        {/* ✅ PageWrapper entscheidet: modal-builder = kein Padding */}
        <PageWrapper>
          {children}
        </PageWrapper>
      </main>
    </div>
  );
}
