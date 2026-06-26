-- Atomic increment helpers for affiliate counters
-- These are called from the NestJS API via supabase.rpc()

CREATE OR REPLACE FUNCTION increment_affiliate_clicks(aff_id UUID)
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE affiliates SET total_clicks = total_clicks + 1, updated_at = NOW()
  WHERE id = aff_id;
$$;

CREATE OR REPLACE FUNCTION increment_affiliate_referrals(aff_id UUID)
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE affiliates SET total_referrals = total_referrals + 1, updated_at = NOW()
  WHERE id = aff_id;
$$;

CREATE OR REPLACE FUNCTION add_affiliate_earnings(aff_id UUID, earned BIGINT)
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE affiliates
  SET total_earnings_paise = total_earnings_paise + earned,
      total_conversions    = total_conversions + 1,
      updated_at           = NOW()
  WHERE id = aff_id;
$$;
