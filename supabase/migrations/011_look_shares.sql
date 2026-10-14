-- 오늘의 룩 공유 — 구독자가 룩 하나를 골라 공개 페이지(/look/{id})로 공유한다.
--
-- shared_results(005)는 anon SELECT가 열려 있어 얼굴 사진을 담기엔 부적합하다.
-- 이 테이블은 service_role 전용: 공개 페이지도 Functions가 id로 한 행만 읽는다.
-- 공유는 룩 단위 명시적 동의(버튼 클릭)로만 생기고, revoked_at으로 언제든 내린다.
CREATE TABLE IF NOT EXISTS public.look_shares (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL,
  sent_date date NOT NULL,
  scenario_id text NOT NULL,
  look_name text,
  image_key text NOT NULL,           -- DAILY_IMAGES_BUCKET 안의 R2 키
  city text,
  temperature_c integer,
  weather_condition text,
  lang text DEFAULT 'en',
  view_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  revoked_at timestamptz,
  UNIQUE (email, sent_date, scenario_id)
);

CREATE INDEX IF NOT EXISTS idx_look_shares_email ON public.look_shares (email, created_at DESC);

ALTER TABLE public.look_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all_look_shares" ON public.look_shares
  FOR ALL USING (auth.role() = 'service_role');

-- 조회수 원자 증가 — 서버(service_role)만 호출
CREATE OR REPLACE FUNCTION public.increment_look_share_view(p_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.look_shares SET view_count = view_count + 1
  WHERE id = p_id AND revoked_at IS NULL;
$$;

REVOKE EXECUTE ON FUNCTION public.increment_look_share_view(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_look_share_view(uuid) TO service_role;
