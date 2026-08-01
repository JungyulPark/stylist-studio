-- Outfit feedback: the daily recommendation learns from what the
-- subscriber liked or disliked (Alta-style preference loop).
-- NOTE: applied to production via Supabase MCP on 2026-07-13.
CREATE TABLE IF NOT EXISTS public.outfit_feedback (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL,
  sent_date date NOT NULL,
  scenario_id text NOT NULL,
  verdict text NOT NULL CHECK (verdict IN ('like', 'dislike')),
  outfit_desc text,
  created_at timestamptz DEFAULT now(),
  UNIQUE (email, sent_date, scenario_id)
);

CREATE INDEX IF NOT EXISTS idx_outfit_feedback_email ON public.outfit_feedback (email, created_at DESC);

ALTER TABLE public.outfit_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all_outfit_feedback" ON public.outfit_feedback
  FOR ALL USING (auth.role() = 'service_role');
