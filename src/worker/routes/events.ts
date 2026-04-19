import { Hono } from "hono";
import { and, asc, eq, gte } from "drizzle-orm";
import type { AppBindings } from "../env";
import { db } from "../lib/db";
import { ok, fail } from "../lib/response";
import { events } from "@db/schema";
import type { EventsListResponse, PublicEvent } from "@shared/types";

const app = new Hono<AppBindings>();

function toPublic(row: typeof events.$inferSelect): PublicEvent {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    location: row.location,
    address: row.address,
    imageUrl: row.imageUrl,
    ctaLabel: row.ctaLabel,
    ctaUrl: row.ctaUrl,
  };
}

app.get("/", async (c) => {
  const d = db(c.env.DB);
  const now = Date.now();

  const rows = await d
    .select()
    .from(events)
    .where(and(eq(events.published, 1), gte(events.endsAt, now)))
    .orderBy(asc(events.startsAt))
    .limit(100);

  const body: EventsListResponse = { events: rows.map(toPublic) };
  return ok(c, body);
});

app.get("/:id", async (c) => {
  const d = db(c.env.DB);
  const id = c.req.param("id");
  const row = await d
    .select()
    .from(events)
    .where(and(eq(events.id, id), eq(events.published, 1)))
    .get();

  if (!row) return fail(c, "not_found", "Event not found.", 404);
  return ok(c, toPublic(row));
});

export default app;
