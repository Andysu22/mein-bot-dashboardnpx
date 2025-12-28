"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { 
  LogIn, 
  LayoutDashboard, 
  LogOut, 
  ChevronDown, 
  Settings, 
  X,        
  Globe,    
  Monitor,  
  Palette,  
  Check     
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { openLoginPopup } from "@/lib/loginPopup";

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

export default function Navbar() {
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false); 
  const dropdownRef = useRef(null);

  // Fake-States für die Settings-Vorschau
  const [activeLang, setActiveLang] = useState("de");
  const [activeTheme, setActiveTheme] = useState("dark");
  const [activeColor, setActiveColor] = useState("#5865F2");
  const colors = ["#5865F2", "#EB459E", "#FEE75C", "#57F287", "#ED4245"];

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <>
      <nav className="fixed top-0 w-full z-[100] h-16 bg-[#111214]/70 backdrop-blur-xl border-b border-white/[0.03]">
        <div className="w-full px-6 h-full flex items-center justify-between">
          
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 bg-gradient-to-br from-[#5865F2] to-[#4752C4] rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
              B
            </div>
            <span className="text-xl font-bold tracking-tight text-white/90">BotPanel</span>
          </Link>

          <div>
            {/* HIER WAR DER FEHLER: Wir prüfen jetzt sicher auf session UND session.user */}
            {session?.user ? (
              <div className="relative" ref={dropdownRef}>
                <button 
                  onClick={() => setIsOpen(!isOpen)}
                  className="flex items-center gap-3 py-1.5 transition-opacity hover:opacity-80 group"
                >
                  {/* Sicherer Bild-Fallback: Wenn kein Bild da ist, zeige Initiale */}
                  {session.user.image ? (
                    <img src={session.user.image} alt="" className="w-8 h-8 rounded-lg border border-white/10" />
                  ) : (
                    <div className="w-8 h-8 rounded-lg border border-white/10 bg-indigo-500/20 flex items-center justify-center text-white text-xs font-bold">
                      {session.user.name?.charAt(0) || "?"}
                    </div>
                  )}
                  
                  <span className="font-semibold text-sm text-gray-300 hidden md:block">
                    {session.user.name || "User"}
                  </span>
                  <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                </button>

                {isOpen && (
                  <div className="absolute right-0 mt-3 w-60 rounded-2xl bg-[#1a1b1e]/95 backdrop-blur-2xl border border-white/10 shadow-2xl py-2 animate-in fade-in zoom-in-95 duration-200 z-50">
                    <div className="px-4 py-3 border-b border-white/5 mb-1">
                      <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest mb-0.5">Sitzung</p>
                      <p className="text-sm font-bold text-white truncate">{session.user.name || "User"}</p>
                    </div>
                    
                    <div className="p-1.5 space-y-1">
                      {/* Dashboard Link */}
                      <Link href="/dashboard" onClick={() => setIsOpen(false)}>
                          <div className="px-3 py-2 text-sm text-gray-300 hover:bg-[#5865F2] hover:text-white cursor-pointer flex items-center gap-3 transition-all rounded-xl font-medium">
                            <LayoutDashboard className="w-4 h-4" /> Dashboard
                          </div>
                      </Link>

                      {/* Settings Button */}
                      <button 
                          onClick={() => { setIsOpen(false); setShowSettings(true); }}
                          className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-[#5865F2] hover:text-white cursor-pointer flex items-center gap-3 transition-all rounded-xl font-medium"
                      >
                          <Settings className="w-4 h-4" /> Einstellungen
                      </button>

                      {/* Logout Button */}
                      <button 
                          onClick={() => signOut({ callbackUrl: "/" })}
                          className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 cursor-pointer flex items-center gap-3 transition-all rounded-xl font-medium"
                      >
                          <LogOut className="w-4 h-4" /> Abmelden
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Button 
                onClick={(e) => openLoginPopup(e)}
                className="bg-[#5865F2] hover:bg-[#4752C4] text-white rounded-xl px-6 font-bold shadow-lg shadow-indigo-500/20 transition-all active:scale-95"
              >
                <LogIn className="w-4 h-4 mr-2" /> Login
              </Button>
            )}
          </div>
        </div>
      </nav>

      {/* --- SETTINGS MODAL (Global) --- */}
      {showSettings && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setShowSettings(false)}
          />

          {/* Modal Window */}
          <div className="relative w-full max-w-lg bg-[#1e1f22] rounded-2xl border border-white/10 shadow-2xl overflow-hidden animate-in zoom-in-95 fade-in duration-200">
            
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/5 bg-[#2b2d31]">
              <div>
                <h2 className="text-xl font-bold text-white">Einstellungen</h2>
                <p className="text-xs text-gray-400 mt-0.5">Passe dein Erlebnis an.</p>
              </div>
              <button 
                onClick={() => setShowSettings(false)}
                className="p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-8">
              
              {/* Sprache */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                  <Globe className="w-3.5 h-3.5" /> Sprache
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => setActiveLang("de")} className={cn("px-4 py-3 rounded-xl border text-sm font-medium flex items-center justify-between transition-all", activeLang === "de" ? "bg-[#5865F2]/10 border-[#5865F2] text-white" : "bg-[#111214] border-transparent hover:border-white/10 text-gray-400")}>
                    <span>Deutsch</span> {activeLang === "de" && <Check className="w-4 h-4 text-[#5865F2]" />}
                  </button>
                  <button onClick={() => setActiveLang("en")} className={cn("px-4 py-3 rounded-xl border text-sm font-medium flex items-center justify-between transition-all", activeLang === "en" ? "bg-[#5865F2]/10 border-[#5865F2] text-white" : "bg-[#111214] border-transparent hover:border-white/10 text-gray-400")}>
                    <span>English</span> {activeLang === "en" && <Check className="w-4 h-4 text-[#5865F2]" />}
                  </button>
                </div>
              </div>

              {/* Design */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                  <Monitor className="w-3.5 h-3.5" /> Design
                </label>
                <div className="flex bg-[#111214] p-1 rounded-lg border border-white/5">
                  <button onClick={() => setActiveTheme("dark")} className={cn("flex-1 py-2 text-sm font-medium rounded-md transition-all", activeTheme === "dark" ? "bg-[#404249] text-white shadow-sm" : "text-gray-500 hover:text-gray-300")}>Dark</button>
                  <button onClick={() => setActiveTheme("light")} className={cn("flex-1 py-2 text-sm font-medium rounded-md transition-all", activeTheme === "light" ? "bg-white text-black shadow-sm" : "text-gray-500 hover:text-gray-300")}>Light</button>
                </div>
              </div>

              {/* Akzentfarbe */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                  <Palette className="w-3.5 h-3.5" /> Akzentfarbe
                </label>
                <div className="flex gap-4">
                  {colors.map((color) => (
                    <button
                      key={color}
                      onClick={() => setActiveColor(color)}
                      className={cn("w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110", activeColor === color ? "ring-2 ring-white ring-offset-2 ring-offset-[#1e1f22]" : "opacity-70 hover:opacity-100")}
                      style={{ backgroundColor: color }}
                    >
                      {activeColor === color && <Check className="w-5 h-5 text-white/90 drop-shadow-md" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-[#151618] border-t border-white/5 flex justify-end gap-3">
              <button onClick={() => setShowSettings(false)} className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors">Abbrechen</button>
              <button onClick={() => setShowSettings(false)} className="px-6 py-2 bg-[#5865F2] hover:bg-[#4752c4] text-white text-sm font-bold rounded-md transition-colors shadow-lg shadow-[#5865F2]/20">Speichern</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}