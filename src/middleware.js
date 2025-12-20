import { withAuth } from "next-auth/middleware";

export default withAuth({
  callbacks: {
    authorized: ({ token }) => {
      // Wir lassen ALLE durch.
      // Die Prüfung passiert jetzt in der page.js, damit wir unser eigenes Design anzeigen können.
      return true; 
    },
  },
});

export const config = {
  matcher: ["/dashboard/:path*"],
};