"use client";
import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export default function TopLoader() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    const timeout = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(timeout);
  }, [pathname, searchParams]);

  if (!loading) return null;

  return (
    // z-[9999] stellt sicher, dass der Balken ÜBER der Navbar (z-[100]) liegt
    <div className="fixed top-0 left-0 w-full z-[9999] pointer-events-none">
      <div className="h-[3px] bg-[#5865F2] shadow-[0_0_15px_rgba(88,101,242,0.7)] animate-load"></div>
      <style jsx>{`
        .animate-load {
          animation: slide 0.6s ease-out forwards;
        }
        @keyframes slide {
          0% { width: 0%; opacity: 1; }
          80% { width: 90%; opacity: 1; }
          100% { width: 100%; opacity: 0; }
        }
      `}</style>
    </div>
  );
}