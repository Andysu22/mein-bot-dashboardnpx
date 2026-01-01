"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { useTheme } from "next-themes";
import { 
  LogIn, LayoutDashboard, LogOut, ChevronDown, Settings, X, Globe, Monitor, Check, Palette, Loader2     
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { openLoginPopup } from "@/lib/loginPopup";

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

function hexToHsl(hex) {
  let c = hex.substring(1).split('');
  if (c.length === 3) c = [c[0], c[0], c[1], c[1], c[2], c[2]];
  c = '0x' + c.join('');
  let r = (c >> 16) & 255, g = (c >> 8) & 255, b = c & 255;
  r /= 255; g /= 255; b /= 255;
  let cmin = Math.min(r, g, b), cmax = Math.max(r, g, b), delta = cmax - cmin;
  let h = 0, s = 0, l = 0;
  if (delta === 0) h = 0;
  else if (cmax === r) h = ((g - b) / delta) % 6;
  else if (cmax === g) h = (b - r) / delta + 2;
  else h = (r - g) / delta + 4;
  h = Math.round(h * 60);
  if (h < 0) h += 360;
  l = (cmax + cmin) / 2;
  s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
  s = +(s * 100).toFixed(1);
  l = +(l * 100).toFixed(1);
  return `${h} ${s}% ${l}%`;
}

export default function Navbar() {
  const { data: session } = useSession();
  const { theme, setTheme } = useTheme();

  const [isOpen, setIsOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false); 
  const dropdownRef = useRef(null);

  const [activeLang, setActiveLang] = useState("de");
  const [activeColor, setActiveColor] = useState("#5865F2"); 
  const [saving, setSaving] = useState(false);

  const colors = ["#5865F2", "#EB459E", "#FEE75C", "#57F287", "#ED4245"];

  const updateGlobalStyle = (hsl) => {
    const styleTag = document.getElementById('custom-theme');
    const cssRule = `:root { --primary: ${hsl} !important; --ring: ${hsl} !important; }`;
    
    if (styleTag) {
      styleTag.innerHTML = cssRule;
    } else {
      const newStyle = document.createElement('style');
      newStyle.id = 'custom-theme';
      newStyle.innerHTML = cssRule;
      document.head.appendChild(newStyle);
    }
  };

  useEffect(() => {
    // 1. Initial LocalStorage Check
    const savedHsl = localStorage.getItem("accent-hsl");
    if (savedHsl) {
        updateGlobalStyle(savedHsl);
    }

    // 2. DB Sync (Hier fehlte die Logik für das Theme!)
    if (session?.user) {
      fetch("/api/user/settings")
        .then(res => res.json())
        .then(data => {
          // A) Akzentfarbe Sync (das hattest du schon)
          if (data.accentColor) {
             setActiveColor(data.accentColor);
             const hsl = hexToHsl(data.accentColor);
             if (hsl !== savedHsl) {
                localStorage.setItem("accent-hsl", hsl);
                updateGlobalStyle(hsl);
             }
          }

          // B) THEME SYNC (NEU: Das hier hat gefehlt!)
          if (data.theme) {
            // Wir prüfen, ob das lokale Theme vom DB Theme abweicht
            // 'theme' kommt aus next-themes Hook
            const localTheme = localStorage.getItem("theme"); 
            
            if (localTheme !== data.theme) {
               // Wir zwingen next-themes, den Wert aus der DB zu nehmen
               setTheme(data.theme); 
               // Wir updaten den LocalStorage für das Blocking Script im Layout
               localStorage.setItem("theme", data.theme);
            }
          }
        })
        .catch(() => {});
    }
  }, [session, setTheme]); // setTheme als dependency hinzugefügt

  const handleColorChange = async (colorHex) => {
    setActiveColor(colorHex);
    const hsl = hexToHsl(colorHex);
    updateGlobalStyle(hsl);
    localStorage.setItem("accent-hsl", hsl);

    if (session?.user) {
        setSaving(true);
        try {
            await fetch("/api/user/settings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ accentColor: colorHex })
            });
        } catch (e) { console.error(e); } 
        finally { setSaving(false); }
    }
  };

  const handleThemeChange = (newTheme) => {
    setTheme(newTheme);
    // Sofort auch LocalStorage updaten, damit Blocking Script bescheid weiß
    localStorage.setItem("theme", newTheme);
    
    if (session?.user) {
        fetch("/api/user/settings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ theme: newTheme })
        }).catch(() => {});
    }
  };

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setIsOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <>
      <nav className="fixed top-0 w-full z-[100] h-16 bg-background/70 backdrop-blur-xl border-b border-border transition-colors duration-300">
        <div className="w-full px-6 h-full flex items-center justify-between">
          
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 bg-gradient-to-br from-primary to-primary/80 rounded-xl flex items-center justify-center text-primary-foreground font-bold shadow-lg shadow-primary/20 group-hover:scale-105 transition-transform">
              B
            </div>
            <span className="text-xl font-bold tracking-tight text-foreground/90">BotPanel</span>
          </Link>

          <div>
            {session?.user ? (
              <div className="relative" ref={dropdownRef}>
                <button 
                  onClick={() => setIsOpen(!isOpen)}
                  className="flex items-center gap-3 py-1.5 transition-opacity hover:opacity-80 group"
                >
                  {session.user.image ? (
                    <img src={session.user.image} alt="" className="w-8 h-8 rounded-lg border border-border" />
                  ) : (
                    <div className="w-8 h-8 rounded-lg border border-border bg-primary/20 flex items-center justify-center text-foreground text-xs font-bold">
                      {session.user.name?.charAt(0) || "?"}
                    </div>
                  )}
                  
                  <span className="font-semibold text-sm text-muted-foreground hidden md:block">
                    {session.user.name || "User"}
                  </span>
                  <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
                </button>

                {isOpen && (
                  <div className="absolute right-0 mt-3 w-60 rounded-2xl bg-card/95 backdrop-blur-2xl border border-border shadow-2xl py-2 animate-in fade-in zoom-in-95 duration-200 z-50">
                    <div className="px-4 py-3 border-b border-border mb-1">
                      <p className="text-[10px] text-primary font-bold uppercase tracking-widest mb-0.5">Sitzung</p>
                      <p className="text-sm font-bold text-foreground truncate">{session.user.name || "User"}</p>
                    </div>
                    
                    <div className="p-1.5 space-y-1">
                      <Link href="/dashboard" onClick={() => setIsOpen(false)}>
                          <div className="px-3 py-2 text-sm text-muted-foreground hover:bg-primary hover:text-white cursor-pointer flex items-center gap-3 transition-all rounded-xl font-medium">
                            <LayoutDashboard className="w-4 h-4" /> Dashboard
                          </div>
                      </Link>

                      <button 
                          onClick={() => { setIsOpen(false); setShowSettings(true); }}
                          className="w-full text-left px-3 py-2 text-sm text-muted-foreground hover:bg-primary hover:text-white cursor-pointer flex items-center gap-3 transition-all rounded-xl font-medium"
                      >
                          <Settings className="w-4 h-4" /> Einstellungen
                      </button>

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
                className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl px-6 font-bold shadow-lg shadow-primary/20 transition-all active:scale-95"
              >
                <LogIn className="w-4 h-4 mr-2" /> Login
              </Button>
            )}
          </div>
        </div>
      </nav>

      {/* --- SETTINGS MODAL --- */}
      {showSettings && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setShowSettings(false)}
          />

          <div className="relative w-full max-w-lg bg-card rounded-2xl border border-border shadow-2xl overflow-hidden animate-in zoom-in-95 fade-in duration-200">
            
            <div className="flex items-center justify-between px-6 py-5 border-b border-border bg-muted/50">
              <div>
                <h2 className="text-xl font-bold text-foreground">Einstellungen</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Passe dein Erlebnis an.</p>
              </div>
              <button 
                onClick={() => setShowSettings(false)}
                className="p-2 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-8">
              
              {/* Sprache */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <Globe className="w-3.5 h-3.5" /> Sprache
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => setActiveLang("de")} className={cn("px-4 py-3 rounded-xl border text-sm font-medium flex items-center justify-between transition-all", activeLang === "de" ? "bg-primary/10 border-primary text-foreground" : "bg-card border-transparent hover:border-border text-muted-foreground")}>
                    <span>Deutsch</span> {activeLang === "de" && <Check className="w-4 h-4 text-primary" />}
                  </button>
                  <button onClick={() => setActiveLang("en")} className={cn("px-4 py-3 rounded-xl border text-sm font-medium flex items-center justify-between transition-all", activeLang === "en" ? "bg-primary/10 border-primary text-foreground" : "bg-card border-transparent hover:border-border text-muted-foreground")}>
                    <span>English</span> {activeLang === "en" && <Check className="w-4 h-4 text-primary" />}
                  </button>
                </div>
              </div>

              {/* Design */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <Monitor className="w-3.5 h-3.5" /> Design
                </label>
                <div className="flex bg-muted p-1 rounded-lg border border-border">
                  <button 
                    onClick={() => handleThemeChange("dark")} 
                    className={cn("flex-1 py-2 text-sm font-medium rounded-md transition-all", theme === "dark" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
                  >
                    Dark
                  </button>
                  <button 
                    onClick={() => handleThemeChange("light")} 
                    className={cn("flex-1 py-2 text-sm font-medium rounded-md transition-all", theme === "light" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
                  >
                    Light
                  </button>
                </div>
              </div>

              {/* Akzentfarbe */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <Palette className="w-3.5 h-3.5" /> Akzentfarbe
                </label>
                <div className="flex gap-4">
                  {colors.map((color) => (
                    <button
                      key={color}
                      onClick={() => handleColorChange(color)}
                      className={cn("w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110", activeColor === color ? "ring-2 ring-white ring-offset-2 ring-offset-[#1e1f22]" : "opacity-70 hover:opacity-100")}
                      style={{ backgroundColor: color }}
                    >
                      {activeColor === color && (
                          saving ? <Loader2 className="w-5 h-5 text-white/90 animate-spin" /> : <Check className="w-5 h-5 text-white/90 drop-shadow-md" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

            </div>

            <div className="p-4 bg-muted/50 border-t border-border flex justify-end gap-3">
              <button onClick={() => setShowSettings(false)} className="px-6 py-2 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-bold rounded-md transition-colors shadow-lg shadow-primary/20">Fertig</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}