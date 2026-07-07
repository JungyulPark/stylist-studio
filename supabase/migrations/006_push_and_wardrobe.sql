-- Push subscriptions (Web Push endpoints per subscriber) and the
-- wardrobe: garments the subscriber actually owns, which the daily
-- recommendation is built around.

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  user_id UUID,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT,
  auth TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_email ON push_subscriptions (email);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all_push_subscriptions" ON push_subscriptions
  FOR ALL USING (auth.role() = 'service_role');

CREATE TABLE IF NOT EXISTS wardrobe_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  user_id UUID,
  r2_key TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wardrobe_items_email ON wardrobe_items (email);

ALTER TABLE wardrobe_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all_wardrobe_items" ON wardrobe_items
  FOR ALL USING (auth.role() = 'service_role');
