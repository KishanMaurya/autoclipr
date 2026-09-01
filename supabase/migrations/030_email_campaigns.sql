-- Email campaigns and their recipients.
--
-- Built for a job that must be safe to run twice. Two constraints carry that:
--
--   campaigns      UNIQUE (type, scheduled_for)
--     A second run on the same Saturday finds the existing campaign instead of
--     starting a new one.
--
--   recipients     UNIQUE (campaign_id, user_id)
--     A user can only be enrolled once per campaign, so a re-run cannot queue
--     them again.
--
-- Sending is claim-then-send: the recipient row is inserted first with
-- sent_at NULL, then the email goes out, then sent_at is stamped. A crash
-- between the two leaves a claimed-but-unsent row, which the next run retries
-- because it filters on sent_at IS NULL. The alternative — send first, record
-- after — double-sends on every retry.

CREATE TABLE IF NOT EXISTS public.email_campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'saturday_offer',

  -- The coupon being advertised. RESTRICT, not CASCADE: deleting a coupon
  -- must not erase the campaign that promoted it.
  coupon_id UUID REFERENCES public.coupons(id) ON DELETE RESTRICT,

  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'running', 'completed', 'failed', 'skipped')),

  -- The date this campaign is for, not when it happened to run. Two runs on
  -- the same Saturday share one campaign.
  scheduled_for DATE NOT NULL,

  -- Why a run sent nothing, e.g. no active coupon to advertise.
  skip_reason TEXT,

  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_email_campaigns_type_date
  ON public.email_campaigns (type, scheduled_for);

CREATE TABLE IF NOT EXISTS public.email_campaign_recipients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  campaign_id UUID NOT NULL REFERENCES public.email_campaigns(id) ON DELETE CASCADE,

  -- SET NULL rather than CASCADE so campaign totals survive account deletion.
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

  -- Kept independently of the profile: the record must still say who was
  -- contacted after the account is gone.
  email TEXT NOT NULL,

  sent_at TIMESTAMPTZ,
  -- delivered/opened only ever populate if the provider posts webhooks back;
  -- the columns exist so that wiring is additive.
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  redeemed_at TIMESTAMPTZ,
  converted_at TIMESTAMPTZ,

  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- The idempotency guarantee.
CREATE UNIQUE INDEX IF NOT EXISTS idx_campaign_recipients_unique
  ON public.email_campaign_recipients (campaign_id, user_id);

-- The job's own query: claimed rows that still need sending.
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_pending
  ON public.email_campaign_recipients (campaign_id)
  WHERE sent_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_campaign_recipients_user
  ON public.email_campaign_recipients (user_id);

-- Admin-only data: RLS on with no policies means anon and authenticated get
-- nothing, and the API reads it with the service_role key.
ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_campaign_recipients ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.email_campaign_recipients IS
  'One row per user per campaign. sent_at NULL means claimed but not yet sent — the next run retries those.';
