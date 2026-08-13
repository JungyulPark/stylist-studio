-- The Journal 뉴스레터 구독자.
-- 무료 사용자에게 유일한 재방문 이유를 만든다: 분석 3회를 다 쓰고 나면
-- 돌아올 훅이 없었다. 주간 저널이 그 자리를 채우고, 유료 전환 통로가 된다.
CREATE TABLE IF NOT EXISTS public.journal_subscribers (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL UNIQUE,
  lang text DEFAULT 'en',
  source text,                       -- result_page | journal | landing
  season_label text,                 -- 가입 시점의 퍼스널 컬러 (콘텐츠 개인화용)
  status text DEFAULT 'active',      -- active | unsubscribed
  created_at timestamptz DEFAULT now(),
  unsubscribed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_journal_subscribers_status
  ON public.journal_subscribers (status, created_at DESC);

ALTER TABLE public.journal_subscribers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all_journal_subscribers" ON public.journal_subscribers
  FOR ALL USING (auth.role() = 'service_role');
