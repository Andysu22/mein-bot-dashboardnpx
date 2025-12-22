import NextAuth from "next-auth";
import DiscordProvider from "next-auth/providers/discord";

export const authOptions = {
  providers: [
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID,
      clientSecret: process.env.DISCORD_CLIENT_SECRET,
      // WICHTIG: 'guilds' Scope ist Pflicht für den Admin-Check!
      authorization: { params: { scope: 'identify guilds' } },
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt", // Wichtig für Access Tokens
  },
  callbacks: {
    // 1. JWT Callback: Token von Discord empfangen und speichern
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token;
      }
      return token;
    },
    // 2. Session Callback: Token an das Frontend/API weitergeben
    async session({ session, token }) {
      session.accessToken = token.accessToken; // <--- HIER PASSIERT DER FEHLER MEISTENS
      session.user.id = token.sub; // Nützlich für User ID Checks
      return session;
    },
  },
  pages: {
    signIn: '/', 
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };