-- ─────────────────────────────────────────────────────────────────────────────
-- Seeds the two WhatsApp messages sent automatically on booking confirmation
-- (customer + team alert) as real, editable rows in message_templates,
-- instead of hardcoded text in code. lib/actions/whatsapp.ts looks these up
-- by name and fills in {placeholders} - editing the body here changes what
-- actually gets sent, no redeploy needed.
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO message_templates (name, body, category)
VALUES
  (
    'Booking Confirmation - Customer',
    '🎉 BOOKING CONFIRMED — {outlet_name}

Hi {customer_name} 👋

Your celebration at {outlet_name}, {outlet_city} is confirmed! ✨

👤 Name: {customer_name}
📞 Contact: {phone}
📅 Date: {date}
⏰ Preferred Time: {time}
🎁 Occasion: {occasion}
📦 Package: {package_name}

🕯️ Reminder: Please call us 15 minutes before your booking time for the candle-light setup/glow.

✨ We look forward to making your special moment memorable at {outlet_name}!',
    'transactional'
  ),
  (
    'Booking Confirmation - Team',
    '🔔 NEW BOOKING CONFIRMED

A new customer booking has been received.

👤 Customer: {customer_name}
📞 Phone: {phone}
📍 City: {outlet_city}
📦 Package: {package_name}
🎁 Occasion: {occasion}
📅 Date: {date}
⏰ Time: {time}

✅ Booking Status: CONFIRMED

Please check the booking details and make the necessary arrangements for the customer''s celebration.

Venue: {outlet_name}, {outlet_city}
Contact: {outlet_phone}

❤️ Every occasion turns into a forever memory under the stars.',
    'transactional'
  )
ON CONFLICT DO NOTHING;
