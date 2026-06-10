-- URL import + viral shorts pipeline fields

ALTER TABLE public.videos
  ADD COLUMN IF NOT EXISTS source_url TEXT,
  ADD COLUMN IF NOT EXISTS source_type TEXT DEFAULT 'upload',
  ADD COLUMN IF NOT EXISTS analysis JSONB DEFAULT '{}'::jsonb;

ALTER TABLE public.clips
  ADD COLUMN IF NOT EXISTS viral_score INTEGER,
  ADD COLUMN IF NOT EXISTS duration_seconds INTEGER,
  ADD COLUMN IF NOT EXISTS caption_style TEXT,
  ADD COLUMN IF NOT EXISTS caption_language TEXT DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS platform_targets TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS export_quality TEXT DEFAULT 'hd',
  ADD COLUMN IF NOT EXISTS viral_metrics JSONB DEFAULT '{}'::jsonb;

NOTIFY pgrst, 'reload schema';
