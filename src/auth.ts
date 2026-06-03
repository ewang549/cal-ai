import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

/**
 * Auth.js (NextAuth v5) configuration.
 *
 * - Reads `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` / `AUTH_SECRET` automatically
 *   from process.env, so we don't pass them here.
 * - We extend the default Google scope to include `calendar.events` so the
 *   access_token Google returns can read/write the user's calendar.
 * - `access_type: "offline"` + `prompt: "consent"` ensures we get a refresh
 *   token (needed once an access_token expires after ~1 hour).
 * - We stash the access_token + refresh_token onto the JWT in the `jwt`
 *   callback, then surface it on the session in the `session` callback so
 *   server components can grab it via `auth()`.
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
      // `account` is only present on first sign-in. Persist the tokens
      // onto the JWT so subsequent requests can use them.
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt = account.expires_at;
      }
      return token;
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken as string | undefined;
      return session;
    },
  },
});
