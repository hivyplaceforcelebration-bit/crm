-- ============================================================
-- FRIENDS FACTORY CRM — Full Database Schema
-- Paste this entire script into Supabase Dashboard → SQL Editor → Run
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- OUTLETS
-- ============================================================
CREATE TABLE IF NOT EXISTS outlets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  email TEXT,
  capacity INTEGER DEFAULT 8,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO outlets (name, city, address, phone, capacity) VALUES
  ('Friends Factory Surat', 'Surat', 'Surat, Gujarat', '+91 99999 00001', 8),
  ('Friends Factory Vadodara', 'Vadodara', 'Vadodara, Gujarat', '+91 99999 00002', 6)
ON CONFLICT DO NOTHING;

-- ============================================================
-- CUSTOMERS
-- ============================================================
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  city TEXT DEFAULT 'Surat',
  total_spend NUMERIC(10,2) DEFAULT 0,
  total_bookings INTEGER DEFAULT 0,
  last_visit DATE,
  first_visit DATE DEFAULT CURRENT_DATE,
  tags TEXT[] DEFAULT '{}',
  occasions TEXT[] DEFAULT '{}',
  consent_whatsapp BOOLEAN DEFAULT TRUE,
  notes TEXT,
  source TEXT DEFAULT 'walk-in',
  loyalty_points INTEGER DEFAULT 0,
  total_visits INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS customers_phone_idx ON customers(phone);
CREATE INDEX IF NOT EXISTS customers_city_idx ON customers(city);

-- ============================================================
-- PACKAGES
-- ============================================================
CREATE TABLE IF NOT EXISTS packages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  short_description TEXT,
  base_price NUMERIC(10,2) NOT NULL,
  max_people INTEGER DEFAULT 2,
  duration_minutes INTEGER DEFAULT 120,
  experience_type TEXT DEFAULT 'candlelight',
  is_active BOOLEAN DEFAULT TRUE,
  is_highlighted BOOLEAN DEFAULT FALSE,
  bookings_count INTEGER DEFAULT 0,
  inclusions TEXT[] DEFAULT '{}',
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed packages from mock data
INSERT INTO packages (name, short_description, base_price, max_people, duration_minutes, experience_type, is_active, is_highlighted, bookings_count, inclusions) VALUES
  ('Classic Candlelight Dinner', 'Intimate dinner with candles, roses, and special ambience', 2499, 2, 120, 'candlelight', TRUE, TRUE, 45, ARRAY['Decorated table', '2 Mocktails', '3-course meal', 'Background music', 'Rose petals']),
  ('Premium Rooftop Experience', 'Exclusive rooftop setup with premium décor and photographer', 4999, 2, 150, 'candlelight', TRUE, TRUE, 32, ARRAY['Private rooftop', 'Premium décor', 'Photographer (30 mins)', '4-course meal', 'Champagne mocktails', 'Fairy lights']),
  ('Birthday Celebration', 'Special birthday setup with cake, balloons, and decorations', 3499, 4, 120, 'birthday', TRUE, FALSE, 28, ARRAY['Birthday décor', 'Cake (500g)', 'Balloon arch', '4 Mocktails', '3-course meal', 'Birthday song']),
  ('Anniversary Special', 'Celebrate your love story with roses, cake, and memories', 3999, 2, 120, 'anniversary', TRUE, TRUE, 22, ARRAY['Rose bouquet', 'Cake (500g)', 'Photo frame', '2 Mocktails', '3-course meal', 'Couple game']),
  ('Proposal Setup', 'The perfect setting to pop the question', 5999, 2, 180, 'proposal', TRUE, TRUE, 15, ARRAY['Premium décor', 'Fairy lights tunnel', 'Rose path', 'Hidden photographer', 'Ring holder setup', 'Champagne', '4-course meal']),
  ('Private Cabana', 'Exclusive private space for intimate celebrations', 6999, 4, 180, 'private_celebration', TRUE, FALSE, 12, ARRAY['Private cabana', 'Customizable décor', 'Personal butler', '4-course meal', '4 Premium mocktails', 'Music system access'])
ON CONFLICT DO NOTHING;

-- ============================================================
-- ADD-ONS
-- ============================================================
CREATE TABLE IF NOT EXISTS add_ons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  type TEXT DEFAULT 'service',  -- decor, food, service, time
  is_active BOOLEAN DEFAULT TRUE,
  bookings_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO add_ons (name, price, type, is_active, bookings_count) VALUES
  ('Rose Bouquet', 599, 'decor', TRUE, 89),
  ('Premium Cake (1kg)', 899, 'food', TRUE, 76),
  ('Flower Path Entry', 799, 'decor', TRUE, 45),
  ('Live Musician (30 mins)', 1999, 'service', TRUE, 23),
  ('Professional Photographer', 1499, 'service', TRUE, 56),
  ('Extra 30 Minutes', 499, 'time', TRUE, 34),
  ('Balloon Decoration', 699, 'decor', TRUE, 67),
  ('Special Mocktails (2)', 399, 'food', TRUE, 92),
  ('Fog Entry', 599, 'decor', TRUE, 28),
  ('Personalized Letter', 299, 'service', TRUE, 41)
ON CONFLICT DO NOTHING;

-- ============================================================
-- TIME SLOTS
-- ============================================================
CREATE TABLE IF NOT EXISTS time_slots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  outlet_id UUID REFERENCES outlets(id),
  slot_name TEXT NOT NULL,  -- e.g. "Sunset Romance"
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  capacity INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- BOOKINGS
-- ============================================================
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_number TEXT UNIQUE NOT NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  outlet TEXT NOT NULL DEFAULT 'Surat',
  booking_date DATE NOT NULL,
  time_slot TEXT NOT NULL,
  table_zone TEXT,
  experience_type TEXT DEFAULT 'candlelight',
  package_id UUID REFERENCES packages(id) ON DELETE SET NULL,
  package_name TEXT,
  num_people INTEGER DEFAULT 2,
  status TEXT DEFAULT 'pending',   -- pending, confirmed, completed, cancelled
  payment_status TEXT DEFAULT 'pending', -- pending, partial, paid
  base_amount NUMERIC(10,2) DEFAULT 0,
  add_ons_amount NUMERIC(10,2) DEFAULT 0,
  total_amount NUMERIC(10,2) DEFAULT 0,
  amount_paid NUMERIC(10,2) DEFAULT 0,
  notes TEXT,
  special_request TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS bookings_date_idx ON bookings(booking_date);
CREATE INDEX IF NOT EXISTS bookings_customer_idx ON bookings(customer_id);
CREATE INDEX IF NOT EXISTS bookings_status_idx ON bookings(status);

-- Booking ↔ Add-ons junction
CREATE TABLE IF NOT EXISTS booking_add_ons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  add_on_id UUID REFERENCES add_ons(id),
  add_on_name TEXT,
  price NUMERIC(10,2),
  quantity INTEGER DEFAULT 1
);

-- ============================================================
-- LEADS
-- ============================================================
CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  whatsapp_number TEXT,
  email TEXT,
  occasion_type TEXT DEFAULT 'candlelight',
  preferred_date DATE,
  preferred_time TEXT,
  num_people INTEGER DEFAULT 2,
  outlet TEXT,
  status TEXT DEFAULT 'new',  -- new, contacted, qualified, converted, lost
  lead_source TEXT DEFAULT 'instagram',  -- instagram, facebook, google, whatsapp, referral, walkin
  enquiry_channel TEXT DEFAULT 'dm',  -- dm, call, whatsapp, walkin
  budget_range TEXT,
  notes TEXT,
  assigned_to TEXT,
  follow_up_date DATE,
  converted_booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS leads_status_idx ON leads(status);
CREATE INDEX IF NOT EXISTS leads_phone_idx ON leads(phone);

-- ============================================================
-- INVOICES / PAYMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_number TEXT UNIQUE NOT NULL,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  outlet TEXT,
  subtotal NUMERIC(10,2) DEFAULT 0,
  discount NUMERIC(10,2) DEFAULT 0,
  tax NUMERIC(10,2) DEFAULT 0,
  total_amount NUMERIC(10,2) NOT NULL,
  amount_paid NUMERIC(10,2) DEFAULT 0,
  payment_status TEXT DEFAULT 'pending',  -- pending, partial, paid, refunded
  payment_method TEXT,  -- cash, upi, card, online
  notes TEXT,
  due_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS invoices_booking_idx ON invoices(booking_id);

-- Payment transactions log
CREATE TABLE IF NOT EXISTS payment_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  amount NUMERIC(10,2) NOT NULL,
  payment_method TEXT NOT NULL,  -- cash, upi, card
  transaction_ref TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- MARKETING CAMPAIGNS
-- ============================================================
CREATE TABLE IF NOT EXISTS marketing_campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  message TEXT NOT NULL,
  audience_type TEXT DEFAULT 'all',  -- all, vip, birthday, anniversary, inactive
  audience_filter JSONB DEFAULT '{}',
  status TEXT DEFAULT 'draft',  -- draft, scheduled, sent, failed
  channel TEXT DEFAULT 'whatsapp',  -- whatsapp, sms, email
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  sent_count INTEGER DEFAULT 0,
  delivered_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ORDERS (legacy — kept for existing customer detail page)
-- ============================================================
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  total_amount NUMERIC(10,2) NOT NULL,
  status TEXT DEFAULT 'completed',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- LOYALTY TRANSACTIONS (legacy — kept for existing page)
-- ============================================================
CREATE TABLE IF NOT EXISTS loyalty_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  points INTEGER NOT NULL,
  type TEXT DEFAULT 'earned',  -- earned, redeemed
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- FEEDBACK
-- ============================================================
CREATE TABLE IF NOT EXISTS feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- Enable RLS on all tables (auth users can read/write their data)
-- ============================================================
ALTER TABLE outlets ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE add_ons ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_add_ons ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_slots ENABLE ROW LEVEL SECURITY;

-- Allow all operations for authenticated users (CRM staff)
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'outlets','customers','packages','add_ons','bookings','booking_add_ons',
    'leads','invoices','payment_transactions','marketing_campaigns',
    'orders','loyalty_transactions','feedback','time_slots'
  ]) LOOP
    EXECUTE format('
      DROP POLICY IF EXISTS "auth_all_%s" ON %I;
      CREATE POLICY "auth_all_%s" ON %I
        FOR ALL TO authenticated
        USING (TRUE)
        WITH CHECK (TRUE);
    ', tbl, tbl, tbl, tbl);
  END LOOP;
END $$;

-- ============================================================
-- HELPER FUNCTION: auto-generate booking number
-- ============================================================
CREATE OR REPLACE FUNCTION generate_booking_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.booking_number IS NULL OR NEW.booking_number = '' THEN
    NEW.booking_number := 'FF-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(nextval('booking_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE SEQUENCE IF NOT EXISTS booking_seq START 1;

DROP TRIGGER IF EXISTS set_booking_number ON bookings;
CREATE TRIGGER set_booking_number
  BEFORE INSERT ON bookings
  FOR EACH ROW EXECUTE FUNCTION generate_booking_number();

-- ============================================================
-- HELPER FUNCTION: auto-generate invoice number
-- ============================================================
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.invoice_number IS NULL OR NEW.invoice_number = '' THEN
    NEW.invoice_number := 'INV-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(nextval('invoice_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE SEQUENCE IF NOT EXISTS invoice_seq START 1;

DROP TRIGGER IF EXISTS set_invoice_number ON invoices;
CREATE TRIGGER set_invoice_number
  BEFORE INSERT ON invoices
  FOR EACH ROW EXECUTE FUNCTION generate_invoice_number();

-- ============================================================
-- FUNCTION: update updated_at timestamp
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON leads FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_packages_updated_at BEFORE UPDATE ON packages FOR EACH ROW EXECUTE FUNCTION update_updated_at();
