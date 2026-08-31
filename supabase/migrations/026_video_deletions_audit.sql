-- Audit trail for deleted videos.
--
-- Deleting a video hard-deletes the row (and its clips, via cascade), so once
-- it is gone there is nothing left to count — the admin dashboard had no way
-- to report deletions at all. This table is the record that survives.
--
-- It also separates deletions the user asked for from ones the Starter
-- retention sweep performed, which is the number worth watching after turning
-- retention on.

CREATE TABLE IF NOT EXISTS public.video_deletions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Deliberately not a foreign key: the videos row is already gone by the
  -- time this is written, so a reference would be unsatisfiable.
  video_id UUID NOT NULL,

  -- SET NULL rather than CASCADE so the totals survive account deletion —
  -- otherwise closing an account would silently rewrite history.
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

  title TEXT,
  -- 'user' = the owner deleted it. 'retention' = the Starter sweep did.
  reason TEXT NOT NULL DEFAULT 'user',
  clip_count INTEGER NOT NULL DEFAULT 0,
  deleted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- The dashboard asks for "how many total", "how many today", and the split by
-- reason, so index the two columns those filter on.
CREATE INDEX IF NOT EXISTS idx_video_deletions_deleted_at
  ON public.video_deletions (deleted_at DESC);
CREATE INDEX IF NOT EXISTS idx_video_deletions_reason
  ON public.video_deletions (reason);
CREATE INDEX IF NOT EXISTS idx_video_deletions_user
  ON public.video_deletions (user_id);

-- Admin-only data. RLS on with no policies means anon and authenticated get
-- nothing; the API reads it with the service_role key, which bypasses RLS.
ALTER TABLE public.video_deletions ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.video_deletions IS
  'One row per deleted video, written after the videos row is removed. Only source of deletion counts — the videos row itself is hard-deleted.';
