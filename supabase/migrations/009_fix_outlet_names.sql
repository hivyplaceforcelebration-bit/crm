-- ─────────────────────────────────────────────────────────────────────────────
-- Fix: the "Surat" outlet was named "Friends Factory Surat" - but Friends
-- Factory operates in Vadodara, not Surat. Surat is Hivy's territory. This
-- is the exact seam identified as needing fixing before the two franchises
-- can be treated as genuinely separate in the CRM. Also replaces the
-- placeholder phone/address with each venue's real contact details.
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- ─────────────────────────────────────────────────────────────────────────────

UPDATE outlets SET
  name = 'Hivy — Place for Celebrations',
  address = '252/253, 2nd Floor, The Boulevard, Near Pratham Circle, Galleria Street, Green City Road, Adajan, Pal Gam, Surat, Gujarat 394510',
  phone = '+91 9727027278',
  email = 'hello@birthdaysurprisesurat.com'
WHERE city = 'Surat';

UPDATE outlets SET
  name = 'Friends Factory Cafe',
  address = '424, OneWest, Asopalav W, 4th Floor, Priya Talkies Road, Besides Adventuraa, Sevasi - Canal Rd, Gotri, Vadodara, Gujarat 391101',
  phone = '+91 7487888730',
  email = 'hello@friendsfactorycafe.com'
WHERE city = 'Vadodara';
