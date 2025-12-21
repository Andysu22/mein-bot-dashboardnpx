import { Inter } from "next/font/google";
import { Providers } from "@/components/Providers";
import Navbar from "@/components/Navbar";
import TopLoader from "@/components/TopLoader";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { Suspense } from "react";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export default async function RootLayout({ children }) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="de" className="dark" style={{ colorScheme: 'dark' }}>
      <body className={`${inter.className} antialiased h-screen flex flex-col bg-[#1a1c1f] text-gray-100 overflow-hidden`}>
        <Suspense fallback={null}>
          <TopLoader />
        </Suspense>

        <Providers session={session}>
          {/* Navbar ist immer da und verschwindet nie beim Neuladen */}
          <Navbar /> 
          
          {/* Der main-Tag ist der Scroll-Container. 
              Er existiert ab Sekunde 0, weshalb auch die Scrollbar sofort da ist. */}
          <main className="flex-1 overflow-y-auto custom-scroll pt-16"> 
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}