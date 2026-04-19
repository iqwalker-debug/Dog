-- Dev seed. Run with:
--   wrangler d1 execute refuge-pwa-db --local --file=src/db/seed.sql

INSERT INTO service_info (id, service_times, address, city, state, zip, map_url, phone, email, updated_at)
VALUES (
  1,
  '[{"day":"Sunday","time":"9:00 AM","name":"Morning Service"},{"day":"Sunday","time":"11:00 AM","name":"Second Service"},{"day":"Wednesday","time":"7:00 PM","name":"Midweek"}]',
  '123 Main St',
  'Anytown',
  'CA',
  '90000',
  'https://maps.google.com/?q=123+Main+St',
  '555-123-4567',
  'hello@refugecc.org',
  strftime('%s','now') * 1000
)
ON CONFLICT(id) DO NOTHING;

INSERT INTO live_stream_config (id, is_live, embed_url, title, updated_at)
VALUES (1, 0, NULL, NULL, strftime('%s','now') * 1000)
ON CONFLICT(id) DO NOTHING;

INSERT INTO sermons (id, title, speaker, series, description, scripture, preached_on, audio_url, published, created_at)
VALUES
  ('srm_001','Hope in the Valley','Pastor John','Walking by Faith','A message on hope in difficult seasons.','Psalm 23', strftime('%s','now') * 1000 - 7*86400000, NULL, 1, strftime('%s','now') * 1000),
  ('srm_002','The Weight of Glory','Pastor John','Walking by Faith','Why eternal things outweigh present pains.','2 Corinthians 4:17', strftime('%s','now') * 1000 - 14*86400000, NULL, 1, strftime('%s','now') * 1000),
  ('srm_003','Love Your Neighbor','Pastor Anne',NULL,'Practical love in our community.','Luke 10:25-37', strftime('%s','now') * 1000 - 21*86400000, NULL, 1, strftime('%s','now') * 1000);

INSERT INTO events (id, title, description, starts_at, ends_at, location, address, cta_label, cta_url, published, created_at)
VALUES
  ('evt_001','Community Dinner','Bring a dish to share.', strftime('%s','now') * 1000 + 3*86400000, strftime('%s','now') * 1000 + 3*86400000 + 7200000, 'Fellowship Hall','123 Main St','RSVP','https://example.com/rsvp',1, strftime('%s','now') * 1000),
  ('evt_002','Youth Retreat','Weekend away for teens.', strftime('%s','now') * 1000 + 20*86400000, strftime('%s','now') * 1000 + 22*86400000, 'Camp Redwood','456 Forest Rd',NULL,NULL,1, strftime('%s','now') * 1000);
