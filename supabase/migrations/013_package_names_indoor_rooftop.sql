-- ─────────────────────────────────────────────────────────────────────────────
-- Adds "(Indoor)" to every package title that isn't a rooftop setup, so
-- customers can tell at a glance which packages are rooftop vs indoor.
-- The two Vadodara rooftop packages (Forever Us LoveFrame Rooftop, Eternal
-- Love Rooftop Celebration) already say "Rooftop" in their name and are
-- left as-is; every other package (all 6 Surat/Hivy ones, plus the other
-- 6 Vadodara/Friends Factory ones) gets "(Indoor)" appended.
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- ─────────────────────────────────────────────────────────────────────────────

UPDATE packages SET name = name || ' (Indoor)'
WHERE name IN (
  'Golden Promise Glass House',
  'Moonlit Romance Experience',
  'The Promise Creative Area',
  'Timeless Bond Glass House',
  'Sweet Together Glass House',
  'Pure Love Glass House',
  'Tent of Romance',
  'Fairy Tale Proposals',
  'Swing of LOVE',
  'BoHo Chic',
  'TwinHeart',
  'Elite Group Setup'
);
