import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";

import * as schema from "@/lib/db/schema";

/**
 * Lazy Drizzle client over Neon's HTTP driver — works in Node and Edge
 * runtimes. If DATABASE_URL is unset, `db` is null and the logActivity
 * helper becomes a no-op (so local dev without a DB still works).
 */
const url = process.env.DATABASE_URL;

export const db = url
  ? drizzle(neon(url), { schema, casing: "snake_case" })
  : null;

export type Db = NonNullable<typeof db>;
