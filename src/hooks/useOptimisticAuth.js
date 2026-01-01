// src/hooks/useOptimisticAuth.js
"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";

export function useOptimisticAuth() {
  const { data: session, status } = useSession();
  
  // Wir initialisieren den State DIREKT aus dem LocalStorage (synchron)
  const [user, setUser] = useState(() => {
    if (typeof window !== "undefined") {
      const cached = localStorage.getItem("cached_user");
      // Wenn Cache da ist, nutzen wir den sofort!
      return cached ? JSON.parse(cached) : null;
    }
    return null;
  });

  useEffect(() => {
    // Sobald NextAuth (der Server) fertig geladen hat, updaten wir den User
    // Das überschreibt den Cache mit den "echten" frischen Daten
    if (status === "authenticated" && session?.user) {
      setUser(session.user);
    } 
    // Nur wenn der Server explizit sagt "Nicht eingeloggt", werfen wir den User raus
    else if (status === "unauthenticated") {
      setUser(null);
    }
  }, [session, status]);

  return { 
    user, 
    // Wir tun so als wären wir authenticated, wenn wir Daten im Cache haben
    isAuthenticated: !!user, 
    isLoading: status === "loading" && !user 
  };
}