"use client";

import { useSession, signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import Link from "next/link"; 
import { ArrowRight, LayoutDashboard, ShieldCheck, Headphones, FileText } from "lucide-react"; 

export default function Home() {
  const { data: session } = useSession();

  return (
    <div className="min-h-screen bg-[#1a1c1f] text-gray-100 font-sans selection:bg-indigo-500/30">
      
      {/* === HERO SECTION === */}
      <section className="relative pt-28 pb-20 md:pt-40 md:pb-32 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-indigo-600/20 rounded-full blur-[120px] -z-10" />

        <div className="container mx-auto px-6 text-center max-w-4xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-indigo-300 mb-8 backdrop-blur-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
            </span>
            System v2.0 Online
          </div>
          
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-b from-white to-white/60">
            Verwalte deinen Server <br className="hidden md:block" />
            <span className="text-indigo-500">wie ein Profi.</span>
          </h1>
          
          <p className="text-lg md:text-xl text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            Das All-in-One Dashboard für Tickets, temporäre Voice-Channel und Bewerbungen. 
            Automatisierte Verwaltung für moderne Discord Communities.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            {session ? (
               <Link href="/dashboard" className="w-full sm:w-auto">
                 <Button size="lg" className="w-full sm:w-auto bg-indigo-500 hover:bg-indigo-600 h-12 px-8 text-base shadow-lg shadow-indigo-500/20 transition-all hover:scale-105">
                   <LayoutDashboard className="w-4 h-4 mr-2" />
                   Zum Dashboard
                 </Button>
               </Link>
            ) : (
              <Button 
                size="lg" 
                // HIER DIE ÄNDERUNG: callbackUrl: "/dashboard"
                onClick={() => signIn("discord", { callbackUrl: "/dashboard" })}
                className="w-full sm:w-auto bg-white text-black hover:bg-gray-200 h-12 px-8 text-base font-bold transition-all hover:scale-105"
              >
                Jetzt loslegen
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            )}
            
            <Link href="https://discord.com" target="_blank" className="w-full sm:w-auto">
              <Button size="lg" variant="outline" className="w-full sm:w-auto border-white/10 bg-white/5 hover:bg-white/10 h-12 px-8 text-base transition-all hover:border-white/20">
                Support Server
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features & Footer bleiben unverändert ... */}
      <section className="py-24 bg-black/20 border-t border-white/5">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4 text-white">Mächtige Funktionen</h2>
            <p className="text-gray-400 max-w-2xl mx-auto">Alles was du brauchst, um deine Community sicher und effizient zu verwalten.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="group p-8 rounded-3xl bg-[#232529] border border-white/5 hover:border-indigo-500/50 transition-all duration-300 hover:shadow-2xl hover:shadow-indigo-500/10 hover:-translate-y-1">
              <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 mb-6 group-hover:scale-110 transition-transform duration-300">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-white">Ticket System</h3>
              <p className="text-gray-400 leading-relaxed text-sm">
                Professioneller Support mit Transcripts, HTML-Logs und automatischer Archivierung. Volle Kontrolle über Kanäle und Kategorien.
              </p>
            </div>

            <div className="group p-8 rounded-3xl bg-[#232529] border border-white/5 hover:border-emerald-500/50 transition-all duration-300 hover:shadow-2xl hover:shadow-emerald-500/10 hover:-translate-y-1">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 mb-6 group-hover:scale-110 transition-transform duration-300">
                <Headphones className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-white">Join to Create</h3>
              <p className="text-gray-400 leading-relaxed text-sm">
                Temporäre Sprachkanäle, die sich selbst verwalten. User erstellen ihre eigenen Channel mit einem Klick.
              </p>
            </div>

            <div className="group p-8 rounded-3xl bg-[#232529] border border-white/5 hover:border-pink-500/50 transition-all duration-300 hover:shadow-2xl hover:shadow-pink-500/10 hover:-translate-y-1">
              <div className="w-14 h-14 rounded-2xl bg-pink-500/10 flex items-center justify-center text-pink-500 mb-6 group-hover:scale-110 transition-transform duration-300">
                <FileText className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-white">Bewerbungen</h3>
              <p className="text-gray-400 leading-relaxed text-sm">
                Erstelle Formulare, verwalte Einsendungen im Dashboard und akzeptiere neue Teammitglieder per Klick.
              </p>
            </div>
          </div>
        </div>
      </section>

      <footer className="py-12 border-t border-white/5 bg-[#16181b]">
        <div className="container mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3 text-gray-400">
             <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center text-white text-sm font-bold shadow">B</div>
             <span className="font-medium">© 2024 BotPanel.</span>
          </div>
          <div className="flex gap-8 text-sm text-gray-500 font-medium">
            <Link href="#" className="hover:text-white transition-colors">Privacy</Link>
            <Link href="#" className="hover:text-white transition-colors">Terms</Link>
            <Link href="#" className="hover:text-white transition-colors">Contact</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}