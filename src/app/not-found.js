import Link from "next/link";
import { Home } from "lucide-react"; 

export default function NotFound() {
  return (
    // GEÄNDERT: bg-[#0f1012] -> bg-background
    <div className="min-h-screen bg-background flex flex-col items-center justify-center text-center p-4 transition-colors duration-300">

      {/* GEÄNDERT: Gradient von 'white' zu 'foreground' (damit es im Light Mode dunkel ist) */}
      <h1 className="text-6xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-b from-foreground to-foreground/40 mb-4 tracking-tighter">
        404
      </h1>
      
      {/* GEÄNDERT: text-gray-200 -> text-foreground */}
      <h2 className="text-xl md:text-2xl font-bold text-foreground mb-2 uppercase tracking-wide">
        Seite nicht gefunden
      </h2>
      
      {/* GEÄNDERT: text-gray-500 -> text-muted-foreground */}
      <p className="text-muted-foreground max-w-md mb-10 text-sm md:text-base">
        Ups! Die Seite, die du suchst, hat sich im Cyberspace verirrt oder existiert gar nicht.
      </p>

      {/* GEÄNDERT: bg-[#5865F2] -> bg-primary, shadow angepasst */}
      <Link 
        href="/" 
        className="flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-bold transition-all hover:shadow-[0_0_20px_rgba(var(--primary),0.4)] shadow-lg shadow-primary/20 group"
      >
        <Home className="w-4 h-4" />
        <span>Zurück zum Dashboard</span>
      </Link>
      
    </div>
  );
}