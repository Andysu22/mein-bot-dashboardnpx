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
    <div className="bg-[#18191c] p-6 rounded-[2.5rem] border border-white/5 flex flex-col items-center text-center transition-all hover:bg-white/[0.02] hover:border-white/10 group">
      <div className="mb-6 relative">
        <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center overflow-hidden border border-white/5 transition-transform group-hover:scale-105 shadow-xl">
          {g.icon ? (
            <img src={`https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png`} className="w-full h-full object-cover" alt="" />
          ) : (
            <span className="text-xl font-black text-gray-400 uppercase">{g.name[0]}</span>
          )}
        </div>
        <div className={`absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full border-[3px] border-[#18191c] ${g.hasBot ? 'bg-emerald-500' : 'bg-gray-700'}`} />
      </div>

      <h3 className="text-lg font-black text-white mb-6 truncate w-full uppercase tracking-tight leading-tight">{g.name}</h3>

      {/* INFO-REIHE - Optimiert für User-Experience */}
<div className="flex items-center gap-4 mb-8 opacity-40">
  <div className="flex items-center gap-1.5 min-w-[70px] justify-center">
    <Users className="w-3 h-3" />
    {g.hasBot ? (
      memberCount !== null ? (
        <span className="text-[9px] font-bold uppercase tracking-widest animate-in fade-in duration-500">
          {memberCount.toLocaleString()} Member
        </span>
      ) : (
        <div className="h-2 w-10 bg-white/10 rounded animate-pulse" /> // Skeleton für aktive Server
      )
    ) : (
      <span className="text-[9px] font-bold uppercase tracking-widest italic opacity-60">
        Setup nötig
      </span>
    )}
  </div>
  
  <div className="w-1 h-1 bg-white/20 rounded-full" />
  
  <div className="flex items-center gap-1.5">
    {g.isPublic ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
    <span className="text-[9px] font-bold uppercase tracking-widest">
      {g.isPublic ? "Öffentlich" : "Privat"}
    </span>
  </div>
</div>

      {/* Link zum Bot einladen - Ersetze DEINE_ID durch deine echte Client-ID */}
{g.hasBot ? (
        <Link href={`/dashboard/${g.id}`} className="flex items-center justify-center gap-2 w-full py-3.5 bg-[#5865F2] hover:bg-[#4d59e3] text-white rounded-2xl font-bold uppercase text-[10px] tracking-widest transition-all shadow-lg shadow-[#5865F2]/10">
          <Settings className="w-3.5 h-3.5" /> Dashboard öffnen
        </Link>
      ) : (
        <Link 
          href={`https://discord.com/api/oauth2/authorize?client_id=${process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID}&guild_id=${g.id}&permissions=8&scope=bot%20applications.commands`} 
          className="flex items-center justify-center gap-2 w-full py-3.5 bg-white/5 border border-white/10 text-gray-400 hover:text-white rounded-2xl font-bold uppercase text-[10px] tracking-widest transition-all hover:bg-white/10"
        >
          <UserPlus className="w-3.5 h-3.5" /> Bot einladen
        </Link>
      )}
    </div>
  );
}