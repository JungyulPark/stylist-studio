-- Referral System Tables
-- referral_codes: 유저당 1개 코드 (최초 요청 시 lazy 생성)
CREATE TABLE IF NOT EXISTS referral_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  total_referrals INTEGER DEFAULT 0,
  available_credits INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_referral_codes_code ON referral_codes(code);

-- referral_events: 전환 이벤트 로그
CREATE TABLE IF NOT EXISTS referral_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_user_id UUID NOT NULL REFERENCES auth.users(id),
  referred_email TEXT NOT NULL,
  referral_code TEXT NOT NULL,
  purchase_type TEXT NOT NULL,
  checkout_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_referral_events_unique ON referral_events(referral_code, referred_email);

-- RLS
ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_events ENABLE ROW LEVEL SECURITY;

-- Users can read their own referral code
CREATE POLICY "Users can view own referral code"
  ON referral_codes FOR SELECT
  USING (auth.uid() = user_id);

-- Service role has full access (via supabase service key)
CREATE POLICY "Service role full access on referral_codes"
  ON referral_codes FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access on referral_events"
  ON referral_events FOR ALL
  USING (auth.role() = 'service_role');

-- Atomic credit decrement function (race condition 방지)
CREATE OR REPLACE FUNCTION use_referral_credit(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  remaining INTEGER;
BEGIN
  UPDATE referral_codes
  SET available_credits = available_credits - 1
  WHERE user_id = p_user_id AND available_credits > 0
  RETURNING available_credits INTO remaining;

  IF NOT FOUND THEN
    RETURN -1;  -- no credits available
  END IF;

  RETURN remaining;
END;
$$;

-- Atomic referral increment function (race condition 방지)
CREATE OR REPLACE FUNCTION record_referral_credit(p_code TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE referral_codes
  SET total_referrals = total_referrals + 1,
      available_credits = available_credits + 1
  WHERE code = p_code;
END;
$$;

-- Validate referral code exists (코드 유효성 검사)
CREATE OR REPLACE FUNCTION validate_referral_code(p_code TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM referral_codes WHERE code = p_code);
END;
$$;
