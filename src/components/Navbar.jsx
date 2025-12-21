"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { LogIn, LayoutDashboard, LogOut, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { openLoginPopup } from "@/lib/loginPopup";

export default function Navbar() {
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

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
    <nav className="fixed top-0 w-full z-[100] h-16 bg-[#111214]/70 backdrop-blur-xl border-b border-white/[0.03]">
      {/* ÄNDERUNG HIER: 
          'container mx-auto' entfernt und 'w-full px-6' hinzugefügt, 
          damit das Logo ganz nach links rückt.
      */}
      <div className="w-full px-6 h-full flex items-center justify-between">
        
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-9 h-9 bg-gradient-to-br from-[#5865F2] to-[#4752C4] rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
            B
          </div>
          <span className="text-xl font-bold tracking-tight text-white/90">BotPanel</span>
        </Link>

        <div>
          {session ? (
            <div className="relative" ref={dropdownRef}>
              <button 
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-3 py-1.5 transition-opacity hover:opacity-80 group"
              >
                <img src={session.user.image} alt="" className="w-8 h-8 rounded-lg border border-white/10" />
                <span className="font-semibold text-sm text-gray-300 hidden md:block">
                  {session.user.name}
                </span>
                <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? "rotate-180" : ""}`} />
              </button>

              {isOpen && (
                <div className="absolute right-0 mt-3 w-60 rounded-2xl bg-[#1a1b1e]/95 backdrop-blur-2xl border border-white/10 shadow-2xl py-2 animate-in fade-in zoom-in-95 duration-200 z-50">
                  <div className="px-4 py-3 border-b border-white/5 mb-1">
                    <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest mb-0.5">Sitzung</p>
                    <p className="text-sm font-bold text-white truncate">{session.user.name}</p>
                  </div>
                  
                  <div className="p-1.5 space-y-1">
                    <Link href="/dashboard" onClick={() => setIsOpen(false)}>
                        <div className="px-3 py-2 text-sm text-gray-300 hover:bg-[#5865F2] hover:text-white cursor-pointer flex items-center gap-3 transition-all rounded-xl font-medium">
                          <LayoutDashboard className="w-4 h-4" /> Dashboard
                        </div>
                    </Link>
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
  );
}