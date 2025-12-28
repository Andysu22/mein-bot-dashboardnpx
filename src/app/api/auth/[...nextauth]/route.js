import NextAuth from "next-auth";
import DiscordProvider from "next-auth/providers/discord";

/**
 * Hilfsfunktion: Versucht, das Access Token zu erneuern.
 */
async function refreshAccessToken(token) {
  try {
    if (!token.refreshToken) {
      throw new Error("No refresh token available");
    }

    const url = "https://discord.com/api/oauth2/token";
    const body = new URLSearchParams({
      client_id: process.env.DISCORD_CLIENT_ID,
      client_secret: process.env.DISCORD_CLIENT_SECRET,
      grant_type: "refresh_token",
      refresh_token: token.refreshToken,
    });

    const response = await fetch(url, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      method: "POST",
      body,
    });

    const refreshedTokens = await response.json();

    if (!response.ok) {
      throw refreshedTokens;
    }

    return {
      ...token,
      accessToken: refreshedTokens.access_token,
      accessTokenExpires: Date.now() + refreshedTokens.expires_in * 1000,
      refreshToken: refreshedTokens.refresh_token ?? token.refreshToken,
    };
  } catch (error) {
    console.error("Fehler beim Aktualisieren des Tokens:", error);
    return {
      ...token,
      error: "RefreshAccessTokenError",
    };
  }
}

export const authOptions = {
  providers: [
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID,
      clientSecret: process.env.DISCORD_CLIENT_SECRET,
      authorization: { params: { scope: 'identify guilds' } },
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, account, user }) {
      // 1. Initialer Login: Wir speichern alle nötigen Daten
      if (account && user) {
        return {
          accessToken: account.access_token,
          accessTokenExpires: Date.now() + (account.expires_in * 1000),
          refreshToken: account.refresh_token,
          user, 
          sub: user.id, // User ID explizit sichern
        };
      }

      // 2. Token prüfen
      // Falls das Token noch gültig ist ODER gar kein Ablaufdatum hat (altes Cookie), geben wir es zurück.
      // WICHTIG: Wir prüfen auch, ob ein RefreshToken existiert. Ohne das können wir eh nicht refreshen.
      if (Date.now() < token.accessTokenExpires || !token.accessTokenExpires || !token.refreshToken) {
        return token;
      }

      // 3. Token ist abgelaufen und wir haben ein RefreshToken -> erneuern
      return await refreshAccessToken(token);
    },

    async session({ session, token }) {
      // Sicherstellen, dass session.user existiert
      session.user = session.user || {};

      // Daten aus dem Token in die Session kopieren (falls vorhanden)
      if (token.user) {
        session.user = { ...session.user, ...token.user };
      }

      // ID setzen (Absturzsicher)
      if (token.sub) {
        session.user.id = token.sub;
      }
      
      session.accessToken = token.accessToken;
      
      if (token.error) {
        session.error = token.error;
      }
      
      return session;
    },
  },
  pages: {
    signIn: '/',
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };