// src/app/global-error.js
"use client";

import { Inter } from "next/font/google";
import "./globals.css"; // Wichtig, damit Tailwind styles geladen werden

const inter = Inter({ subsets: ["latin"] });

export default function GlobalError({ error, reset }) {
  return (
    <html lang="de" className="dark">
      <body className={`${inter.className} bg-[#1a1c1f] text-gray-100 flex items-center justify-center h-screen`}>
        <div className="text-center p-6">
          <h2 className="text-4xl font-black mb-4">Kritischer Fehler</h2>
          <p className="text-[#949ba4] mb-8">Das System muss neu geladen werden.</p>
          <button
            onClick={() => reset()}
            className="px-6 py-3 bg-[#5865F2] rounded-lg text-white font-bold hover:bg-[#4752c4] transition"
          >
            Seite neu laden
          </button>
        </div>
      </body>
    </html>
  );
}