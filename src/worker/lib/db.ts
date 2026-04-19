import { drizzle } from "drizzle-orm/d1";
import type { D1Database } from "@cloudflare/workers-types";
import * as schema from "@db/schema";

export function db(d1: D1Database) {
  return drizzle(d1, { schema, casing: "snake_case" });
}

export type DB = ReturnType<typeof db>;
