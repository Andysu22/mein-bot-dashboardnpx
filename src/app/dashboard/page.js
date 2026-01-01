"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  LayoutGrid, ArrowLeft, Zap, Server, RefreshCw 
} from "lucide-react";
import ServerCard from "@/components/ServerCard";
import PageWrapper from "@/components/PageWrapper"; 

export default function DashboardSelectorPage() {
    const [guilds, setGuilds] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchGuilds = async () => {
        setRefreshing(true);
        try {
            const res = await fetch("/api/user/guilds?force=true");
            if (!res.ok) return;
            const data = await res.json();
            if (Array.isArray(data)) setGuilds(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => { fetchGuilds(); }, []);

    const activeGuilds = guilds.filter(g => g.hasBot);
    const availableGuilds = guilds.filter(g => !g.hasBot);

    return (
        <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
            <PageWrapper>
                {/* GEÄNDERT: py-12/py-20 entfernt. Jetzt passt es sich dem Wrapper an. */}
                <div className="max-w-7xl mx-auto"> 
                    
                    {/* HEADER */}
                    <div className="flex flex-col gap-8 mb-12 mt-2">
                        <Link href="/" className="flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-all group w-fit shadow-sm">
                            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
                            <span className="text-[10px] font-bold uppercase tracking-widest text-left">Zurück zur Startseite</span>
                        </Link>

                        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                            <div className="flex items-center gap-4">
                                <div className="p-2.5 bg-primary/10 rounded-xl text-primary hidden sm:block border border-primary/20">
                                    <LayoutGrid className="w-6 h-6" />
                                </div>
                                <h1 className="text-3xl md:text-5xl lg:text-6xl font-black uppercase tracking-tighter whitespace-nowrap leading-none text-left text-foreground">
                                    DEINE <span className="text-muted-foreground font-light text-left">COMMUNITYS</span>
                                </h1>
                            </div>

                            <div className="flex items-center gap-3">
                                <button 
                                    onClick={fetchGuilds}
                                    disabled={refreshing}
                                    className="flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-lg hover:bg-muted transition-all group disabled:opacity-50 shadow-sm"
                                >
                                    <RefreshCw className={`w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-all ${refreshing ? "animate-spin text-primary" : ""}`} />
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground group-hover:text-foreground">Refresh</span>
                                </button>

                                <div className="flex items-center gap-2 px-3 py-1.5 bg-card border border-border rounded-lg w-fit shadow-sm">
                                    <span className="text-[10px] font-black text-primary text-left">{guilds.length}</span>
                                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest text-left">Server</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4 text-left">
                            <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest text-left">Lade Server-Daten...</p>
                        </div>
                    ) : (
                        <div className="space-y-16 pb-12">
                            {/* AKTIVE SERVER */}
                            {activeGuilds.length > 0 && (
                                <section className="space-y-6">
                                    <div className="flex items-center gap-4 text-left">
                                        <div className="flex items-center gap-2.5 text-emerald-500 text-left">
                                            <Zap className="w-3.5 h-3.5 fill-current" />
                                            <h2 className="text-[11px] font-black uppercase tracking-[0.25em] text-left">Aktive Server</h2>
                                        </div>
                                        <div className="flex-1 h-px bg-gradient-to-r from-border to-transparent" />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 text-left">
                                        {activeGuilds.map(g => <ServerCard key={g.id} g={g} />)}
                                    </div>
                                </section>
                            )}

                            {/* VERFÜGBARE SERVER */}
                            {availableGuilds.length > 0 && (
                                <section className="space-y-6 text-left">
                                    <div className="flex items-center gap-4 text-left">
                                        <div className="flex items-center gap-2.5 text-muted-foreground text-left">
                                            <Server className="w-3.5 h-3.5 text-left" />
                                            <h2 className="text-[11px] font-black uppercase tracking-[0.25em] text-left">Verfügbare Server</h2>
                                        </div>
                                        <div className="flex-1 h-px bg-gradient-to-r from-border to-transparent" />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 text-left">
                                        {availableGuilds.map(g => <ServerCard key={g.id} g={g} />)}
                                    </div>
                                </section>
                            )}

                            {guilds.length === 0 && (
                                <div className="text-center py-20 text-left">
                                    <p className="text-muted-foreground font-bold uppercase tracking-widest text-[10px]">Keine Administrator-Server gefunden</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </PageWrapper>
        </div>
    );
}