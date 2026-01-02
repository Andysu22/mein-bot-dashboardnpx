"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Home } from "lucide-react"; 

export default function NotFound() {
  const [t, setT] = useState(null);

  useEffect(() => {
    fetch("/api/user/settings")
      .then(res => res.json())
      .then(data => fetch(`/locales/${data.ticketLanguage || "de"}.json`))
      .then(res => res.json())
      .then(data => setT(data))
      .catch(() => fetch("/locales/de.json").then(res => res.json()).then(data => setT(data)));
  }, []);

  if (!t) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center text-center p-4 transition-colors duration-300">
      <h1 className="text-6xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-b from-foreground to-foreground/40 mb-4 tracking-tighter">
        404
      </h1>
      <h2 className="text-xl md:text-2xl font-bold text-foreground mb-2 uppercase tracking-wide">
        {t.notFound.title}
      </h2>
      <p className="text-muted-foreground max-w-md mb-10 text-sm md:text-base">
        {t.notFound.desc}
      </p>
      <Link 
        href="/" 
        className="flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-bold transition-all hover:shadow-[0_0_20px_rgba(var(--primary),0.4)] shadow-lg shadow-primary/20 group"
      >
        <Home className="w-4 h-4" />
        <span>{t.notFound.back}</span>
      </Link>
    </div>
  );
}