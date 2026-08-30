-- 002: Message Templates for WhatsApp Marketing

CREATE TABLE IF NOT EXISTS message_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  body TEXT NOT NULL,
  category TEXT DEFAULT 'marketing',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_all_message_templates" ON message_templates;
CREATE POLICY "auth_all_message_templates" ON message_templates
  FOR ALL TO authenticated
  USING (TRUE)
  WITH CHECK (TRUE);

-- Seed default templates
INSERT INTO message_templates (name, body, category) VALUES
  ('Birthday Offer', E'Happy Birthday {{name}}! \U0001f382\nCelebrate your special day with us — get 15% OFF on any package!\nValid for 7 days. Just reply to book your slot \U0001f49d', 'marketing'),
  ('Anniversary Reminder', E'Hi {{name}}! \U0001f495\nYour anniversary is coming up soon!\nMake it truly unforgettable with a romantic dinner at Friends Factory. Limited slots — book early! \U0001f339\nReply to this message to reserve your evening.', 'marketing'),
  ('Flash Sale', E'Hi {{name}}! ⚡\nWeekend special — book any package for this Saturday or Sunday and get a complimentary cake!\nOffer valid till midnight. Reply to confirm your slot \U0001f382', 'promotional'),
  ('Re-engagement', E'Hi {{name}}! \U0001f31f\nWe miss you! It has been a while.\nCome back and enjoy a special discount — 10% OFF your next booking.\nJust reply to this message \U0001f48c', 'marketing'),
  ('VIP Exclusive', E'Hi {{name}}! \U0001f451\nAs one of our most valued guests, you get exclusive first access to our new package.\nReply to learn more or book your slot — limited availability!', 'marketing')
ON CONFLICT DO NOTHING;
