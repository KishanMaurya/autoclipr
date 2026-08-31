-- Record of every Starter deletion-notice email sent.
--
-- The obvious place to count these from is videos.retention_warning_sent_at,
-- but that is useless as a total: a warned video is deleted a grace period
-- later, taking its stamp with it. The count would climb for a day and then
-- collapse back toward zero.
--
-- So notices get their own row, written when the email actually goes out. One
-- row per email, not per video — the sweep sends a single message covering all
-- of a user's affected videos.

CREATE TABLE IF NOT EXISTS public.retention_notices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- SET NULL rather than CASCADE so totals survive account deletion.
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

  -- Kept independently of the profile so the record still says who was
  -- contacted after the account is gone.
  email TEXT NOT NULL,

  -- How many videos this one email covered.
  video_count INTEGER NOT NULL DEFAULT 0,

  -- The deletion date quoted in the email, for reconciling complaints.
  deletion_date DATE,

  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_retention_notices_sent_at
  ON public.retention_notices (sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_retention_notices_user
  ON public.retention_notices (user_id);

-- Admin-only. RLS on with no policies: anon and authenticated get nothing,
-- and the API reads it with the service_role key, which bypasses RLS.
ALTER TABLE public.retention_notices ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.retention_notices IS
  'One row per deletion-notice email sent by the Starter retention sweep. Written only after the send succeeds.';
