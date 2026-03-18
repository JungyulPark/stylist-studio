-- Shared analysis results for dynamic OG images and viral sharing
CREATE TABLE IF NOT EXISTS public.shared_results (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id),
  season text NOT NULL,
  palette jsonb NOT NULL DEFAULT '[]',
  body_type text,
  preview_image_url text,
  share_image_url text,
  view_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.shared_results ENABLE ROW LEVEL SECURITY;

-- Anyone can view shared results (public sharing purpose)
CREATE POLICY "Anyone can view shared results" ON public.shared_results
  FOR SELECT USING (true);

-- Authenticated users can create their own shared results
CREATE POLICY "Authenticated users create shared results" ON public.shared_results
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Helper function to increment view count
CREATE OR REPLACE FUNCTION public.increment_share_view(share_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE public.shared_results
  SET view_count = view_count + 1
  WHERE id = share_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
