import { Hono } from "hono";
import { and, desc, eq, lt } from "drizzle-orm";
import type { AppBindings } from "../env";
import { db } from "../lib/db";
import { ok, fail } from "../lib/response";
import { sermons } from "@db/schema";
import type { PublicSermon, SermonsListResponse } from "@shared/types";

const app = new Hono<AppBindings>();

const PAGE_SIZE = 20;

function toPublic(row: typeof sermons.$inferSelect): PublicSermon {
  return {
    id: row.id,
    title: row.title,
    speaker: row.speaker,
    series: row.series,
    description: row.description,
    scripture: row.scripture,
    preachedOn: row.preachedOn,
    audioUrl: row.audioUrl,
    videoUid: row.videoUid,
    durationSeconds: row.durationSeconds,
    thumbnailUrl: row.thumbnailUrl,
  };
}

app.get("/", async (c) => {
  const d = db(c.env.DB);
  const series = c.req.query("series");
  const speaker = c.req.query("speaker");
  const cursorRaw = c.req.query("cursor");
  const cursor = cursorRaw ? Number(cursorRaw) : null;
  if (cursorRaw && Number.isNaN(cursor)) {
    return fail(c, "bad_cursor", "cursor must be a number (unix ms)", 400);
  }

  const filters = [eq(sermons.published, 1)];
  if (series) filters.push(eq(sermons.series, series));
  if (speaker) filters.push(eq(sermons.speaker, speaker));
  if (cursor !== null) filters.push(lt(sermons.preachedOn, cursor));

  const rows = await d
    .select()
    .from(sermons)
    .where(and(...filters))
    .orderBy(desc(sermons.preachedOn))
    .limit(PAGE_SIZE + 1);

  const hasMore = rows.length > PAGE_SIZE;
  const page = hasMore ? rows.slice(0, PAGE_SIZE) : rows;
  const nextCursor = hasMore ? page[page.length - 1].preachedOn : null;

  const body: SermonsListResponse = {
    sermons: page.map(toPublic),
    nextCursor,
  };
  return ok(c, body);
});

app.get("/:id", async (c) => {
  const d = db(c.env.DB);
  const id = c.req.param("id");
  const row = await d
    .select()
    .from(sermons)
    .where(and(eq(sermons.id, id), eq(sermons.published, 1)))
    .get();

  if (!row) return fail(c, "not_found", "Sermon not found.", 404);
  return ok(c, toPublic(row));
});

export default app;
