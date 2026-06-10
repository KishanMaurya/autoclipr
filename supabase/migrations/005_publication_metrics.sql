-- Cached platform metrics for analytics dashboard
ALTER TABLE public.clip_publications
  ADD COLUMN IF NOT EXISTS view_count BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS like_count BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS comment_count BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS metrics_updated_at TIMESTAMPTZ;
