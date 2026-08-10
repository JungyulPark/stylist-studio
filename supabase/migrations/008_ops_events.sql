-- 운영 감사 이벤트: 돈이 움직인 기록(결제/구독/환불)과 크론 요약을
-- 영구 저장한다. Cloudflare 로그는 휘발성이라 분쟁·장애 시 근거가 없다.
CREATE TABLE IF NOT EXISTS public.ops_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type text NOT NULL,
  actor_email text,
  ref_id text,
  payload jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ops_events_type_time ON public.ops_events (event_type, created_at DESC);

ALTER TABLE public.ops_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all_ops_events" ON public.ops_events
  FOR ALL USING (auth.role() = 'service_role');
