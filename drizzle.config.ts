// Drizzle Kit doesn't auto-load Next.js's `.env.local` — load it explicitly
// so `npx drizzle-kit push` / `generate` / `studio` work without inlining secrets.
import { config } from "dotenv";
config({ path: ".env.local" });

import type { Config } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL is not set. Add it to .env.local before running drizzle-kit.",
  );
}

export default {
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  casing: "snake_case",
  strict: true,
  verbose: true,
} satisfies Config;
