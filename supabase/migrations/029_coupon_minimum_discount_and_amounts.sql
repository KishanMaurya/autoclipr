-- Minimum discount floor, and the amounts a redemption was worth.
--
-- 1. Percentage coupons must be at least 25%.
--
--    Added NOT VALID on purpose. A plain CHECK would refuse to apply while any
--    existing row violates it, and CREATOR15 (15%) is already live with a
--    mirrored Dodo discount. NOT VALID skips the one-time scan of existing
--    rows but still enforces the rule on every INSERT and UPDATE from now on —
--    so the floor is guaranteed at the database level for everything new,
--    while the coupon already in circulation keeps working.
--
--    To enforce it retroactively later, once no sub-25% coupon is live:
--      UPDATE public.coupons SET status = 'expired'
--       WHERE type = 'percentage' AND value < 25;
--      ALTER TABLE public.coupons VALIDATE CONSTRAINT coupons_min_percentage;
--
--    The floor applies only to percentage coupons: `value` means days for
--    free_trial and credits for free_credits, where 25 is meaningless.

ALTER TABLE public.coupons
  DROP CONSTRAINT IF EXISTS coupons_min_percentage;

ALTER TABLE public.coupons
  ADD CONSTRAINT coupons_min_percentage
  CHECK (type <> 'percentage' OR (value >= 25 AND value <= 100))
  NOT VALID;

-- 2. What each redemption was actually worth.
--
-- discount_paise alone cannot answer "how much revenue did this campaign
-- bring in" — that needs the original price and what was actually paid.
ALTER TABLE public.coupon_redemptions
  ADD COLUMN IF NOT EXISTS subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS discount_percentage INTEGER,
  ADD COLUMN IF NOT EXISTS original_amount_paise BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS final_amount_paise BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'INR';

COMMENT ON COLUMN public.coupon_redemptions.discount_paise IS
  'What the discount was worth. original_amount_paise - discount_paise = final_amount_paise.';
COMMENT ON COLUMN public.coupon_redemptions.subscription_id IS
  'The Dodo subscription this discount was applied to, for reconciliation.';

-- The redemption RPC gains the amount arguments. Signature changes, so the old
-- one is dropped rather than replaced — CREATE OR REPLACE cannot change a
-- function''s argument list.
DROP FUNCTION IF EXISTS redeem_coupon_atomic(uuid, uuid, text, bigint);

CREATE OR REPLACE FUNCTION redeem_coupon_atomic(
  p_coupon_id UUID,
  p_user_id   UUID,
  p_plan_id   TEXT,
  p_discount_paise BIGINT DEFAULT 0,
  p_original_paise BIGINT DEFAULT 0,
  p_final_paise    BIGINT DEFAULT 0,
  p_currency       TEXT   DEFAULT 'INR',
  p_subscription_id TEXT  DEFAULT NULL,
  p_discount_percentage INTEGER DEFAULT NULL
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

  -- The single conditional UPDATE is the whole point: it takes a row lock, so
  -- concurrent claims serialise and each re-evaluates the cap against the
  -- already-updated row. A read-then-write here would let a 500-use coupon be
  -- redeemed thousands of times.
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

  INSERT INTO public.coupon_redemptions (
    coupon_id, user_id, plan_id, discount_paise,
    original_amount_paise, final_amount_paise, currency,
    subscription_id, discount_percentage
  )
  VALUES (
    p_coupon_id, p_user_id, p_plan_id, p_discount_paise,
    p_original_paise, p_final_paise, p_currency,
    p_subscription_id, p_discount_percentage
  );

  UPDATE public.coupons
  SET status = 'exhausted'
  WHERE id = p_coupon_id
    AND max_uses IS NOT NULL
    AND used_count >= max_uses;

  RETURN v_new_count;
END;
$$;

-- Per 025: Postgres grants EXECUTE to PUBLIC by default and PostgREST exposes
-- public-schema functions to anon/authenticated.
REVOKE ALL ON FUNCTION redeem_coupon_atomic(uuid, uuid, text, bigint, bigint, bigint, text, text, integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION redeem_coupon_atomic(uuid, uuid, text, bigint, bigint, bigint, text, text, integer)
  TO service_role;
