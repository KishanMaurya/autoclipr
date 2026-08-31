-- Starter-plan video retention.
--
-- Videos generated on the free Starter plan are kept for 3 days. The sweep
-- runs in two stages so nothing is ever deleted without notice:
--
--   1. A video that is old enough gets a warning email and is stamped here.
--   2. Deletion only happens once that stamp is at least 24h old.
--
-- Storing the stamp on the video (rather than the profile) is what makes the
-- retention window roll per video: each clip a Starter user generates gets its
-- own 3-day life and its own warning.
--
-- Paid tiers are never touched — the sweep filters on profiles.subscription_tier.

ALTER TABLE public.videos
  ADD COLUMN IF NOT EXISTS retention_warning_sent_at TIMESTAMPTZ;

COMMENT ON COLUMN public.videos.retention_warning_sent_at IS
  'When the Starter-plan deletion warning email was sent for this video. NULL = not yet warned. Cleared when the owner upgrades to a paid plan.';

-- The sweep looks up "oldest un-warned videos" and "warned videos past the
-- grace period". Both are narrow slices of the table, so index accordingly.
CREATE INDEX IF NOT EXISTS idx_videos_retention_unwarned
  ON public.videos (created_at)
  WHERE retention_warning_sent_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_videos_retention_warned
  ON public.videos (retention_warning_sent_at)
  WHERE retention_warning_sent_at IS NOT NULL;
