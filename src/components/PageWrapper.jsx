"use client";

import { usePathname } from "next/navigation";

export default function PageWrapper({ children }) {
  const pathname = usePathname();
  
  // Prüfen, ob wir auf der Modal Builder Seite sind
  // Wenn ja: Kein Padding, volle Breite für das Tool
  const isFullWidthPage = pathname?.includes("/modal-builder");

  if (isFullWidthPage) {
    return (
      <div className="w-full h-full">
        {children}
      </div>
    );
  }

  // Für alle anderen Seiten: Standard Padding und Container
  return (
    <div className="p-8 w-full max-w-7xl mx-auto h-full overflow-y-auto custom-scrollbar">
      {children}
    </div>
  );
}