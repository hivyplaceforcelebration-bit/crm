-- ─────────────────────────────────────────────────────────────────────────────
-- Adds outlet branding (logo) and sets up Storage for the CRM to let staff
-- upload outlet logos and package photos from the UI, instead of images
-- only ever being set by editing the database directly.
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE outlets ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- One public bucket for both outlet logos and package photos (they're both
-- small, publicly-visible marketing images - invoices and the public site
-- need to load them without auth). Files are namespaced by folder:
-- outlet-logos/<outlet-id>-<timestamp>.<ext>, package-images/<package-id>-<timestamp>.<ext>
INSERT INTO storage.buckets (id, name, public)
VALUES ('media', 'media', true)
ON CONFLICT (id) DO NOTHING;

-- Anyone can read (public bucket - these images are meant to be public on
-- invoices/the website). Only authenticated CRM users can upload/replace/
-- delete, matching how every other write in this app is gated.
DROP POLICY IF EXISTS "Public read access to media" ON storage.objects;
CREATE POLICY "Public read access to media"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'media');

DROP POLICY IF EXISTS "Authenticated users can upload media" ON storage.objects;
CREATE POLICY "Authenticated users can upload media"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'media' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can update media" ON storage.objects;
CREATE POLICY "Authenticated users can update media"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'media' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can delete media" ON storage.objects;
CREATE POLICY "Authenticated users can delete media"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'media' AND auth.role() = 'authenticated');
