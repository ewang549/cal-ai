/**
 * Next.js route handler exposing NextAuth at /api/auth/*.
 *
 * The `[...nextauth]` folder is a "catch-all" segment — any URL like
 * /api/auth/signin, /api/auth/callback/google, /api/auth/session etc.
 * gets routed here, and NextAuth's `handlers` object knows what to do
 * with each one.
 */
import { handlers } from "@/auth";

export const { GET, POST } = handlers;
