import { Inter } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";
import Navbar from "@/components/Navbar"; 
import TopLoader from "@/components/TopLoader"; 
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route"; 

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "BotPanel",
  description: "Dein Dashboard",
};

export default async function RootLayout({ children }) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="de" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  // 1. Akzentfarbe (Style Tag erstellen)
                  var savedColor = localStorage.getItem('accent-hsl');
                  var style = document.createElement('style');
                  style.id = 'custom-theme';
                  if (savedColor) {
                    style.innerHTML = ':root { --primary: ' + savedColor + ' !important; --ring: ' + savedColor + ' !important; }';
                  }
                  document.head.appendChild(style);

                  // 2. Darkmode Check
                  var savedTheme = localStorage.getItem('theme');
                  var isDark = savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches);
                  
                  if (isDark) {
                    document.documentElement.classList.add('dark');
                    // TRICK: Hintergrundfarbe sofort hart setzen, um weißen Blitz zu verhindern, bevor CSS lädt
                    document.documentElement.style.backgroundColor = '#1e1f22'; // Dein Dark-Background Hex-Code (ungefähr)
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className={inter.className}>
        <Providers session={session}>
          <TopLoader />
          <Navbar />
          <main>{children}</main>
        </Providers>
      </body>
    </html>
  );
}