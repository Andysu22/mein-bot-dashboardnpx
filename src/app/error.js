// src/app/error.js
"use client"; // Muss ein Client Component sein

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Error({ error, reset }) {
  useEffect(() => {
    // Hier könntest du den Fehler an einen Logging-Dienst senden
    console.error(error);
  }, [error]);

  return (
    <div className="h-[80vh] flex flex-col items-center justify-center text-center px-4">
      <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center text-red-500 mb-6 border border-red-500/20">
        <AlertTriangle className="w-8 h-8" />
      </div>
      
      <h2 className="text-3xl font-black text-white mb-2">Da ist etwas schiefgelaufen!</h2>
      <p className="text-[#949ba4] max-w-md mb-8">
        Ein unerwarteter Fehler ist aufgetreten. Wir wurden benachrichtigt.
      </p>

      <Button 
        onClick={() => reset()}
        className="bg-[#5865F2] hover:bg-[#4752c4] text-white font-bold"
      >
        <RotateCcw className="w-4 h-4 mr-2" />
        Erneut versuchen
      </Button>
    </div>
  );
}