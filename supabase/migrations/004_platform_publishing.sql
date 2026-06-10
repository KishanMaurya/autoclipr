-- Platform posting destinations (OAuth / publish targets — separate from youtube_channels source list)
CREATE TABLE IF NOT EXISTS public.platform_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  account_name TEXT,
  account_id TEXT,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  auth_status TEXT NOT NULL DEFAULT 'connected',
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, platform)
);

CREATE INDEX IF NOT EXISTS idx_platform_connections_user ON public.platform_connections(user_id);

-- Per-clip publish attempts / status per platform
CREATE TABLE IF NOT EXISTS public.clip_publications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  clip_id UUID NOT NULL REFERENCES public.clips(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  platform_post_id TEXT,
  platform_post_url TEXT,
  error_message TEXT,
  job_id UUID REFERENCES public.processing_jobs(id) ON DELETE SET NULL,
  posted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(clip_id, platform)
);

CREATE INDEX IF NOT EXISTS idx_clip_publications_clip ON public.clip_publications(clip_id);
CREATE INDEX IF NOT EXISTS idx_clip_publications_user ON public.clip_publications(user_id);
CREATE INDEX IF NOT EXISTS idx_clip_publications_status ON public.clip_publications(status);

DROP TRIGGER IF EXISTS platform_connections_updated_at ON public.platform_connections;
CREATE TRIGGER platform_connections_updated_at BEFORE UPDATE ON public.platform_connections
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS clip_publications_updated_at ON public.clip_publications;
CREATE TRIGGER clip_publications_updated_at BEFORE UPDATE ON public.clip_publications
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
