// src/app/not-found.js
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0f1012] flex flex-col items-center justify-center text-center p-4">

      {/* Text */}
      <h1 className="text-6xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-white/40 mb-4 tracking-tighter">
        404
      </h1>
      <h2 className="text-xl md:text-2xl font-bold text-gray-200 mb-2 uppercase tracking-wide">
        Seite nicht gefunden
      </h2>
      <p className="text-gray-500 max-w-md mb-10 text-sm md:text-base">
        Ups! Die Seite, die du suchst, hat sich im Cyberspace verirrt oder existiert gar nicht.
      </p>

      {/* Button */}
      <Link 
        href="/" 
        className="flex items-center gap-2 px-6 py-3 bg-[#5865F2] hover:bg-[#4752c4] text-white rounded-xl font-bold transition-all hover:shadow-[0_0_20px_rgba(88,101,242,0.4)] group"
      >
        <Home className="w-4 h-4" />
        <span>Zurück zum Dashboard</span>
      </Link>
      
    </div>
  );
}