import { 
  Zap, Activity, MessageSquare, Mic, FileText, 
  ShieldCheck, ArrowRight, Users, Crown, Globe,
  ShieldAlert, Sparkles, Hash, ChevronLeft, Settings
} from "lucide-react";
import Link from "next/link";

async function getDiscordData(guildId) {
    const botToken = process.env.DISCORD_TOKEN;
    try {
        const res = await fetch(`https://discord.com/api/v10/guilds/${guildId}?with_counts=true`, { 
            headers: { Authorization: `Bot ${botToken}` },
            next: { revalidate: 60 } 
        });
        const data = await res.json();
        return { 
            guildName: data?.name || "Server",
            memberCount: data?.approximate_member_count || "0",
            onlineCount: data?.approximate_presence_count || "0",
            boostLevel: data?.premium_tier || "0"
        };
    } catch { 
        return { guildName: "Server", memberCount: "0", onlineCount: "0", boostLevel: "0" }; 
    }
}

const Badge = ({ children, color = "blue" }) => (
  <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
    color === "emerald" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : 
    "bg-[#5865F2]/10 text-[#5865F2] border-[#5865F2]/20"
  }`}>
    {children}
  </span>
);

export default async function DashboardPage({ params }) {
    const { guildId } = await params;
    const { guildName, memberCount, onlineCount, boostLevel } = await getDiscordData(guildId);

    const modules = [
        { id: "tickets", name: "Tickets", desc: "Support & Log-Management", icon: <MessageSquare className="w-6 h-6 text-emerald-400" />, link: `/dashboard/${guildId}/tickets` },
        { id: "voice", name: "Voice Hubs", desc: "Dynamische Sprachkanäle", icon: <Mic className="w-6 h-6 text-orange-400" />, link: `/dashboard/${guildId}/voice` },
        { id: "apps", name: "Recruitment", desc: "Team-Bewerbungsprozesse", icon: <FileText className="w-6 h-6 text-pink-400" />, link: `/dashboard/${guildId}/applications` },
        { id: "mod", name: "Security", desc: "Auto-Moderation & Schutz", icon: <ShieldCheck className="w-6 h-6 text-red-400" />, link: `/dashboard/${guildId}/moderation` }
    ];

    return (
        <div className="w-full space-y-6 animate-in fade-in zoom-in-95 duration-500 text-left">
            
            {/* ZURÜCK-BUTTON MIT ABGERUNDETEM HINTERGRUND */}
            <Link 
                href="/dashboard" 
                className="flex items-center gap-2 px-4 py-2 bg-white/[0.03] border border-white/5 rounded-full text-gray-500 hover:text-white hover:bg-white/10 transition-all w-fit mb-4 group"
            >
                <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                <span className="text-[10px] font-bold uppercase tracking-widest">Server wechseln</span>
            </Link>

            <div className="relative overflow-hidden bg-[#18191c] border border-white/5 p-10 rounded-[2.5rem] shadow-2xl text-left">
                <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-[#5865F2]/5 to-transparent pointer-events-none" />
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8 text-left">
                    <div className="space-y-4 text-left">
                        <div className="flex items-center gap-3 text-left">
                            <Badge color="blue">KONTROLLZENTRUM</Badge>
                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-500 uppercase tracking-widest text-left">
                                <Activity className="w-3 h-3 text-emerald-500 text-left" /> System Stabil
                            </div>
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white uppercase text-left tracking-tighter">{guildName}</h1>
                        <p className="max-w-xl text-gray-400 text-sm font-medium leading-relaxed text-left">
                            Verwalte deine Community mit maximaler Präzision. Konfiguriere Module, überwache Aktivitäten und optimiere deinen Server.
                        </p>
                    </div>
                    <div className="bg-black/20 backdrop-blur-md border border-white/5 p-6 rounded-2xl w-full md:w-72 space-y-4 text-left">
                        <div className="grid grid-cols-2 gap-4 text-left">
                            <div className="text-left">
                                <div className="text-xs text-gray-500 mb-1 text-left">Mitglieder</div>
                                <div className="text-lg font-black text-white text-left">{memberCount}</div>
                            </div>
                            <div className="text-left">
                                <div className="text-xs text-gray-500 mb-1 text-left">Boosts</div>
                                <div className="text-lg font-black text-white text-left">Lvl {boostLevel}</div>
                            </div>
                        </div>
                        <div className="pt-2 border-t border-white/5 text-emerald-500 font-bold text-[10px] uppercase text-left">
                            {onlineCount} Online
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                {modules.map((mod) => (
                    <Link key={mod.id} href={mod.link} className="group flex items-center justify-between bg-[#18191c] border border-white/5 p-6 rounded-3xl hover:bg-white/[0.03] transition-all text-left">
                        <div className="flex items-center gap-5 text-left">
                            <div className="p-4 bg-white/5 rounded-2xl text-left">{mod.icon}</div>
                            <div className="text-left">
                                <h3 className="text-lg font-bold text-white uppercase italic text-left">{mod.name}</h3>
                                <p className="text-gray-500 text-xs text-left">{mod.desc}</p>
                            </div>
                        </div>
                        <ArrowRight className="w-5 h-5 text-gray-700 group-hover:text-white transition-all text-left" />
                    </Link>
                ))}
            </div>
        </div>
    );
}