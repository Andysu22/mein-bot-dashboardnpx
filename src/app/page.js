"use client";

import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import Link from "next/link"; 
import { 
  ArrowRight, 
  LayoutDashboard, 
  ShieldCheck, 
  Headphones, 
  FileText, 
  Zap, 
  Settings2, 
  Bot 
} from "lucide-react"; 
import { openLoginPopup } from "@/lib/loginPopup";

export default function Home() {
  const { data: session } = useSession();

  return (
    <div className="min-h-screen bg-[#1a1c1f] text-gray-100 font-sans selection:bg-[#5865F2]/30">
      
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 md:pt-48 md:pb-40 overflow-hidden">
        {/* Discord-Blurple Glow Effekt */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-[#5865F2]/10 rounded-full blur-[120px] -z-10" />
        
        <div className="container mx-auto px-6 text-center max-w-5xl">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#5865F2]/10 border border-[#5865F2]/20 text-xs font-bold text-[#5865F2] mb-8 uppercase tracking-widest animate-pulse">
            <Bot className="w-4 h-4" />
            Next-Gen Discord Management
          </div>
          
          <h1 className="text-6xl md:text-8xl font-black tracking-tighter mb-8 leading-[0.9]">
            LEVEL UP YOUR <br />
            <span className="text-[#5865F2] drop-shadow-[0_0_30px_rgba(88,101,242,0.3)]">COMMUNITY.</span>
          </h1>
          
          <p className="text-xl md:text-2xl text-[#b5bac1] mb-12 max-w-2xl mx-auto leading-relaxed font-medium">
            Automatisiere deinen Discord-Server mit dem fortschrittlichsten Dashboard für Tickets, Voice-Hubs und Bewerbungen.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-5">
            {session ? (
               <Link href="/dashboard" className="w-full sm:w-auto">
                 <Button size="lg" className="w-full sm:w-auto bg-[#5865F2] hover:bg-[#4752C4] text-white h-14 px-10 text-lg font-bold shadow-2xl shadow-[#5865F2]/20 transition-all hover:scale-105 active:scale-95">
                   <LayoutDashboard className="w-5 h-5 mr-2" />
                   Dashboard öffnen
                 </Button>
               </Link>
            ) : (
              <Button 
                size="lg" 
                onClick={(e) => openLoginPopup(e)}
                className="w-full sm:w-auto bg-white text-black hover:bg-[#dbdee1] h-14 px-10 text-lg font-extrabold shadow-xl transition-all hover:scale-105 active:scale-95"
              >
                Get Started
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            )}
            
            <Link href="https://discord.com" target="_blank" className="w-full sm:w-auto">
              <Button size="lg" variant="outline" className="w-full sm:w-auto border-white/10 bg-[#ffffff]/5 hover:bg-[#ffffff]/10 h-14 px-10 text-lg font-bold transition-all backdrop-blur-sm">
                Support Server
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Stats / Trust Section */}
      <div className="container mx-auto px-6 mb-24">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-8 rounded-3xl bg-[#232529]/50 border border-white/5 backdrop-blur-sm">
            {[
                { label: "Server", val: "500+" },
                { label: "Nutzer", val: "100k+" },
                { label: "Tickets", val: "1.2M" },
                { label: "Uptime", val: "99.9%" }
            ].map((stat, i) => (
                <div key={i} className="text-center">
                    <div className="text-2xl md:text-3xl font-black text-white">{stat.val}</div>
                    <div className="text-xs uppercase font-bold text-[#949ba4] tracking-widest">{stat.label}</div>
                </div>
            ))}
        </div>
      </div>

      {/* Features Section */}
      <section className="py-24 relative overflow-hidden">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row items-end justify-between mb-16 gap-6">
            <div className="max-w-xl">
                <h2 className="text-4xl md:text-5xl font-black mb-4 text-white tracking-tight">POWERFUL FEATURES.</h2>
                <p className="text-[#949ba4] text-lg font-medium">Alles, was du für ein professionelles Server-Management benötigst.</p>
            </div>
            <Zap className="w-12 h-12 text-[#5865F2] hidden md:block opacity-50" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <FeatureCard 
                icon={<ShieldCheck className="w-8 h-8" />}
                title="Ticket System"
                desc="High-End Support-System mit HTML-Transcripts und automatischer Rollen-Zuweisung."
                color="border-indigo-500/20"
            />
            <FeatureCard 
                icon={<Headphones className="w-8 h-8" />}
                title="Voice Hubs"
                desc="Temporäre Voice-Channel, die sich selbst verwalten. Inklusive eigener Interface-Steuerung."
                color="border-emerald-500/20"
            />
            <FeatureCard 
                icon={<FileText className="w-8 h-8" />}
                title="Applications"
                desc="Erstelle komplexe Bewerbungsphasen mit individuellen Fragen und Review-System."
                color="border-pink-500/20"
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 border-t border-white/5 bg-[#111214]">
        <div className="container mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-4">
             <div className="w-10 h-10 bg-[#5865F2] rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg">B</div>
             <div>
                <span className="block font-black text-white tracking-tight">BotPanel v2</span>
                <span className="text-xs text-[#949ba4] font-bold">© 2025 ALL RIGHTS RESERVED.</span>
             </div>
          </div>
          <div className="flex gap-10 text-sm font-bold text-[#949ba4]">
            <Link href="#" className="hover:text-[#5865F2] transition-colors">PRIVACY</Link>
            <Link href="#" className="hover:text-[#5865F2] transition-colors">TERMS</Link>
            <Link href="#" className="hover:text-[#5865F2] transition-colors">STATUS</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, desc, color }) {
    return (
        <div className={`group p-10 rounded-[2rem] bg-[#232529] border ${color} hover:bg-[#2b2d31] transition-all duration-500 hover:-translate-y-2`}>
            <div className="w-16 h-16 rounded-2xl bg-[#1a1c1f] flex items-center justify-center text-[#5865F2] mb-8 group-hover:scale-110 transition-transform duration-500 border border-white/5 shadow-inner">
                {icon}
            </div>
            <h3 className="text-2xl font-black mb-4 text-white tracking-tight uppercase">{title}</h3>
            <p className="text-[#949ba4] leading-relaxed font-medium">
                {desc}
            </p>
        </div>
    );
}