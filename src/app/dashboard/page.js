"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  UserPlus, Settings, LayoutGrid, ArrowLeft, 
  ShieldCheck, Globe, Zap, Server, RefreshCw 
} from "lucide-react";
import ServerCard from "@/components/ServerCard";

export default function DashboardSelectorPage() {
    const [guilds, setGuilds] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchGuilds = async () => {
        setRefreshing(true);
        try {
            // Die API liefert BEREITS gefilterte Admin-Guilds (ohne permissions Feld)
            const res = await fetch("/api/user/guilds?force=true");
            
            if (!res.ok) {
                console.error("API Fehler:", res.status);
                // Optional: Hier könntest du einen Fehler-State setzen
                return;
            }

            const data = await res.json();
            
            if (Array.isArray(data)) {
                // WICHTIG: Nicht mehr filtern! Die API hat das schon erledigt.
                // Einfach die Daten übernehmen.
                setGuilds(data); 
            } else {
                console.error("Daten sind kein Array:", data);
            }
        } catch (error) {
            console.error("Fehler beim Laden der Guilds:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchGuilds();
    }, []);

    // Trennung der Server basierend auf dem hasBot Attribut
    const activeGuilds = guilds.filter(g => g.hasBot);
    const availableGuilds = guilds.filter(g => !g.hasBot);

    return (
        <div className="min-h-screen bg-[#0f1012] text-gray-100">
            <div className="max-w-7xl mx-auto px-6 py-12 md:py-20 lg:px-12">
                
                {/* HEADER */}
                <div className="flex flex-col gap-8 mb-16">
                    <Link href="/" className="flex items-center gap-2 px-4 py-2 bg-white/[0.03] border border-white/5 rounded-full text-gray-500 hover:text-white hover:bg-white/10 transition-all group w-fit">
                        <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-left">Zurück zur Startseite</span>
                    </Link>

                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div className="flex items-center gap-4">
                            <div className="p-2.5 bg-[#5865F2]/10 rounded-xl text-[#5865F2] hidden sm:block">
                                <LayoutGrid className="w-6 h-6" />
                            </div>
                            <h1 className="text-3xl md:text-5xl lg:text-6xl font-black uppercase tracking-tighter whitespace-nowrap leading-none text-left">
                                DEINE <span className="text-gray-500 font-light text-left">COMMUNITYS</span>
                            </h1>
                        </div>

                        <div className="flex items-center gap-3">
                            {/* REFRESH BUTTON MIT TEXT */}
                            <button 
                                onClick={fetchGuilds}
                                disabled={refreshing}
                                className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/5 rounded-lg hover:bg-white/10 transition-all group disabled:opacity-50"
                            >
                                <RefreshCw className={`w-3.5 h-3.5 text-gray-400 group-hover:text-white transition-all ${refreshing ? "animate-spin text-[#5865F2]" : ""}`} />
                                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 group-hover:text-white">Refresh</span>
                            </button>

                            <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/5 rounded-lg w-fit">
                                <span className="text-[10px] font-black text-[#5865F2] text-left">{guilds.length}</span>
                                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest text-left">Server</span>
                            </div>
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4 text-left">
                        <div className="w-12 h-12 border-4 border-[#5865F2]/20 border-t-[#5865F2] rounded-full animate-spin" />
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest text-left">Lade Server-Daten...</p>
                    </div>
                ) : (
                    <div className="space-y-20">
                        {/* AKTIVE SERVER */}
                        {activeGuilds.length > 0 && (
                            <section className="space-y-8">
                                <div className="flex items-center gap-4 text-left">
                                    <div className="flex items-center gap-2.5 text-[#23a559] text-left">
                                        <Zap className="w-3.5 h-3.5 fill-[#23a559]" />
                                        <h2 className="text-[11px] font-black uppercase tracking-[0.25em] text-left">Aktive Server</h2>
                                    </div>
                                    <div className="flex-1 h-px bg-gradient-to-r from-white/10 to-transparent" />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 text-left">
                                    {activeGuilds.map(g => <ServerCard key={g.id} g={g} />)}
                                </div>
                            </section>
                        )}

                        {/* VERFÜGBARE SERVER */}
                        {availableGuilds.length > 0 && (
                            <section className="space-y-8 text-left">
                                <div className="flex items-center gap-4 text-left">
                                    <div className="flex items-center gap-2.5 text-gray-500 text-left">
                                        <Server className="w-3.5 h-3.5 text-left" />
                                        <h2 className="text-[11px] font-black uppercase tracking-[0.25em] text-left">Verfügbare Server</h2>
                                    </div>
                                    <div className="flex-1 h-px bg-gradient-to-r from-white/10 to-transparent" />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 text-left">
                                    {availableGuilds.map(g => <ServerCard key={g.id} g={g} />)}
                                </div>
                            </section>
                        )}

                        {guilds.length === 0 && (
                            <div className="text-center py-20 text-left">
                                <p className="text-gray-500 font-bold uppercase tracking-widest text-[10px]">Keine Administrator-Server gefunden</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}