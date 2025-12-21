"use client";

import { Button } from "@/components/ui/button";
import { LogIn, Lock } from "lucide-react";
import Link from "next/link";
import { openLoginPopup } from "@/lib/loginPopup"; //

export default function LoginView() {
  return (
    <div className="min-h-screen bg-[#1a1c1f] flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
      
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[120px] -z-10" />

      <div className="max-w-md w-full text-center space-y-8">
        
        <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-[#2b2d31] rounded-3xl flex items-center justify-center shadow-2xl border border-white/5 relative group">
                <div className="absolute inset-0 bg-indigo-500/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <Lock className="w-10 h-10 text-indigo-500 relative z-10" />
            </div>
        </div>

        <div className="space-y-3">
            <h1 className="text-3xl font-extrabold text-white tracking-tight">Login erforderlich</h1>
            <p className="text-gray-400 text-lg leading-relaxed">
                Du musst angemeldet sein, um auf das Dashboard zuzugreifen.
            </p>
        </div>

        <div className="pt-4 space-y-4">
            <Button 
                // HIER: WICHTIG! Das Event 'e' weitergeben
                onClick={(e) => openLoginPopup(e)}
                size="lg"
                className="w-full bg-[#5865F2] hover:bg-[#4752C4] text-white font-bold h-14 rounded-xl text-lg shadow-lg shadow-indigo-500/20 transition-all hover:scale-[1.02]"
            >
                <LogIn className="w-5 h-5 mr-3" />
                Login mit Discord
            </Button>

            <Link href="/" className="block">
                <Button 
                    variant="ghost" 
                    className="w-full text-gray-500 hover:text-white hover:bg-white/5 h-12 rounded-xl"
                >
                    Zurück zur Startseite
                </Button>
            </Link>
        </div>

        <div className="pt-8 border-t border-white/5">
            <p className="text-xs text-gray-600 font-medium">
                GESCHÜTZTER BEREICH &bull; BOTPANEL V2
            </p>
        </div>

      </div>
    </div>
  );
}