import NextAuth from "next-auth";
import type { JWT } from "next-auth/jwt";
import Google from "next-auth/providers/google";

/**
 * Auth.js (NextAuth v5) configuration.
 *
 * - On first sign-in, store the access_token, refresh_token, and the
 *   expiry timestamp on the JWT.
 * - On every subsequent request, if the access_token has expired, use
 *   the refresh_token to mint a new access_token from Google's OAuth
 *   server. This is what lets the app keep talking to Google Calendar
 *   beyond the initial ~1-hour token lifetime.
 */
export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      authorization: {
        params: {
          scope:
            "openid email profile https://www.googleapis.com/auth/calendar.events",
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      // First sign-in — stash the OAuth tokens on the JWT.
      if (account) {
        return {
          ...token,
          accessToken: account.access_token,
          refreshToken: account.refresh_token,
          // account.expires_at is a UNIX timestamp in SECONDS.
          expiresAt: account.expires_at as number | undefined,
        };
      }

      // Subsequent calls — refresh if the access_token is expired (or about
      // to expire). 60-second buffer so we never use a token that's about
      // to die mid-request.
      const expiresAt = token.expiresAt as number | undefined;
      if (expiresAt && Date.now() / 1000 < expiresAt - 60) {
        return token; // still valid
      }

      // Try to refresh.
      return await refreshAccessToken(token);
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken as string | undefined;
      // Surface refresh errors so UI can prompt re-sign-in if needed.
      session.error = token.error as string | undefined;
      // Expose the Google `sub` claim as a stable user id for logging /
      // preference learning. `token.sub` is set automatically by Auth.js.
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
});

/** Exchange the stored refresh_token for a new access_token. */
async function refreshAccessToken(token: JWT): Promise<JWT> {
  const refreshToken = token.refreshToken as string | undefined;
  if (!refreshToken) {
    return { ...token, error: "RefreshTokenMissing" };
  }

  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.AUTH_GOOGLE_ID ?? "",
        client_secret: process.env.AUTH_GOOGLE_SECRET ?? "",
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
    });

    const refreshed = (await res.json()) as {
      access_token?: string;
      expires_in?: number;
      refresh_token?: string;
      error?: string;
    };

    if (!res.ok || !refreshed.access_token) {
      // eslint-disable-next-line no-console
      console.error("Token refresh failed:", refreshed);
      return { ...token, error: refreshed.error || "RefreshTokenError" };
    }

    return {
      ...token,
      accessToken: refreshed.access_token,
      expiresAt:
        Math.floor(Date.now() / 1000) + (refreshed.expires_in ?? 3600),
      // Google sometimes rotates the refresh_token; keep the new one if present.
      refreshToken: refreshed.refresh_token ?? refreshToken,
      error: undefined,
    };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Token refresh threw:", err);
    return { ...token, error: "RefreshTokenError" };
  }
}
