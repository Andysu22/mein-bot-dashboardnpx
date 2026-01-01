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
  Terminal 
} from "lucide-react";

const CACHE_KEY = "sidebar_guilds_cache";

const GuildSkeleton = () => (
  <div className="flex items-center gap-3 p-2 animate-pulse">
    <div className="w-6 h-6 rounded-md bg-muted" />
    <div className="h-3 w-24 bg-muted rounded" />
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
    { icon: <Terminal className="w-4 h-4"/>, label: "Custom Commands", path: `/dashboard/${guildId}/commands` },
  ];

  return (
    <>
      {!isOpen && (
        <button onClick={() => setIsOpen(true)} className="lg:hidden fixed top-20 left-4 z-[110] p-2 bg-card border border-border text-foreground rounded-lg shadow-xl">
          <Menu className="w-6 h-6" />
        </button>
      )}
      {isOpen && <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[120] lg:hidden" onClick={() => setIsOpen(false)} />}

      <aside className={`fixed left-0 bottom-0 w-72 bg-card border-r border-border transition-transform duration-300 top-0 z-[130] ${isOpen ? "translate-x-0" : "-translate-x-full"} lg:top-16 lg:z-40 lg:translate-x-0`}>
        <div className="flex flex-col h-full p-4">
          
          {/* Server Selector */}
          <div className="relative mb-6" ref={selectorRef}>
            <div 
              onClick={() => { if(!showSelector) fetchGuilds(); setShowSelector(!showSelector); }} 
              className={`flex items-center justify-between p-3 rounded-xl transition-all border ${showSelector ? "bg-muted border-border" : "bg-card hover:bg-muted border-border"} cursor-pointer shadow-sm`}
            >
              <div className="flex items-center gap-3 overflow-hidden text-left">
                <div className="w-8 h-8 rounded-lg bg-primary flex-shrink-0 flex items-center justify-center font-bold text-xs text-primary-foreground overflow-hidden shadow-sm"
                suppressHydrationWarning={true}>
                  {guildIcon ? (
                    <img src={guildIcon} className="h-full w-full object-cover" alt="" />
                  ) : (
                    (typeof guildName === 'string' && guildName.length > 0) ? guildName.charAt(0) : "?"
                  )}
                </div>
                <span className="text-sm font-bold text-foreground truncate">{guildName || "Lade..."}</span>
              </div>
              <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${showSelector ? "rotate-180" : ""}`} />
            </div>

            {showSelector && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-popover bg-card border border-border rounded-xl shadow-2xl z-[150] overflow-hidden">
                <div className="max-h-60 overflow-y-auto custom-scroll p-1 space-y-1">
                  {loadingGuilds ? (
                    <>
                      <GuildSkeleton />
                      <GuildSkeleton />
                    </>
                  ) : (
                    userGuilds.length > 0 ? (
                        userGuilds.map((g) => (
                          <div 
                            key={g.id} 
                            onClick={() => handleGuildSelect(g.id)} 
                            className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${g.id === guildId ? "bg-primary/10 text-primary" : "hover:bg-muted text-muted-foreground hover:text-foreground"}`}
                          >
                            <div className="w-6 h-6 rounded-md bg-muted overflow-hidden flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-foreground">
                               {g.icon ? <img src={`https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png`} alt="" /> : g.name.charAt(0)}
                            </div>
                            <span className="text-xs font-semibold truncate text-left">{g.name}</span>
                          </div>
                        ))
                    ) : (
                        <div className="p-4 text-center">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-left">Keine weiteren Server aktiv</p>
                        </div>
                    )
                  )}
                </div>

                <div className="p-2 border-t border-border bg-muted/30">
                    <Link 
                        href={inviteUrl}
                        target="_blank"
                        onClick={() => sessionStorage.removeItem(CACHE_KEY)}
                        className="flex items-center gap-2 w-full p-2.5 rounded-lg text-[10px] font-bold text-primary-foreground bg-primary hover:bg-primary/90 transition-all justify-center shadow-md shadow-primary/20"
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
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-left">Sicherheit</span>
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
    <Link 
      href={href} 
      onClick={onClick} 
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all text-left ${active ? "bg-primary text-primary-foreground shadow-md shadow-primary/20" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
    >
      {icon} {label}
    </Link>
  );
}