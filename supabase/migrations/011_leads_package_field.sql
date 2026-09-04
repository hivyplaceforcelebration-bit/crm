-- ─────────────────────────────────────────────────────────────────────────────
-- Leads had no package field - the site's booking form collects a package
-- choice, but the CRM had nowhere to put it except buried in free-text
-- notes. Adds a real column so it shows as its own field, matching the
-- website's form (Package + Preferred Time, alongside the fields the CRM
-- already had: Name, Phone, City/Outlet, Your Moment/Occasion, Date).
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE leads ADD COLUMN IF NOT EXISTS package_name TEXT;
