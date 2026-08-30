-- ─────────────────────────────────────────────────────────────────────────────
-- CRM Additions Migration
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Add source_domain column to leads table
--    Stores the hostname (e.g. "hivy.co.in") of the website that submitted the lead.
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS source_domain TEXT;

-- Index for analytics queries by domain
CREATE INDEX IF NOT EXISTS idx_leads_source_domain ON leads (source_domain);

-- 2. Add google_event_id column to bookings table
--    Will store the Google Calendar event ID once Google Calendar integration is live.
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS google_event_id TEXT;

-- ─────────────────────────────────────────────────────────────────────────────
-- Optional: backfill source_domain from lead_source for existing leads
-- (Only useful if lead_source already contains domain-like values)
-- UPDATE leads SET source_domain = lead_source WHERE source_domain IS NULL AND lead_source LIKE '%.%';
-- ─────────────────────────────────────────────────────────────────────────────
