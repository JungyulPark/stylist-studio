-- Add outfit_images and image_generation_status to daily_recommendations
ALTER TABLE daily_recommendations
  ADD COLUMN IF NOT EXISTS outfit_images JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS image_generation_status TEXT DEFAULT 'pending';

-- Add profile_complete flag to subscribers
ALTER TABLE subscribers
  ADD COLUMN IF NOT EXISTS profile_complete BOOLEAN DEFAULT false;

-- Favorite images table
CREATE TABLE IF NOT EXISTS favorite_images (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  image_type TEXT NOT NULL CHECK (image_type IN ('style', 'hair', 'daily')),
  label TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE favorite_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own favorites"
  ON favorite_images FOR ALL
  USING (auth.uid() = user_id);
