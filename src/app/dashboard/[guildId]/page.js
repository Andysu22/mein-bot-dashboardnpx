import { 
    MessageSquare, Mic, FileText, ShieldCheck, 
    ArrowRight, Users, Activity, Zap, 
    LayoutDashboard, ChevronLeft
} from "lucide-react";
import Link from "next/link";

/**
 * Holt Server-Daten robust von der Discord API.
 */
async function getDiscordData(guildId) {
    const botToken = process.env.DISCORD_TOKEN;
    
    if (!botToken) {
        return null;
    }

    try {
        const res = await fetch(`https://discord.com/api/v10/guilds/${guildId}?with_counts=true`, { 
            headers: { Authorization: `Bot ${botToken}` },
            next: { revalidate: 60 } 
        });

        if (!res.ok) throw new Error(`Discord API Error: ${res.status}`);

        const data = await res.json();
        return { 
            name: data.name,
            members: data.approximate_member_count || 0,
            online: data.approximate_presence_count || 0,
            boosts: data.premium_tier || 0,
            icon: data.icon ? `https://cdn.discordapp.com/icons/${data.id}/${data.icon}.png` : null
        };
    } catch (error) {
        return null; 
    }
}

/**
 * Helper für die Stats oben rechts
 */
const StatCard = ({ icon: Icon, label, value, colorClass }) => (
    <div className="bg-[#18181b] border border-white/5 p-4 rounded-2xl flex items-center gap-4">
        <div className={`p-2.5 rounded-xl bg-white/5 ${colorClass}`}>
            <Icon className="w-5 h-5" />
        </div>
        <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
            <p className="text-xl font-bold text-white tabular-nums">{value}</p>
        </div>
    </div>
);

export default async function DashboardPage({ params }) {
    const { guildId } = await params;
    const data = await getDiscordData(guildId);

    const guildName = data?.name || "Unbekannter Server";
    const memberCount = data?.members?.toLocaleString() || "-";
    const onlineCount = data?.online?.toLocaleString() || "-";
    const boostLevel = data?.boosts || "0";

    const modules = [
        { 
            id: "tickets", 
            name: "Ticket System", 
            desc: "Support-Workflows automatisieren und Logs verwalten.", 
            icon: <MessageSquare className="w-6 h-6" />, 
            styleClass: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
            link: `/dashboard/${guildId}/tickets` 
        },
        { 
            id: "voice", 
            name: "Voice Hubs", 
            desc: "Dynamische Sprachkanäle erstellen und verwalten.", 
            icon: <Mic className="w-6 h-6" />, 
            styleClass: "text-orange-400 bg-orange-500/10 border-orange-500/20",
            link: `/dashboard/${guildId}/voice` 
        },
        { 
            id: "apps", 
            name: "Bewerbungen", 
            desc: "Formulare erstellen und Kandidaten managen.", 
            icon: <FileText className="w-6 h-6" />, 
            styleClass: "text-pink-400 bg-pink-500/10 border-pink-500/20",
            link: `/dashboard/${guildId}/applications` 
        },
        { 
            id: "mod", 
            name: "Moderation", 
            desc: "Sicherheitstools, Auto-Mod und Benutzerverwaltung.", 
            icon: <ShieldCheck className="w-6 h-6" />, 
            styleClass: "text-red-400 bg-red-500/10 border-red-500/20",
            link: `/dashboard/${guildId}/moderation` 
        }
    ];

    return (
        <div className="w-full max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            
            {/* --- HEADER --- */}
            <div className="flex items-center justify-between">
                <Link 
                    href="/dashboard" 
                    className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors group"
                >
                    <div className="p-1.5 rounded-lg bg-white/5 border border-white/5 group-hover:bg-white/10 transition-colors">
                        <ChevronLeft className="w-4 h-4" />
                    </div>
                    <span>Serverübersicht</span>
                </Link>
                {/* STATUS BADGE WURDE HIER ENTFERNT */}
            </div>

            {/* --- HERO --- */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-[#111113] border border-white/5 rounded-3xl p-8 relative overflow-hidden flex flex-col justify-between min-h-[200px]">
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-4">
                            <span className="px-3 py-1 rounded-lg bg-[#5865F2]/10 text-[#5865F2] text-xs font-bold border border-[#5865F2]/20">
                                DASHBOARD
                            </span>
                        </div>
                        <h1 className="text-3xl md:text-5xl font-bold text-white mb-3 tracking-tight">
                            {guildName}
                        </h1>
                        <p className="text-gray-400 max-w-lg leading-relaxed">
                            Willkommen im Kontrollzentrum. Verwalte alle Module und Einstellungen zentral an einem Ort.
                        </p>
                    </div>
                    <div className="absolute right-0 top-0 w-64 h-64 bg-gradient-to-br from-[#5865F2]/10 via-transparent to-transparent opacity-50 blur-3xl pointer-events-none" />
                </div>

                <div className="flex flex-col gap-3">
                    <StatCard icon={Users} label="Mitglieder" value={memberCount} colorClass="text-blue-400" />
                    <StatCard icon={Activity} label="Online" value={onlineCount} colorClass="text-emerald-400" />
                    <StatCard icon={Zap} label="Boost Level" value={`Level ${boostLevel}`} colorClass="text-purple-400" />
                </div>
            </div>

            <div className="h-px w-full bg-white/5" />

            {/* --- MODULE GRID --- */}
            <div>
                <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                    <LayoutDashboard className="w-5 h-5 text-gray-400" />
                    Verfügbare Module
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {modules.map((mod) => (
                        <Link 
                            key={mod.id} 
                            href={mod.link}
                            className="group relative bg-[#111113] border border-white/5 hover:border-white/10 p-5 rounded-2xl transition-all duration-300 hover:bg-[#151518]"
                        >
                            <div className="flex items-start gap-5">
                                <div className={`
                                    h-14 w-14 shrink-0 rounded-2xl flex items-center justify-center border transition-transform duration-300 group-hover:scale-105
                                    ${mod.styleClass}
                                `}>
                                    {mod.icon}
                                </div>
                                
                                <div className="flex-1 min-w-0 pt-1">
                                    <div className="flex items-center justify-between mb-1">
                                        <h3 className="text-lg font-bold text-white group-hover:text-blue-200 transition-colors">
                                            {mod.name}
                                        </h3>
                                        <ArrowRight className="w-5 h-5 text-gray-600 group-hover:text-white transition-all transform group-hover:translate-x-1" />
                                    </div>
                                    <p className="text-sm text-gray-500 leading-relaxed truncate">
                                        {mod.desc}
                                    </p>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}