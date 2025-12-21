import { Suspense } from "react";
import SettingsForm from "@/components/SettingsForm";
import SettingsFormSkeleton from "@/components/SettingsFormSkeleton";
import connectDB from "@/lib/db";
import { GuildSettings } from "@/models/GuildSettings";

async function getDiscordData(guildId) {
    const botToken = process.env.DISCORD_TOKEN;
    const headers = { Authorization: `Bot ${botToken}` };
    try {
        const [cRes, rRes] = await Promise.all([
            fetch(`https://discord.com/api/v10/guilds/${guildId}/channels`, { headers, next: { revalidate: 300 } }),
            fetch(`https://discord.com/api/v10/guilds/${guildId}/roles`, { headers, next: { revalidate: 300 } })
        ]);
        return { 
            channels: cRes.ok ? await cRes.json() : [], 
            roles: rRes.ok ? await rRes.json() : [] 
        };
    } catch { return { channels: [], roles: [] }; }
}

// Diese Komponente lädt die Daten sicher auf dem Server
async function TicketContent({ guildId }) {
    await connectDB();
    const settings = (await GuildSettings.findOne({ guildId }).lean()) || {};
    const { channels, roles } = await getDiscordData(guildId);

    return (
        <SettingsForm 
            module="tickets" 
            guildId={guildId} 
            initialSettings={JSON.parse(JSON.stringify(settings))} 
            channels={channels} 
            roles={roles} 
        />
    );
}

export default async function TicketsPage({ params }) {
    const { guildId } = await params;

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-black text-white">Ticket System</h1>
            
            {/* WICHTIG: Du musst hier TicketContent aufrufen! 
               TicketContent kümmert sich um das Laden der Daten (settings, channels, roles)
               und gibt diese dann an das SettingsForm weiter.
            */}
            <Suspense fallback={<SettingsFormSkeleton />}>
                <TicketContent guildId={guildId} />
            </Suspense>
        </div>
    );
}