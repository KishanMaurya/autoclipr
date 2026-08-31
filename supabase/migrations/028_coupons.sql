-- Coupons and redemptions.
--
-- Division of responsibility: this schema owns *policy* — who may redeem a
-- code, how often, against which plans, and whether it is live. Dodo owns the
-- *money*: a percentage coupon is mirrored to a Dodo discount and the code is
-- handed to the hosted checkout, because the price is set by the product and
-- we cannot charge less from our side.
--
-- Type support is constrained by what Dodo can actually do:
--   percentage    mirrored to a Dodo discount (Dodo's only discount type)
--   free_trial    applied as trial_period_days on the subscription
--   free_credits  entirely ours — granted after activation, no Dodo involvement
--
-- Fixed-amount discounts are deliberately absent: Dodo's DiscountType is
-- 'percentage' only, so "₹100 off" cannot be enforced at checkout.

CREATE TABLE IF NOT EXISTS public.coupons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Dodo caps discount codes at 16 characters, so match that here rather than
  -- letting an admin create a code that cannot be mirrored.
  code TEXT NOT NULL CHECK (char_length(code) BETWEEN 3 AND 16),

  type TEXT NOT NULL CHECK (type IN ('percentage', 'free_trial', 'free_credits')),

  -- percentage: whole percent (20 = 20% off)
  -- free_trial: days
  -- free_credits: credits granted
  value INTEGER NOT NULL CHECK (value > 0),

  -- Explicit status rather than deriving from dates alone, so an admin has a
  -- kill switch that takes effect immediately with no deploy.
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'paused', 'expired', 'exhausted')),

  starts_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,

  -- NULL max_uses = unlimited.
  max_uses INTEGER CHECK (max_uses IS NULL OR max_uses > 0),
  used_count INTEGER NOT NULL DEFAULT 0 CHECK (used_count >= 0),
  max_uses_per_user INTEGER NOT NULL DEFAULT 1 CHECK (max_uses_per_user > 0),

  -- Empty array = every plan.
  applicable_plans TEXT[] NOT NULL DEFAULT '{}',

  -- 'private' codes are never listed to users; they must be typed in.
  visibility TEXT NOT NULL DEFAULT 'public'
    CHECK (visibility IN ('public', 'private')),

  -- Set for mirrored percentage coupons so the Dodo discount can be updated
  -- or deleted alongside ours.
  dodo_discount_id TEXT,

  description TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Codes are matched case-insensitively: a user typing "creator20" must hit
-- the same row as "CREATOR20", and neither may be created twice.
CREATE UNIQUE INDEX IF NOT EXISTS idx_coupons_code_unique
  ON public.coupons (upper(code));
CREATE INDEX IF NOT EXISTS idx_coupons_status ON public.coupons (status);

CREATE TABLE IF NOT EXISTS public.coupon_redemptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  coupon_id UUID NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,

  -- SET NULL rather than CASCADE: campaign totals must survive a user
  -- deleting their account.
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

  plan_id TEXT,
  -- What the discount was worth, in paise, so campaign ROI can be measured.
  discount_paise BIGINT NOT NULL DEFAULT 0,
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_coupon
  ON public.coupon_redemptions (coupon_id);
-- The per-user limit check counts this pair, so index it.
CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_coupon_user
  ON public.coupon_redemptions (coupon_id, user_id);

-- ─────────────────────────────────────────────────────────────────────────
-- Atomic redemption.
--
-- A public code is exactly the shape of the credits race we already hit:
-- N concurrent requests all read used_count, all see room, and all proceed,
-- so a "max 1000" coupon is redeemed several thousand times. As with credits,
-- a single conditional UPDATE takes a row lock and serialises them.
--
-- Returns the new used_count, or NULL when the coupon is exhausted, inactive,
-- outside its window, or the user has already hit their per-user limit.
-- ─────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION redeem_coupon_atomic(
  p_coupon_id UUID,
  p_user_id   UUID,
  p_plan_id   TEXT,
  p_discount_paise BIGINT DEFAULT 0
)
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp AS $$
DECLARE
  v_new_count INTEGER;
  v_per_user  INTEGER;
  v_used_by_user INTEGER;
BEGIN
  SELECT max_uses_per_user INTO v_per_user
  FROM public.coupons WHERE id = p_coupon_id;

  IF v_per_user IS NULL THEN
    RETURN NULL;  -- no such coupon
  END IF;

  SELECT count(*) INTO v_used_by_user
  FROM public.coupon_redemptions
  WHERE coupon_id = p_coupon_id AND user_id = p_user_id;

  IF v_used_by_user >= v_per_user THEN
    RETURN NULL;
  END IF;

  UPDATE public.coupons
  SET used_count = used_count + 1,
      updated_at = NOW()
  WHERE id = p_coupon_id
    AND status = 'active'
    AND (starts_at  IS NULL OR starts_at  <= NOW())
    AND (expires_at IS NULL OR expires_at >  NOW())
    AND (max_uses   IS NULL OR used_count <  max_uses)
  RETURNING used_count INTO v_new_count;

  IF v_new_count IS NULL THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.coupon_redemptions (coupon_id, user_id, plan_id, discount_paise)
  VALUES (p_coupon_id, p_user_id, p_plan_id, p_discount_paise);

  -- Flip to exhausted the moment the last use is taken, so the admin list
  -- reflects reality without waiting for a sweep.
  UPDATE public.coupons
  SET status = 'exhausted'
  WHERE id = p_coupon_id
    AND max_uses IS NOT NULL
    AND used_count >= max_uses;

  RETURN v_new_count;
END;
$$;

-- Per 025: Postgres grants EXECUTE to PUBLIC by default and PostgREST exposes
-- public-schema functions to anon/authenticated. Without this, anyone holding
-- the anon key could redeem coupons on any account.
REVOKE ALL ON FUNCTION public.redeem_coupon_atomic(uuid, uuid, text, bigint)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_coupon_atomic(uuid, uuid, text, bigint)
  TO service_role;

-- Admin-only tables. RLS on with no policies: anon and authenticated get
-- nothing, and the API reads them with the service_role key.
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_redemptions ENABLE ROW LEVEL SECURITY;
