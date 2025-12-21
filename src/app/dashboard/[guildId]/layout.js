import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import Sidebar from "@/components/Sidebar";

async function getDiscordData(guildId) {
    const botToken = process.env.DISCORD_TOKEN;
    try {
        const res = await fetch(`https://discord.com/api/v10/guilds/${guildId}`, { 
            headers: { Authorization: `Bot ${botToken}` },
            cache: 'no-store' // WICHTIG: Live-Check ob Bot noch da ist
        });
        if (!res.ok) return null;
        const data = await res.json();
        return { 
            guildName: data.name, 
            guildIcon: data.icon ? `https://cdn.discordapp.com/icons/${guildId}/${data.icon}.png` : null 
        };
    } catch { return null; }
}

export default async function DashboardLayout({ children, params }) {
    const { guildId } = await params;
    const session = await getServerSession(authOptions);
    if (!session) redirect("/");

    const guildData = await getDiscordData(guildId);

    // Sicherheits-Redirect wenn Bot weg oder Server ungültig
    if (!guildData) {
        redirect("/dashboard?error=bot_missing");
    }

    return (
        <div className="flex min-h-screen bg-[#0f1012]">
            <Sidebar guildId={guildId} guildName={guildData.guildName} guildIcon={guildData.guildIcon} />
            <main className="flex-1 lg:ml-64 w-full h-full">
                <div className="p-6 md:p-12 lg:p-16 pt-24 lg:pt-12 pb-32">
                    {children}
                </div>
            </main>
        </div>
    );
}