-- =============================================================================
-- AutoClipr — run this ENTIRE file in Supabase → SQL Editor (one click Run)
-- Creates profiles (required) + youtube_channels
-- For the full app, also run 001_initial_schema.sql later.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Step 1: profiles (youtube_channels references this) ─────────────────────

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  credits INTEGER NOT NULL DEFAULT 10,
  subscription_tier TEXT NOT NULL DEFAULT 'free',
  stripe_customer_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own profile" ON public.profiles;
CREATE POLICY "Users read own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Backfill profiles for users who signed up before this migration
INSERT INTO public.profiles (id, email, full_name, avatar_url)
SELECT
  id,
  COALESCE(email, ''),
  COALESCE(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name'),
  raw_user_meta_data->>'avatar_url'
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- ─── Step 2: youtube_channels ────────────────────────────────────────────────

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

CREATE INDEX IF NOT EXISTS idx_youtube_channels_user ON public.youtube_channels(user_id);

ALTER TABLE public.youtube_channels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own channels" ON public.youtube_channels;
CREATE POLICY "Users manage own channels" ON public.youtube_channels
  FOR ALL USING (auth.uid() = user_id);

-- Refresh API schema cache
NOTIFY pgrst, 'reload schema';
