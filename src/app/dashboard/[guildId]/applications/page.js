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

async function ApplicationContent({ guildId }) {
    await connectDB();
    const settings = (await GuildSettings.findOne({ guildId }).lean()) || {};
    const { channels, roles } = await getDiscordData(guildId);

    return (
        <SettingsForm 
            module="applications" 
            guildId={guildId} 
            initialSettings={JSON.parse(JSON.stringify(settings))} 
            channels={channels} 
            roles={roles} 
        />
    );
}

export default async function ApplicationsPage({ params }) {
    const { guildId } = await params;

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-black text-white tracking-tight">Bewerbungen</h1>
            <Suspense fallback={<SettingsFormSkeleton />}>
                <ApplicationContent guildId={guildId} />
            </Suspense>
        </div>
    );
}