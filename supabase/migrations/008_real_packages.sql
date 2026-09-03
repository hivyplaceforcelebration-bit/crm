-- ─────────────────────────────────────────────────────────────────────────────
-- Replace the 6 placeholder mock packages ("Classic Candlelight Dinner" etc,
-- seeded in 001_friends_factory_crm.sql from mock frontend data) with the 14
-- real packages actually sold - 6 from Hivy (Surat), 8 from Friends Factory
-- (Vadodara). Pulled directly from each site's live package data.
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- ─────────────────────────────────────────────────────────────────────────────

-- Packages weren't attributable to an outlet at all before - add it so staff
-- can tell which of the 14 belongs to which venue.
ALTER TABLE packages ADD COLUMN IF NOT EXISTS outlet TEXT;

DELETE FROM packages;

INSERT INTO packages (name, short_description, base_price, max_people, duration_minutes, experience_type, is_active, is_highlighted, inclusions, image_url, outlet) VALUES
  -- ── Hivy · Surat ──────────────────────────────────────────────────────────
  ('Tent of Romance', 'Step into a cozy romantic tent where love blooms under soft lights and dreamy décor', 6500, 2, 180, 'candlelight', TRUE, TRUE,
    ARRAY['3 Hours Private Romantic Tent Celebration', 'Complimentary Celebration Cake', 'Champagne: ₹500/- (Non-Alcoholic)', '7kg Real Rose Petals Floor Decoration'],
    '/hivy-images/6500/cover.webp', 'Surat'),
  ('Fairy Tale Proposals', 'Step into a magical fairytale where dreams come true and love stories begin', 6300, 2, 180, 'proposal', TRUE, TRUE,
    ARRAY['3 Hours Private Fairytale Celebration', 'Complimentary Celebration Cake', 'Champagne: ₹500/- (Non-Alcoholic)', 'Magical Tent with Elegant Curtains'],
    '/hivy-images/6300/Cover.webp', 'Surat'),
  ('Swing of LOVE', 'Float in love on a dreamy swing setup where romance meets playfulness', 5100, 2, 180, 'candlelight', TRUE, FALSE,
    ARRAY['3 Hours Private Swing Setup Celebration', 'Complimentary Celebration Cake', 'Champagne: ₹500/- (Non-Alcoholic)', 'Beautiful Decorated Swing of Love'],
    '/hivy-images/5100/Cover photo.webp', 'Surat'),
  ('BoHo Chic', 'Embrace free-spirited romance in a bohemian paradise filled with warmth and elegance', 5700, 2, 180, 'candlelight', TRUE, FALSE,
    ARRAY['3 Hours Private Bohemian Celebration', 'Complimentary Celebration Cake', 'Champagne: ₹500/- (Non-Alcoholic)', 'Artistic Boho Styled Tent'],
    '/hivy-images/5700/Cover.webp', 'Surat'),
  ('TwinHeart', 'Celebrate love with twin hearts symbolizing two souls becoming one', 4700, 2, 180, 'anniversary', TRUE, FALSE,
    ARRAY['3 Hours Private Twin Heart Celebration', 'Cake Available: ₹500/-', 'Champagne: ₹500/- (Non-Alcoholic)', 'Elegant Red & White Tent Setup'],
    '/hivy-images/5400/2.webp', 'Surat'),
  ('Elite Group Setup', 'Create a one-of-a-kind proposal experience tailored just for your love story', 5400, 4, 120, 'private_celebration', TRUE, FALSE,
    ARRAY['2 Hours Private Elite Group Celebration', 'Complimentary Celebration Cake', 'Champagne: ₹500/- (Non-Alcoholic)', 'Fully Decorated Private Setup'],
    '/hivy-images/5400/2.webp', 'Surat'),

  -- ── Friends Factory · Vadodara ───────────────────────────────────────────
  ('Forever Us LoveFrame Rooftop', 'Celebrate love in a space where every glance, laugh, and memory is framed against the stunning skyline', 6900, 2, 180, 'candlelight', TRUE, TRUE,
    ARRAY['3 Hours Private Rooftop Celebration', 'Welcome Drink & Complimentary Celebration Cake', 'Elegant Photo Frame Setup with romantic decorations', 'Candle-Lit Seating with premium decor & props'],
    '/packages/thumbnails/forever-us-loveframe-rooftop.webp', 'Vadodara'),
  ('Eternal Love Rooftop Celebration', 'Celebrate moments that matter in a rooftop setting where emotions shine as brightly as the city lights below', 6500, 2, 180, 'candlelight', TRUE, TRUE,
    ARRAY['3 Hours Exclusive Private Rooftop Celebration', 'Welcome Drink & Complimentary Celebration Cake', 'Stylish Canopy Setup with elegant curtains', 'Heart-shaped Balloons & Rose Petals'],
    '/packages/thumbnails/eternal-love-rooftop-celebration.webp', 'Vadodara'),
  ('Golden Promise Glass House', 'Step into a radiant space where every moment glows with love, warmth, and elegance', 6000, 2, 180, 'candlelight', TRUE, FALSE,
    ARRAY['3 Hours Private Glass House Celebration', 'Welcome Drink & Complimentary Celebration Cake', 'Elegant Golden Fairy Lights & Décor', 'Flower Decorations & Premium Props'],
    '/packages/thumbnails/golden-promise-glass-house.webp', 'Vadodara'),
  ('Moonlit Romance Experience', 'Step into a serene night where love unfolds beneath a glowing moon and shimmering city lights', 5100, 2, 180, 'candlelight', TRUE, FALSE,
    ARRAY['3 Hours Private Moonlit Rooftop Celebration', 'Welcome Drink & Curated Treats', 'Dreamy Moon-themed Décor with silver accents', 'Candle Pathway & Romantic Seating'],
    '/packages/thumbnails/moonlit-romance-experience.webp', 'Vadodara'),
  ('The Promise Creative Area', 'Ignite joy under the stars at The Promise Creative Area — a magical rooftop space designed for unforgettable celebrations', 4700, 2, 180, 'candlelight', TRUE, FALSE,
    ARRAY['3 Hours Private Rooftop Celebration', 'Welcome Drink & Curated Treats', 'Festive Tent Setup with curtains & balloons', 'Twinkling Lights & Romantic Décor'],
    '/packages/thumbnails/the-promise-creative-area.webp', 'Vadodara'),
  ('Timeless Bond Glass House', 'Step into an elegant glass house where love feels calm, pure, and everlasting', 5700, 2, 180, 'candlelight', TRUE, FALSE,
    ARRAY['3 Hours Private Glass House Celebration', 'Welcome Drink & Curated Treats', 'Minimalist Elegant White Theme Décor', 'Flower Arrangements & Candle Setup'],
    '/packages/thumbnails/timeless-bond-glass-house.webp', 'Vadodara'),
  ('Sweet Together Glass House', 'Step into a charming space where love feels cozy, laughter is shared, and every moment is sweeter than the last', 5500, 2, 180, 'candlelight', TRUE, FALSE,
    ARRAY['3 Hours Private Glass House Celebration', 'Welcome Drink & Curated Treats', 'Sweet & Cozy Theme with warm décor', 'Balloon Arrangements & Romantic Props'],
    '/packages/thumbnails/sweet-together-glass-house.webp', 'Vadodara'),
  ('Pure Love Glass House', 'Welcome to a serene glass house where emotions are honest, moments are gentle, and love is beautifully pure', 4700, 2, 180, 'candlelight', TRUE, FALSE,
    ARRAY['3 Hours Private Glass House Celebration', 'Welcome Drink & Curated Treats', 'Pure White Theme with elegant simplicity', 'Rose Petals & Candle Pathway'],
    '/packages/thumbnails/pure-love-glass-house.webp', 'Vadodara');
