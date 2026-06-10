-- YouTube channels connected by users
CREATE TABLE IF NOT EXISTS public.youtube_channels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  channel_url TEXT NOT NULL,
  channel_name TEXT NOT NULL,
  thumbnail_url TEXT,
  is_trial_channel BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, channel_url)
);

CREATE INDEX idx_youtube_channels_user ON public.youtube_channels(user_id);

ALTER TABLE public.youtube_channels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own channels" ON public.youtube_channels
  FOR ALL USING (auth.uid() = user_id);
