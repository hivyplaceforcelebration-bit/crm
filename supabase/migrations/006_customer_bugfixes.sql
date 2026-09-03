-- ─────────────────────────────────────────────────────────────────────────────
-- Fix: customer records were never actually being created/updated from
-- bookings and lead conversions.
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. customers.phone had only a plain index, not a UNIQUE constraint. The
--    lead-conversion code does `.upsert(..., { onConflict: "phone" })`, which
--    Postgres silently rejects without a matching unique constraint - every
--    such upsert has been failing silently, leaving customer_id null on
--    every booking converted from a lead.
--    Dedupe first (keep the oldest row per phone) so the constraint can apply.
DELETE FROM customers a USING customers b
  WHERE a.phone = b.phone AND a.created_at > b.created_at;

ALTER TABLE customers
  ADD CONSTRAINT customers_phone_unique UNIQUE (phone);

-- 2. update_customer_stats() was called via RPC from createBooking() but was
--    never defined anywhere - that call has been failing silently on every
--    booking for a returning customer. Define it for real.
CREATE OR REPLACE FUNCTION update_customer_stats(p_customer_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE customers SET
    total_bookings = (SELECT COUNT(*) FROM bookings WHERE customer_id = p_customer_id),
    total_spend = (SELECT COALESCE(SUM(amount_paid), 0) FROM bookings WHERE customer_id = p_customer_id),
    last_visit = (SELECT MAX(booking_date) FROM bookings WHERE customer_id = p_customer_id),
    updated_at = NOW()
  WHERE id = p_customer_id;
END;
$$ LANGUAGE plpgsql;
