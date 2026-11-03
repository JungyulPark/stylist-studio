-- The Sunday Edition 발송 기록 — 같은 주에 두 번 보내지 않기 위한 장부.
-- week_of = 구독자 현지 기준 그 일요일 날짜.
CREATE TABLE IF NOT EXISTS public.weekly_editions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL,
  week_of date NOT NULL,
  looks integer DEFAULT 0,
  loved integer DEFAULT 0,
  sent_at timestamptz DEFAULT now(),
  UNIQUE (email, week_of)
);

ALTER TABLE public.weekly_editions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all_weekly_editions" ON public.weekly_editions
  FOR ALL USING (auth.role() = 'service_role');
