/**
 * Type augmentations for next-auth.
 *
 * By default `Session` doesn't include `accessToken`. We added it in the
 * callbacks in src/auth.ts, so we tell TypeScript it exists too — otherwise
 * `session.accessToken` would be a red squiggle.
 */
import "next-auth";
import "next-auth/jwt";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    accessToken?: string;
    /** Present when refreshing the access_token failed; UI should re-sign-in. */
    error?: string;
    user: {
      /** Google `sub` claim — stable per user, used as primary key for logging. */
      id?: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: number;
    error?: string;
  }
}
