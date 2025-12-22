"use client";
import { usePathname } from "next/navigation";

export default function PageWrapper({ children }) {
    const pathname = usePathname();
    const isBuilder = pathname?.includes("/modal-builder");

    if (isBuilder) {
        // Builder: Keine Abstände, volle Höhe (WICHTIG!)
        return <div className="w-full h-full flex flex-col">{children}</div>;
    }

    // Andere Seiten: Dein altes Design mit Abständen
    return (
        <div className="p-6 md:p-12 lg:p-16 pt-24 lg:pt-12 pb-32">
            {children}
        </div>
    );
}