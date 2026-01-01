"use client";

import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export default function PageWrapper({ children }) {
  const pathname = usePathname();

  // 1. Modal Builder (Full Screen)
  const isFullWidthPage = pathname?.includes("/modal-builder");

  if (isFullWidthPage) {
    return <div className="w-full h-full">{children}</div>;
  }

  // 2. Prüfen, ob wir im Dashboard sind (Server-spezifisch)
  // Wenn ja, ist da ein Hamburger-Menü -> Weniger Abstand oben nötig (wir wollen daneben sein)
  const isGuildDashboard = pathname?.match(/\/dashboard\/\d+/);

return (
    <div
      data-scroll-container="true"
      className={cn(
        // BASIS: Volle Breite, Scrollbar
        "w-full max-w-[95%] mx-auto h-full overflow-y-auto custom-scrollbar",
        
        // --- MOBILE PADDING OBEN ---
        isGuildDashboard 
          ? "pt-18 px-4 pb-4" 
          : "pt-24 px-4 pb-4",
        
        // --- DESKTOP RESET & ABSTAND ---
        // md:pt-12 erhöht den oberen Abstand auf Tablets
        // xl:pt-16 erhöht ihn auf großen Desktops
        "md:px-6 md:pb-6 md:pt-12", 
        "xl:px-8 xl:pb-8 xl:pt-16"
      )}
    >
      {children}
    </div>
  );
}