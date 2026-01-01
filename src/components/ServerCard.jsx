"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Users, Lock, Globe, Settings, UserPlus } from "lucide-react";

export default function ServerCard({ g }) {
  const [memberCount, setMemberCount] = useState(null);
  const CACHE_KEY = `members_${g.id}`;

  useEffect(() => {
    // WICHTIG: Wir können nur Daten laden, wenn der Bot auf dem Server ist
    if (!g.hasBot) return;

    const cached = sessionStorage.getItem(CACHE_KEY);
    const now = Date.now();

    if (cached) {
      const { value, expiry } = JSON.parse(cached);
      if (now < expiry) {
        setMemberCount(value);
        return;
      }
    }

    async function fetchMembers() {
      try {
        const res = await fetch(`/api/guilds/${g.id}/members`);
        const data = await res.json();
        if (data.count !== undefined) {
          setMemberCount(data.count);
          sessionStorage.setItem(CACHE_KEY, JSON.stringify({
            value: data.count,
            expiry: now + 5 * 60 * 1000
          }));
        }
      } catch (e) { console.error("Fehler beim Laden der Member:", e); }
    }
    fetchMembers();
  }, [g.id, g.hasBot]);

  return (
    // GEÄNDERT: bg-[#18191c] -> bg-card, border-white/5 -> border-border
    <div className="bg-card p-6 rounded-[2.5rem] border border-border flex flex-col items-center text-center transition-all hover:bg-muted/30 hover:border-primary/30 group shadow-sm">
      
      <div className="mb-6 relative">
        {/* GEÄNDERT: bg-white/5 -> bg-muted */}
        <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center overflow-hidden border border-border transition-transform group-hover:scale-105 shadow-xl">
          {g.icon ? (
            <img src={`https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png`} className="w-full h-full object-cover" alt="" />
          ) : (
            // GEÄNDERT: text-gray-400 -> text-muted-foreground
            <span className="text-xl font-black text-muted-foreground uppercase">{g.name[0]}</span>
          )}
        </div>
        {/* GEÄNDERT: border-[#18191c] -> border-card, bg-gray-700 -> bg-muted-foreground */}
        <div className={`absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full border-[3px] border-card ${g.hasBot ? 'bg-emerald-500' : 'bg-muted-foreground'}`} />
      </div>

      {/* GEÄNDERT: text-white -> text-foreground */}
      <h3 className="text-lg font-black text-foreground mb-6 truncate w-full uppercase tracking-tight leading-tight">{g.name}</h3>

      {/* INFO-REIHE - Original Layout beibehalten, nur Farben angepasst */}
      <div className="flex items-center gap-4 mb-8 text-muted-foreground opacity-80">
        <div className="flex items-center gap-1.5 min-w-[70px] justify-center">
          <Users className="w-3 h-3" />
          {g.hasBot ? (
            memberCount !== null ? (
              <span className="text-[9px] font-bold uppercase tracking-widest animate-in fade-in duration-500 text-foreground">
                {memberCount.toLocaleString()} Member
              </span>
            ) : (
              // GEÄNDERT: bg-white/10 -> bg-muted
              <div className="h-2 w-10 bg-muted rounded animate-pulse" />
            )
          ) : (
            <span className="text-[9px] font-bold uppercase tracking-widest italic opacity-60">
              Setup nötig
            </span>
          )}
        </div>
        
        {/* GEÄNDERT: bg-white/20 -> bg-border */}
        <div className="w-1 h-1 bg-border rounded-full" />
        
        <div className="flex items-center gap-1.5">
          {g.isPublic ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
          <span className="text-[9px] font-bold uppercase tracking-widest text-foreground">
            {g.isPublic ? "Öffentlich" : "Privat"}
          </span>
        </div>
      </div>

      {/* Link zum Bot einladen */}
      {g.hasBot ? (
        // GEÄNDERT: bg-[#5865F2] -> bg-primary, shadow hardcoded color -> shadow-primary/20
        <Link href={`/dashboard/${g.id}`} className="flex items-center justify-center gap-2 w-full py-3.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-2xl font-bold uppercase text-[10px] tracking-widest transition-all shadow-lg shadow-primary/20">
          <Settings className="w-3.5 h-3.5" /> Dashboard öffnen
        </Link>
      ) : (
        // GEÄNDERT: bg-white/5 -> bg-muted, text-gray-400 -> text-muted-foreground
        <Link 
          href={`https://discord.com/api/oauth2/authorize?client_id=${process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID}&guild_id=${g.id}&permissions=8&scope=bot%20applications.commands`} 
          className="flex items-center justify-center gap-2 w-full py-3.5 bg-muted border border-border text-muted-foreground hover:text-foreground rounded-2xl font-bold uppercase text-[10px] tracking-widest transition-all hover:bg-muted/80"
        >
          <UserPlus className="w-3.5 h-3.5" /> Bot einladen
        </Link>
      )}
    </div>
  );
}