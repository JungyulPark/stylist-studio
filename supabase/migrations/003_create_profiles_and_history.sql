-- =============================================================
-- Migration 003: profiles, analysis_history, favorite_images fix
-- =============================================================

-- 1. profiles: 사용자 프로필 (AuthContext에서 사용)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT,
  preferred_language TEXT DEFAULT 'ko'
    CHECK (preferred_language IN ('ko', 'en', 'ja', 'zh', 'es')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 사용자: 본인 프로필 읽기/수정
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- 서비스 역할: 전체 접근
CREATE POLICY "Service role full access on profiles"
  ON profiles FOR ALL
  USING (true)
  WITH CHECK (true);

-- updated_at 자동 갱신
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================================

-- 2. analysis_history: 분석 이력 (App.tsx에서 사용)
CREATE TABLE IF NOT EXISTS analysis_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  analysis_type TEXT NOT NULL CHECK (analysis_type IN ('full', 'hair')),
  report_content TEXT,
  style_images JSONB,
  hair_images JSONB,
  input_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 사용자별 최신순 조회 인덱스
CREATE INDEX idx_analysis_history_user
  ON analysis_history(user_id, created_at DESC);

ALTER TABLE analysis_history ENABLE ROW LEVEL SECURITY;

-- 사용자: 본인 이력만 읽기/쓰기
CREATE POLICY "Users can view own analysis history"
  ON analysis_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own analysis history"
  ON analysis_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own analysis history"
  ON analysis_history FOR UPDATE
  USING (auth.uid() = user_id);

-- 서비스 역할: 전체 접근
CREATE POLICY "Service role full access on analysis_history"
  ON analysis_history FOR ALL
  USING (true)
  WITH CHECK (true);

-- =============================================================

-- 3. favorite_images: url_hash 컬럼 추가 (중복 체크용)
ALTER TABLE favorite_images
  ADD COLUMN IF NOT EXISTS url_hash TEXT;

CREATE INDEX IF NOT EXISTS idx_favorite_images_user_hash
  ON favorite_images(user_id, url_hash);
