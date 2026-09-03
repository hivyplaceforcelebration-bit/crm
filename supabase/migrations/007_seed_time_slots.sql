-- ─────────────────────────────────────────────────────────────────────────────
-- Seed time_slots + fix: 3 different hardcoded time-slot lists existed across
-- the app (Bookings/Calendar used one 5-slot set, Leads used a totally
-- different 10-slot set with different dash formatting), and Settings >
-- Time Slots had no data despite having full CRUD UI already built.
-- Seeding the real table here; the app code now reads from it everywhere.
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO time_slots (slot_name, start_time, end_time, capacity, is_active) VALUES
  ('Afternoon', '16:00', '18:00', 4, TRUE),
  ('Early Evening', '17:30', '19:30', 4, TRUE),
  ('Evening', '19:00', '21:00', 4, TRUE),
  ('Night', '20:30', '22:30', 4, TRUE),
  ('Late Night', '22:00', '00:00', 4, TRUE)
ON CONFLICT DO NOTHING;
