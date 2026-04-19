CREATE TABLE `service_info` (
	`id` integer PRIMARY KEY DEFAULT 1 NOT NULL,
	`service_times` text NOT NULL,
	`address` text NOT NULL,
	`city` text NOT NULL,
	`state` text NOT NULL,
	`zip` text NOT NULL,
	`map_url` text,
	`phone` text,
	`email` text,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sermons` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`speaker` text NOT NULL,
	`series` text,
	`description` text,
	`scripture` text,
	`preached_on` integer NOT NULL,
	`audio_url` text,
	`video_uid` text,
	`duration_seconds` integer,
	`thumbnail_url` text,
	`published` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_sermons_feed` ON `sermons` (`published`,`preached_on`);
--> statement-breakpoint
CREATE TABLE `events` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`starts_at` integer NOT NULL,
	`ends_at` integer NOT NULL,
	`location` text,
	`address` text,
	`image_url` text,
	`cta_label` text,
	`cta_url` text,
	`published` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_events_upcoming` ON `events` (`published`,`starts_at`);
--> statement-breakpoint
CREATE TABLE `live_stream_config` (
	`id` integer PRIMARY KEY DEFAULT 1 NOT NULL,
	`is_live` integer DEFAULT 0 NOT NULL,
	`embed_url` text,
	`title` text,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `donations` (
	`id` text PRIMARY KEY NOT NULL,
	`stripe_payment_intent_id` text NOT NULL,
	`amount_cents` integer NOT NULL,
	`currency` text DEFAULT 'usd' NOT NULL,
	`donor_email` text,
	`donor_name` text,
	`fund` text,
	`fundraiser_id` text,
	`is_recurring` integer DEFAULT 0 NOT NULL,
	`status` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `donations_stripe_payment_intent_id_unique` ON `donations` (`stripe_payment_intent_id`);
