-- Newsletter subscribers (written via API service role only).
--
-- Email is unique so re-subscribing is idempotent rather than creating
-- duplicates. Unsubscribes are kept as rows with unsubscribed_at set instead
-- of being deleted, so a later re-subscribe doesn't silently resurrect someone
-- who opted out and we retain proof of consent.
CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email           TEXT NOT NULL,
  user_id         UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  source          TEXT NOT NULL DEFAULT 'footer',
  -- Consent trail: what they agreed to and from where.
  consent_page_url TEXT,
  unsubscribed_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Case-insensitive uniqueness: Foo@x.com and foo@x.com are one subscriber.
-- The API lowercases before writing; this enforces it at the database too.
CREATE UNIQUE INDEX IF NOT EXISTS idx_newsletter_email_unique
  ON public.newsletter_subscribers (lower(email));

CREATE INDEX IF NOT EXISTS idx_newsletter_created_at
  ON public.newsletter_subscribers (created_at DESC);

-- Partial index for the common "who do we actually send to" query.
CREATE INDEX IF NOT EXISTS idx_newsletter_active
  ON public.newsletter_subscribers (created_at DESC)
  WHERE unsubscribed_at IS NULL;

ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;
