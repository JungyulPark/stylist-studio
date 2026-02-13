-- =============================================================
-- Stylist Studio: Subscribers & Daily Recommendations
-- =============================================================

-- 1. subscribers: 구독자 프로필 + 위치/시간대 정보
CREATE TABLE IF NOT EXISTS subscribers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email TEXT NOT NULL,

  -- Polar 구독 정보
  polar_subscription_id TEXT,
  polar_checkout_id TEXT,
  status TEXT NOT NULL DEFAULT 'trialing'
    CHECK (status IN ('trialing', 'active', 'canceled', 'expired', 'past_due')),
  plan_type TEXT NOT NULL DEFAULT 'daily_style',

  -- 프로필 데이터 (AI 스타일 추천용)
  height_cm INTEGER CHECK (height_cm BETWEEN 50 AND 300),
  weight_kg INTEGER CHECK (weight_kg BETWEEN 20 AND 500),
  gender TEXT CHECK (gender IN ('male', 'female', 'other')),
  photo_r2_key TEXT,  -- Cloudflare R2 object key (e.g., 'photos/{subscriber_id}.jpg')

  -- 위치 & 시간대 (날씨 + 6AM 발송용)
  city TEXT NOT NULL,
  country TEXT,
  timezone TEXT NOT NULL,       -- IANA (e.g., 'Asia/Seoul', 'America/New_York')
  latitude REAL,
  longitude REAL,

  -- 언어
  preferred_language TEXT NOT NULL DEFAULT 'en'
    CHECK (preferred_language IN ('ko', 'en', 'ja', 'zh', 'es')),

  -- 구독 기간
  trial_ends_at TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,

  -- 스타일 선호도 (추후 학습용)
  style_preferences JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. daily_recommendations: 일일 추천 발송 로그
CREATE TABLE IF NOT EXISTS daily_recommendations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  subscriber_id UUID NOT NULL REFERENCES subscribers(id) ON DELETE CASCADE,
  sent_date DATE NOT NULL DEFAULT CURRENT_DATE,

  -- 날씨 정보
  weather_data JSONB,
  temperature_c REAL,
  weather_condition TEXT,       -- 'clear', 'rain', 'snow', 'clouds' 등
  humidity INTEGER,

  -- AI 추천 내용
  recommendation_html TEXT,     -- 이메일 본문 HTML
  outfit_description TEXT,      -- 추천 설명 텍스트

  -- 발송 상태
  email_sent BOOLEAN DEFAULT false,
  email_sent_at TIMESTAMPTZ,
  email_error TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- 하루에 한 번만 발송
  UNIQUE(subscriber_id, sent_date)
);

-- =============================================================
-- Indexes
-- =============================================================

-- 크론잡: 활성 구독자 + 시간대별 조회
CREATE INDEX idx_subscribers_active_tz
  ON subscribers(timezone, status)
  WHERE status IN ('trialing', 'active');

-- 이메일 중복 방지
CREATE INDEX idx_subscribers_email ON subscribers(email);

-- Polar ID 조회
CREATE INDEX idx_subscribers_polar ON subscribers(polar_checkout_id);

-- 일일 추천 조회
CREATE INDEX idx_daily_rec_subscriber_date
  ON daily_recommendations(subscriber_id, sent_date DESC);

-- =============================================================
-- Row Level Security
-- =============================================================

ALTER TABLE subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_recommendations ENABLE ROW LEVEL SECURITY;

-- 서비스 역할: 전체 접근 (크론잡, API 서버)
CREATE POLICY "Service role full access on subscribers"
  ON subscribers FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access on daily_recommendations"
  ON daily_recommendations FOR ALL
  USING (true)
  WITH CHECK (true);

-- 사용자: 본인 구독 정보만 읽기
CREATE POLICY "Users can view own subscription"
  ON subscribers FOR SELECT
  USING (auth.uid() = user_id);

-- 사용자: 본인 추천 기록만 읽기
CREATE POLICY "Users can view own recommendations"
  ON daily_recommendations FOR SELECT
  USING (
    subscriber_id IN (
      SELECT id FROM subscribers WHERE user_id = auth.uid()
    )
  );

-- =============================================================
-- Trigger: updated_at 자동 갱신
-- =============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER subscribers_updated_at
  BEFORE UPDATE ON subscribers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
