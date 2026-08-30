-- 003: Staff, Attendance & Payroll

-- ============================================================
-- STAFF
-- ============================================================
CREATE TABLE IF NOT EXISTS staff (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  role TEXT DEFAULT 'host',  -- manager, host, chef, server, cleaner, bartender
  outlet TEXT NOT NULL DEFAULT 'Vadodara',  -- Vadodara, Surat, Both
  salary_type TEXT DEFAULT 'monthly',  -- monthly, daily
  base_salary NUMERIC(10,2) DEFAULT 0,
  joining_date DATE DEFAULT CURRENT_DATE,
  is_active BOOLEAN DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS staff_outlet_idx ON staff(outlet);
CREATE INDEX IF NOT EXISTS staff_active_idx ON staff(is_active);

-- ============================================================
-- ATTENDANCE
-- ============================================================
CREATE TABLE IF NOT EXISTS attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id UUID REFERENCES staff(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status TEXT DEFAULT 'present',  -- present, absent, half_day, leave, holiday
  check_in TIME,
  check_out TIME,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(staff_id, date)
);

CREATE INDEX IF NOT EXISTS attendance_date_idx ON attendance(date);
CREATE INDEX IF NOT EXISTS attendance_staff_idx ON attendance(staff_id);

-- ============================================================
-- PAYROLL RUNS (one per month per outlet)
-- ============================================================
CREATE TABLE IF NOT EXISTS payroll_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  month TEXT NOT NULL,  -- YYYY-MM
  outlet TEXT NOT NULL DEFAULT 'all',  -- 'all', 'Vadodara', 'Surat'
  total_payable NUMERIC(10,2) DEFAULT 0,
  total_paid NUMERIC(10,2) DEFAULT 0,
  status TEXT DEFAULT 'draft',  -- draft, processed, paid
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  UNIQUE(month, outlet)
);

-- ============================================================
-- PAYROLL ENTRIES (one per staff per payroll run)
-- ============================================================
CREATE TABLE IF NOT EXISTS payroll_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payroll_run_id UUID REFERENCES payroll_runs(id) ON DELETE CASCADE,
  staff_id UUID REFERENCES staff(id) ON DELETE CASCADE,
  staff_name TEXT NOT NULL,
  base_salary NUMERIC(10,2) DEFAULT 0,
  working_days INTEGER DEFAULT 26,
  days_present INTEGER DEFAULT 0,
  days_absent INTEGER DEFAULT 0,
  days_half INTEGER DEFAULT 0,
  overtime_hours NUMERIC(4,1) DEFAULT 0,
  overtime_amount NUMERIC(10,2) DEFAULT 0,
  bonus NUMERIC(10,2) DEFAULT 0,
  deductions NUMERIC(10,2) DEFAULT 0,
  net_payable NUMERIC(10,2) DEFAULT 0,
  is_paid BOOLEAN DEFAULT FALSE,
  paid_at TIMESTAMPTZ,
  payment_method TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(payroll_run_id, staff_id)
);

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_entries ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY['staff','attendance','payroll_runs','payroll_entries']) LOOP
    EXECUTE format('
      DROP POLICY IF EXISTS "auth_all_%s" ON %I;
      CREATE POLICY "auth_all_%s" ON %I
        FOR ALL TO authenticated
        USING (TRUE) WITH CHECK (TRUE);
    ', tbl, tbl, tbl, tbl);
  END LOOP;
END $$;

-- updated_at triggers
CREATE TRIGGER update_staff_updated_at BEFORE UPDATE ON staff FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Seed sample staff (can be deleted in prod)
INSERT INTO staff (name, phone, role, outlet, salary_type, base_salary, joining_date) VALUES
  ('Rahul Sharma', '+91 98765 00001', 'manager', 'Vadodara', 'monthly', 35000, '2023-01-15'),
  ('Priya Patel', '+91 98765 00002', 'host', 'Vadodara', 'monthly', 18000, '2023-03-01'),
  ('Amit Verma', '+91 98765 00003', 'chef', 'Vadodara', 'monthly', 22000, '2023-03-01'),
  ('Sneha Joshi', '+91 98765 00004', 'server', 'Vadodara', 'monthly', 15000, '2023-06-01'),
  ('Karan Shah', '+91 98765 00005', 'host', 'Surat', 'monthly', 18000, '2023-04-15'),
  ('Meena Iyer', '+91 98765 00006', 'chef', 'Surat', 'monthly', 22000, '2023-04-15')
ON CONFLICT DO NOTHING;
