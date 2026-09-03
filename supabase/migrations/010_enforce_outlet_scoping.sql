-- ─────────────────────────────────────────────────────────────────────────────
-- Enforce outlet-based access for real. Settings > Users & Roles has said
-- "these permissions aren't enforced in the app yet; every logged-in user
-- currently has the same access regardless of role" since it was built -
-- every RLS policy so far is "auth_all_*": any authenticated user, full
-- access to every row. This replaces that with real per-outlet scoping on
-- the tables that actually carry outlet-sensitive data, using each user's
-- user_roles.outlet_access ('all', 'Surat', or 'Vadodara').
--
-- This only restricts CRM staff logins (which query through the anon key +
-- session, subject to RLS). The public lead-capture and tracking endpoints
-- (/api/leads/submit, /api/track) use the service-role key and are
-- unaffected - they bypass RLS by design, same as before.
--
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- ─────────────────────────────────────────────────────────────────────────────

-- Defaults to 'all' (unrestricted) when the logged-in user has no user_roles
-- row yet - this matters because login only requires a Supabase auth
-- account, not a user_roles row, and the real account in production today
-- (friendsfactorycafe@gmail.com) has none. Defaulting to 'all' avoids
-- locking out every real user the moment this migration runs; assign a
-- specific outlet_access on the Users tab to actually restrict someone.
CREATE OR REPLACE FUNCTION current_user_outlet_access()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(
    (SELECT outlet_access FROM user_roles WHERE id = auth.uid() AND is_active = TRUE LIMIT 1),
    'all'
  );
$$;

-- Give the real production account an explicit admin row instead of relying
-- on the function's default - makes intent explicit and means adding other
-- restricted users later won't accidentally affect this one.
INSERT INTO user_roles (id, email, name, role, outlet_access)
SELECT id, email, 'Admin', 'admin', 'all'
FROM auth.users
WHERE email = 'friendsfactorycafe@gmail.com'
ON CONFLICT (id) DO NOTHING;

-- bookings (outlet TEXT NOT NULL)
DROP POLICY IF EXISTS "auth_all_bookings" ON bookings;
CREATE POLICY "outlet_scoped_bookings" ON bookings
  FOR ALL
  USING (current_user_outlet_access() = 'all' OR outlet = current_user_outlet_access())
  WITH CHECK (current_user_outlet_access() = 'all' OR outlet = current_user_outlet_access());

-- leads (outlet TEXT, nullable - an unattributed lead is visible to admins only)
DROP POLICY IF EXISTS "auth_all_leads" ON leads;
CREATE POLICY "outlet_scoped_leads" ON leads
  FOR ALL
  USING (current_user_outlet_access() = 'all' OR outlet = current_user_outlet_access())
  WITH CHECK (current_user_outlet_access() = 'all' OR outlet = current_user_outlet_access());

-- invoices (outlet TEXT)
DROP POLICY IF EXISTS "auth_all_invoices" ON invoices;
CREATE POLICY "outlet_scoped_invoices" ON invoices
  FOR ALL
  USING (current_user_outlet_access() = 'all' OR outlet = current_user_outlet_access())
  WITH CHECK (current_user_outlet_access() = 'all' OR outlet = current_user_outlet_access());

-- customers (scoped by city, not outlet - same Surat/Vadodara values)
DROP POLICY IF EXISTS "auth_all_customers" ON customers;
CREATE POLICY "outlet_scoped_customers" ON customers
  FOR ALL
  USING (current_user_outlet_access() = 'all' OR city = current_user_outlet_access())
  WITH CHECK (current_user_outlet_access() = 'all' OR city = current_user_outlet_access());

-- packages (outlet TEXT, added in migration 008)
DROP POLICY IF EXISTS "auth_all_packages" ON packages;
CREATE POLICY "outlet_scoped_packages" ON packages
  FOR ALL
  USING (current_user_outlet_access() = 'all' OR outlet = current_user_outlet_access())
  WITH CHECK (current_user_outlet_access() = 'all' OR outlet = current_user_outlet_access());

-- ─────────────────────────────────────────────────────────────────────────────
-- Update the reference text in Settings > Users & Roles to match reality
-- (the actual UI copy still needs a matching code change, tracked separately)
-- ─────────────────────────────────────────────────────────────────────────────
