"use client";

import { SessionProvider, useSession, signIn } from "next-auth/react";
import { ThemeProvider } from "next-themes";
import { useEffect } from "react";

function SessionGuard({ children }) {
  const { data: session } = useSession();

  useEffect(() => {
    if (session?.error === "RefreshAccessTokenError") {
      signIn("discord"); 
    }
  }, [session]);

  return <>{children}</>;
}

// Wir entfernen "defaultTheme" aus den Props, brauchen wir nicht mehr zwingend
export default function Providers({ children, session }) {
  return (
    <SessionProvider session={session}>
      <ThemeProvider 
        attribute="class" 
        defaultTheme="system" // Standard auf System
        enableSystem={true}   
        disableTransitionOnChange
      >
        <SessionGuard>
          {children}
        </SessionGuard>
      </ThemeProvider>
    </SessionProvider>
  );
}