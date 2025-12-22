import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import PageWrapper from "@/components/PageWrapper"; // <--- IMPORTIEREN

async function getDiscordData(guildId) {
    const botToken = process.env.DISCORD_TOKEN;
    try {
        const res = await fetch(`https://discord.com/api/v10/guilds/${guildId}`, { 
            headers: { Authorization: `Bot ${botToken}` },
            cache: 'no-store' 
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
    if (!guildData) redirect("/dashboard?error=bot_missing");

    return (
        <div className="flex h-screen bg-[#0f1012] overflow-hidden">
            <Sidebar guildId={guildId} guildName={guildData.guildName} guildIcon={guildData.guildIcon} />
            
            {/* Hier kein Padding mehr! Das macht jetzt der Wrapper innen drin. */}
            <main className="flex-1 lg:ml-64 w-full h-full relative overflow-y-auto custom-scroll bg-[#0f1012]">
                <PageWrapper>
                    {children}
                </PageWrapper>
            </main>
        </div>
    );
}