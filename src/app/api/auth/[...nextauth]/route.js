import NextAuth from "next-auth";
import DiscordProvider from "next-auth/providers/discord";

// 1. Wir definieren die Optionen in einer exportierten Variable
export const authOptions = {
  providers: [
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID,
      clientSecret: process.env.DISCORD_CLIENT_SECRET,
      authorization: { params: { scope: 'identify guilds' } }, // WICHTIG: Server-Zugriff
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      // Access Token speichern, wenn der User sich einloggt
      if (account) {
        token.accessToken = account.access_token;
      }
      return token;
    },
    async session({ session, token }) {
      // Access Token und ID an die Session weiterreichen
      if (session?.user) {
        session.user.id = token.sub;
        session.accessToken = token.accessToken; 
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };