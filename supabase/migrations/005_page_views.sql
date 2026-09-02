-- ─────────────────────────────────────────────────────────────────────────────
-- Page Views (visitor tracking)
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS page_views (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  site TEXT NOT NULL,              -- siteConfig.name, e.g. "HIVY - Birthday Surprise Planners"
  source_domain TEXT NOT NULL,     -- hostname, e.g. "birthdaysurprisesurat.com"
  page_path TEXT NOT NULL,         -- e.g. "/packages/tent-of-romance"
  referrer TEXT,                   -- document.referrer, if any
  session_id TEXT NOT NULL,        -- per-browser-session UUID, groups pageviews into a visit
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_page_views_site ON page_views (site);
CREATE INDEX IF NOT EXISTS idx_page_views_source_domain ON page_views (source_domain);
CREATE INDEX IF NOT EXISTS idx_page_views_created_at ON page_views (created_at);
CREATE INDEX IF NOT EXISTS idx_page_views_session_id ON page_views (session_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Helper views for the analytics dashboard
-- ─────────────────────────────────────────────────────────────────────────────

-- Unique visitors (distinct sessions) and total pageviews, per site per day
CREATE OR REPLACE VIEW page_views_daily AS
SELECT
  site,
  source_domain,
  date_trunc('day', created_at) AS day,
  COUNT(*) AS pageviews,
  COUNT(DISTINCT session_id) AS unique_visitors
FROM page_views
GROUP BY site, source_domain, date_trunc('day', created_at);

-- Same, rolled up by month — this is what answers "which month gives good business season"
CREATE OR REPLACE VIEW page_views_monthly AS
SELECT
  site,
  source_domain,
  date_trunc('month', created_at) AS month,
  COUNT(*) AS pageviews,
  COUNT(DISTINCT session_id) AS unique_visitors
FROM page_views
GROUP BY site, source_domain, date_trunc('month', created_at);
