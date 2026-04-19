import type { D1Database, R2Bucket, Fetcher } from "@cloudflare/workers-types";

export type Env = {
  DB: D1Database;
  MEDIA: R2Bucket;
  ASSETS: Fetcher;
  APP_ENV?: string;
  // Phase 1.5 — Stripe (not yet used)
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  STRIPE_PUBLISHABLE_KEY?: string;
};

export type AppBindings = { Bindings: Env };
