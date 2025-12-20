import { Inter } from "next/font/google";
import { Providers } from "@/components/Providers";
import Navbar from "@/components/Navbar";
import { getServerSession } from "next-auth"; // WICHTIG
import { authOptions } from "@/app/api/auth/[...nextauth]/route"; // WICHTIG
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Bot Dashboard",
  description: "Advanced Server Management",
};

export default async function RootLayout({ children }) {
  // Wir holen die Session hier auf dem SERVER.
  // Das bedeutet: Wenn die Seite beim User ankommt, wissen wir SCHON, ob er eingeloggt ist.
  const session = await getServerSession(authOptions);

  return (
    <html lang="de" className="dark" style={{ colorScheme: 'dark' }}>
      <body className={`${inter.className} antialiased min-h-screen bg-[#1a1c1f] text-gray-100`}>
        {/* Wir geben die Session weiter an die Providers */}
        <Providers session={session}>
          <Navbar /> 
          <main className="pt-16"> 
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}