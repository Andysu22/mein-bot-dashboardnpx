"use client";

import { useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

function AuthHandler() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error"); //

  useEffect(() => {
    // Zeit auf 1 Sekunde erhöht, damit man den Text bei einem Abbruch kurz lesen kann
    const timer = setTimeout(() => {
      if (window.opener) {
        if (!error) {
          // Erfolg: Hauptfenster zum Dashboard weiterleiten
          window.opener.location.href = "/dashboard"; //
        }
        // Popup in jedem Fall schließen
        window.close(); //
      } else {
        window.location.href = "/dashboard"; //
      }
    }, 500); 

    return () => clearTimeout(timer);
  }, [error]);

  return (
    <div className="flex flex-col items-center gap-4 animate-in fade-in duration-300">
      {/* Der drehende Kreis bleibt immer sichtbar */}
      <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      <p className="text-gray-400 text-sm font-medium">
        {/* Nur der Text ändert sich basierend auf Erfolg oder Abbruch */}
        {error ? "Login canceled..." : "Successfully logged in!"}
      </p>
    </div>
  );
}

export default function AuthSuccessPage() {
  return (
    <div className="min-h-screen bg-[#1a1c1f] flex items-center justify-center text-white selection:bg-indigo-500/30">
      <Suspense fallback={<Loader2 className="w-8 h-8 animate-spin text-indigo-500" />}>
        <AuthHandler />
      </Suspense>
    </div>
  );
}