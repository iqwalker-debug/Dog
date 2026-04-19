import { sqliteTable, integer, text, index } from "drizzle-orm/sqlite-core";

export const serviceInfo = sqliteTable("service_info", {
  id: integer("id").primaryKey().default(1),
  serviceTimes: text("service_times").notNull(),
  address: text("address").notNull(),
  city: text("city").notNull(),
  state: text("state").notNull(),
  zip: text("zip").notNull(),
  mapUrl: text("map_url"),
  phone: text("phone"),
  email: text("email"),
  updatedAt: integer("updated_at").notNull(),
});

export const sermons = sqliteTable(
  "sermons",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    speaker: text("speaker").notNull(),
    series: text("series"),
    description: text("description"),
    scripture: text("scripture"),
    preachedOn: integer("preached_on").notNull(),
    audioUrl: text("audio_url"),
    videoUid: text("video_uid"),
    durationSeconds: integer("duration_seconds"),
    thumbnailUrl: text("thumbnail_url"),
    published: integer("published").notNull().default(0),
    createdAt: integer("created_at").notNull(),
  },
  (t) => ({
    feedIdx: index("idx_sermons_feed").on(t.published, t.preachedOn),
  }),
);

export const events = sqliteTable(
  "events",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    description: text("description"),
    startsAt: integer("starts_at").notNull(),
    endsAt: integer("ends_at").notNull(),
    location: text("location"),
    address: text("address"),
    imageUrl: text("image_url"),
    ctaLabel: text("cta_label"),
    ctaUrl: text("cta_url"),
    published: integer("published").notNull().default(0),
    createdAt: integer("created_at").notNull(),
  },
  (t) => ({
    upcomingIdx: index("idx_events_upcoming").on(t.published, t.startsAt),
  }),
);

export const liveStreamConfig = sqliteTable("live_stream_config", {
  id: integer("id").primaryKey().default(1),
  isLive: integer("is_live").notNull().default(0),
  embedUrl: text("embed_url"),
  title: text("title"),
  updatedAt: integer("updated_at").notNull(),
});

export const donations = sqliteTable("donations", {
  id: text("id").primaryKey(),
  stripePaymentIntentId: text("stripe_payment_intent_id").notNull().unique(),
  amountCents: integer("amount_cents").notNull(),
  currency: text("currency").notNull().default("usd"),
  donorEmail: text("donor_email"),
  donorName: text("donor_name"),
  fund: text("fund"),
  fundraiserId: text("fundraiser_id"),
  isRecurring: integer("is_recurring").notNull().default(0),
  status: text("status").notNull(),
  createdAt: integer("created_at").notNull(),
});

export type Sermon = typeof sermons.$inferSelect;
export type EventRow = typeof events.$inferSelect;
export type ServiceInfo = typeof serviceInfo.$inferSelect;
export type LiveStreamConfig = typeof liveStreamConfig.$inferSelect;
export type Donation = typeof donations.$inferSelect;
