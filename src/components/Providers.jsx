// src/components/Providers.jsx
"use client";

import { SessionProvider, useSession, signIn } from "next-auth/react";
import { ThemeProvider } from "next-themes";
import { useEffect } from "react";

// Eine interne Komponente, die den Session-Status überwacht
function SessionGuard({ children }) {
  const { data: session } = useSession();

  useEffect(() => {
    // Wenn das Backend meldet, dass das Token kaputt/abgelaufen ist:
    if (session?.error === "RefreshAccessTokenError") {
      // Erzwinge sofortigen Neu-Login (leitet zu Discord weiter)
      signIn("discord"); 
    }
  }, [session]);

  return <>{children}</>;
}

export function Providers({ children }) {
  return (
    <SessionProvider>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
        {/* Wir wickeln die App in den Guard ein */}
        <SessionGuard>
          {children}
        </SessionGuard>
      </ThemeProvider>
    </SessionProvider>
  );
}