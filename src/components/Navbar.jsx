"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { LogIn, LayoutDashboard, LogOut, ChevronDown, User } from "lucide-react";
import { Button } from "@/components/ui/button";

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
    <nav className="fixed top-0 w-full z-50 border-b border-white/5 bg-[#1a1c1f]/80 backdrop-blur-md">
      <div className="container mx-auto px-6 h-16 flex items-center justify-between">
        
        <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-500/20">
            B
          </div>
          <span className="text-xl font-bold tracking-tight text-white">BotPanel</span>
        </Link>

        <div>
          {session ? (
            <div className="relative" ref={dropdownRef}>
              <button 
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-3 pl-2 pr-4 py-1.5 rounded-full bg-[#2b2d31] border border-white/5 hover:bg-[#35373c] transition-all group"
              >
                {session.user.image ? (
                  <img src={session.user.image} alt="" className="w-8 h-8 rounded-full border border-indigo-500/30 group-hover:border-indigo-500/80 transition-colors" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold">
                    {session.user.name?.charAt(0)}
                  </div>
                )}
                <span className="font-medium text-sm text-gray-200 hidden md:block">
                  {session.user.name}
                </span>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
              </button>

              {isOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-xl bg-[#2b2d31] border border-white/5 shadow-2xl py-2 animate-in fade-in slide-in-from-top-2 duration-200 z-50">
                  <div className="px-4 py-3 border-b border-white/5 mb-1">
                    <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-0.5">Angemeldet als</p>
                    <p className="text-sm font-bold text-white truncate">{session.user.name}</p>
                  </div>
                  
                  <div className="p-1">
                    <Link href="/dashboard" onClick={() => setIsOpen(false)}>
                        <div className="px-3 py-2 text-sm text-gray-300 hover:bg-[#5865F2] hover:text-white cursor-pointer flex items-center gap-3 transition-colors rounded-lg">
                        <LayoutDashboard className="w-4 h-4" />
                        Dashboard
                        </div>
                    </Link>
                  </div>

                  <div className="h-px bg-white/5 my-1 mx-2" />

                  <div className="p-1">
                    <button 
                        // HIER IST DIE ÄNDERUNG: callbackUrl: "/"
                        onClick={() => signOut({ callbackUrl: "/" })}
                        className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 cursor-pointer flex items-center gap-3 transition-colors rounded-lg"
                    >
                        <LogOut className="w-4 h-4" />
                        Abmelden
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Button 
              // HIER IST DIE ÄNDERUNG: callbackUrl: "/dashboard"
              onClick={() => signIn("discord", { callbackUrl: "/dashboard" })}
              className="bg-[#5865F2] hover:bg-[#4752C4] text-white gap-2 shadow-lg shadow-indigo-500/20 rounded-full px-6 font-medium"
            >
              <LogIn className="w-4 h-4" />
              Login
            </Button>
          )}
        </div>
      </div>
    </nav>
  );
}