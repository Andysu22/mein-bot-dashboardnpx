import { withAuth } from "next-auth/middleware";

// Wir exportieren die Middleware-Funktion explizit als "default"
export default withAuth({
  callbacks: {
    // Diese Funktion prüft: Ist ein Token da? (true/false)
    authorized: ({ token }) => !!token,
  },
});

// Hier legen wir fest, welche Routen geschützt werden
export const config = {
  matcher: ["/dashboard/:path*"],
};