// PageWrapper.jsx
"use client";

import { usePathname } from "next/navigation";

export default function PageWrapper({ children }) {
  const pathname = usePathname();

  // Modal Builder Seite: Full width
  const isFullWidthPage = pathname?.includes("/modal-builder");

  if (isFullWidthPage) {
    return <div className="w-full h-full">{children}</div>;
  }

  // Standard: Scroll-Container (WICHTIG für Preview-Centering)
  return (
    <div
      data-scroll-container="true"
      className="p-4 md:p-6 xl:p-8 w-full max-w-7xl mx-auto h-full overflow-y-auto custom-scrollbar"
    >
      {children}
    </div>
  );
}
