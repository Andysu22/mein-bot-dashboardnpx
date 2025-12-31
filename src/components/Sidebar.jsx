"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  LayoutDashboard, 
  MessageSquare, 
  Layers, 
  Users, 
  ShieldCheck, 
  Menu, 
  ChevronDown, 
  Plus, 
  FileText,
  Terminal // <--- NEU IMPORTIERT
} from "lucide-react";

const CACHE_KEY = "sidebar_guilds_cache";

const GuildSkeleton = () => (
  <div className="flex items-center gap-3 p-2 animate-pulse">
    <div className="w-6 h-6 rounded-md bg-white/5" />
    <div className="h-3 w-24 bg-white/5 rounded" />
  </div>
);

export default function Sidebar({ guildId, guildName, guildIcon }) {
  const [isOpen, setIsOpen] = useState(false);
  const [showSelector, setShowSelector] = useState(false);
  const [userGuilds, setUserGuilds] = useState([]);
  const [loadingGuilds, setLoadingGuilds] = useState(false);
  
  const pathname = usePathname();
  const router = useRouter();
  const selectorRef = useRef(null);

  const inviteUrl = `https://discord.com/api/oauth2/authorize?client_id=${process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID}&permissions=8&scope=bot%20applications.commands`;

  useEffect(() => {
    function handleClickOutside(event) {
      if (selectorRef.current && !selectorRef.current.contains(event.target)) {
        setShowSelector(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchGuilds = async (force = false) => {
    if (!force) {
        const cached = sessionStorage.getItem(CACHE_KEY);
        if (cached) {
            try {
                const parsed = JSON.parse(cached);
                if (Array.isArray(parsed)) {
                    setUserGuilds(parsed.filter(g => g.hasBot === true));
                    return;
                }
            } catch (e) { sessionStorage.removeItem(CACHE_KEY); }
        }
    }

    setLoadingGuilds(true);
    try {
      const timestamp = new Date().getTime();
      const res = await fetch(`/api/user/guilds?t=${timestamp}`);
      const data = await res.json();
      
      const guildsWithBot = Array.isArray(data) ? data.filter(g => g.hasBot === true) : [];
      setUserGuilds(guildsWithBot);
      
      sessionStorage.setItem(CACHE_KEY, JSON.stringify(data)); 
    } catch (e) {
      setUserGuilds([]);
    } finally {
      setLoadingGuilds(false);
    }
  };

  const handleGuildSelect = (targetId) => {
    setShowSelector(false);
    setIsOpen(false);
    sessionStorage.removeItem(CACHE_KEY);
    router.push(`/dashboard/${targetId}`);
  };

  const routes = [
    { icon: <LayoutDashboard className="w-4 h-4"/>, label: "Übersicht", path: `/dashboard/${guildId}` },
    { icon: <MessageSquare className="w-4 h-4"/>, label: "Ticket System", path: `/dashboard/${guildId}/tickets` },
    { icon: <Layers className="w-4 h-4"/>, label: "Voice Hubs", path: `/dashboard/${guildId}/voice` },
    { icon: <Users className="w-4 h-4"/>, label: "Bewerbungen", path: `/dashboard/${guildId}/applications` },
    { icon: <FileText className="w-4 h-4"/>, label: "Modal Builder", path: `/dashboard/${guildId}/modal-builder` },
    // NEU HINZUGEFÜGT:
    { icon: <Terminal className="w-4 h-4"/>, label: "Custom Commands", path: `/dashboard/${guildId}/commands` },
  ];

  return (
    <>
      {!isOpen && (
        <button onClick={() => setIsOpen(true)} className="lg:hidden fixed top-20 left-4 z-[110] p-2 bg-[#1a1b1e] border border-white/10 text-white rounded-lg shadow-xl">
          <Menu className="w-6 h-6" />
        </button>
      )}
      {isOpen && <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[120] lg:hidden" onClick={() => setIsOpen(false)} />}

      <aside className={`fixed left-0 bottom-0 w-72 bg-[#111214] border-r border-white/5 transition-transform duration-300 top-0 z-[130] ${isOpen ? "translate-x-0" : "-translate-x-full"} lg:top-16 lg:z-40 lg:translate-x-0`}>
        <div className="flex flex-col h-full p-4">
          
          {/* Server Selector */}
          <div className="relative mb-6" ref={selectorRef}>
            <div onClick={() => { if(!showSelector) fetchGuilds(); setShowSelector(!showSelector); }} className={`flex items-center justify-between p-3 rounded-xl transition-all border ${showSelector ? "bg-white/5 border-white/10" : "bg-white/[0.03] border-white/5 hover:bg-white/5"} cursor-pointer`}>
              <div className="flex items-center gap-3 overflow-hidden text-left">
                <div className="w-8 h-8 rounded-lg bg-[#5865F2] flex-shrink-0 flex items-center justify-center font-bold text-xs text-white overflow-hidden">
                  {guildIcon ? (
                    <img src={guildIcon} className="h-full w-full object-cover" alt="" />
                  ) : (
                    // Sicherstellen, dass guildName ein String ist, bevor charAt aufgerufen wird
                    (typeof guildName === 'string' && guildName.length > 0) ? guildName.charAt(0) : "?"
                  )}
                </div>
                <span className="text-sm font-bold text-white truncate">{guildName || "Lade..."}</span>
              </div>
              <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${showSelector ? "rotate-180" : ""}`} />
            </div>

            {showSelector && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-[#18191c] border border-white/10 rounded-xl shadow-2xl z-[150] overflow-hidden">
                <div className="max-h-60 overflow-y-auto custom-scroll p-1 space-y-1">
                  {loadingGuilds ? (
                    <>
                      <GuildSkeleton />
                      <GuildSkeleton />
                    </>
                  ) : (
                    userGuilds.length > 0 ? (
                        userGuilds.map((g) => (
                          <div key={g.id} onClick={() => handleGuildSelect(g.id)} className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${g.id === guildId ? "bg-[#5865F2]/20 text-white" : "hover:bg-white/5 text-gray-400 hover:text-white"}`}>
                            <div className="w-6 h-6 rounded-md bg-[#2b2d31] overflow-hidden flex-shrink-0 flex items-center justify-center text-[10px] font-bold">
                               {g.icon ? <img src={`https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png`} alt="" /> : g.name.charAt(0)}
                            </div>
                            <span className="text-xs font-semibold truncate text-left">{g.name}</span>
                          </div>
                        ))
                    ) : (
                        <div className="p-4 text-center">
                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest text-left">Keine weiteren Server aktiv</p>
                        </div>
                    )
                  )}
                </div>

                <div className="p-2 border-t border-white/5 bg-white/[0.02]">
                    <Link 
                        href={inviteUrl}
                        target="_blank"
                        onClick={() => sessionStorage.removeItem(CACHE_KEY)}
                        className="flex items-center gap-2 w-full p-2.5 rounded-lg text-[10px] font-bold text-white bg-[#5865F2] hover:bg-[#4d59e3] transition-all justify-center"
                    >
                        <Plus className="w-3.5 h-3.5" /> Neuen Server hinzufügen
                    </Link>
                </div>
              </div>
            )}
          </div>

          {/* Navigation */}
          <nav className="space-y-1 flex-1 text-left">
            {routes.map((route) => (
              <SidebarLink key={route.path} icon={route.icon} label={route.label} active={pathname === route.path} href={route.path} onClick={() => setIsOpen(false)} />
            ))}
            <div className="pt-6 pb-2 px-3 text-left">
              <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest text-left">Sicherheit</span>
            </div>
            <SidebarLink icon={<ShieldCheck className="w-4 h-4 text-left"/>} label="Moderation" active={pathname === `/dashboard/${guildId}/moderation`} href={`/dashboard/${guildId}/moderation`} onClick={() => setIsOpen(false)} />
          </nav>
        </div>
      </aside>
    </>
  );
}

function SidebarLink({ icon, label, active, href, onClick }) {
  return (
    <Link href={href} onClick={onClick} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all text-left ${active ? "bg-[#5865F2] text-white" : "text-gray-400 hover:bg-white/5"}`}>
      {icon} {label}
    </Link>
  );
}