"use client";

import { Button } from "@/components/ui/button";
import { LogIn, Lock } from "lucide-react";
import Link from "next/link";
import { openLoginPopup } from "@/lib/loginPopup"; 

export default function LoginView() {
  return (
    // GEÄNDERT: bg-[#1a1c1f] -> bg-background
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans transition-colors duration-300">
      
      {/* Glow Effekt: Farbe angepasst auf Primary Variable */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[120px] -z-10" />

      <div className="max-w-md w-full text-center space-y-8">
        
        <div className="flex justify-center mb-6">
            {/* GEÄNDERT: bg-[#2b2d31] -> bg-card, border-white/5 -> border-border */}
            <div className="w-20 h-20 bg-card rounded-3xl flex items-center justify-center shadow-2xl border border-border relative group">
                <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                {/* GEÄNDERT: text-indigo-500 -> text-primary */}
                <Lock className="w-10 h-10 text-primary relative z-10" />
            </div>
        </div>

        <div className="space-y-3">
            {/* GEÄNDERT: text-white -> text-foreground */}
            <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Login erforderlich</h1>
            {/* GEÄNDERT: text-gray-400 -> text-muted-foreground */}
            <p className="text-muted-foreground text-lg leading-relaxed">
                Du musst angemeldet sein, um auf das Dashboard zuzugreifen.
            </p>
        </div>

        <div className="pt-4 space-y-4">
            <Button 
                onClick={(e) => openLoginPopup(e)}
                size="lg"
                // GEÄNDERT: bg-[#5865F2] -> bg-primary
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-14 rounded-xl text-lg shadow-lg shadow-primary/20 transition-all hover:scale-[1.02]"
            >
                <LogIn className="w-5 h-5 mr-3" />
                Login mit Discord
            </Button>

            <Link href="/" className="block">
                <Button 
                    variant="ghost" 
                    // GEÄNDERT: text-gray-500 -> text-muted-foreground, hover:text-white -> hover:text-foreground
                    className="w-full text-muted-foreground hover:text-foreground hover:bg-muted h-12 rounded-xl"
                >
                    Zurück zur Startseite
                </Button>
            </Link>
        </div>

        {/* GEÄNDERT: border-white/5 -> border-border */}
        <div className="pt-8 border-t border-border">
            <p className="text-xs text-muted-foreground font-medium">
                GESCHÜTZTER BEREICH &bull; BOTPANEL V2
            </p>
        </div>

      </div>
    </div>
  );
}