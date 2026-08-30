-- ============================================================
-- USER ROLES (maps Supabase auth users to a role + outlet access)
-- ============================================================
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY,  -- same id as auth.users
  email TEXT NOT NULL,
  name TEXT,
  role TEXT NOT NULL DEFAULT 'staff',  -- admin, manager, agent, staff
  outlet_access TEXT NOT NULL DEFAULT 'all',  -- 'all' or a city name
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_all_user_roles" ON user_roles;
CREATE POLICY "auth_all_user_roles" ON user_roles
  FOR ALL TO authenticated
  USING (TRUE)
  WITH CHECK (TRUE);

-- ============================================================
-- BUSINESS SETTINGS (single-row config: general info + policies)
-- ============================================================
CREATE TABLE IF NOT EXISTS business_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),  -- enforce single row
  business_name TEXT DEFAULT 'Friends Factory Cafe',
  gstin TEXT,
  support_email TEXT,
  support_phone TEXT,
  full_payment_required BOOLEAN DEFAULT TRUE,
  min_advance_percent INTEGER DEFAULT 100,
  min_advance_booking_hours INTEGER DEFAULT 2,
  max_advance_booking_days INTEGER DEFAULT 30,
  gst_rate INTEGER DEFAULT 18,
  prices_inclusive_tax BOOLEAN DEFAULT TRUE,
  cancellation_policy TEXT DEFAULT '48+ hours: 100% refund. 24-48 hours: 50% refund. Under 24 hours: no refund.',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO business_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

ALTER TABLE business_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_all_business_settings" ON business_settings;
CREATE POLICY "auth_all_business_settings" ON business_settings
  FOR ALL TO authenticated
  USING (TRUE)
  WITH CHECK (TRUE);
