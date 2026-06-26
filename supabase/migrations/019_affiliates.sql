-- Add referral tracking to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referred_by TEXT;

-- ────────────────────────────────────────────────────────────────────────────
-- affiliates: one row per approved affiliate
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS affiliates (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID        REFERENCES profiles(id) ON DELETE CASCADE,
  ref_code             TEXT        UNIQUE NOT NULL,
  status               TEXT        NOT NULL DEFAULT 'pending',   -- pending | active | suspended
  commission_rate      INTEGER     NOT NULL DEFAULT 30,           -- 30 | 35 | 40
  total_clicks         INTEGER     NOT NULL DEFAULT 0,
  total_referrals      INTEGER     NOT NULL DEFAULT 0,
  total_conversions    INTEGER     NOT NULL DEFAULT 0,
  total_earnings_paise BIGINT      NOT NULL DEFAULT 0,
  total_paid_paise     BIGINT      NOT NULL DEFAULT 0,
  channel_url          TEXT,
  email                TEXT,
  applied_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_at          TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────────────────────
-- referrals: each user who signed up via an affiliate link
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS referrals (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id     UUID        NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  referred_user_id UUID        NOT NULL REFERENCES profiles(id)  ON DELETE CASCADE,
  status           TEXT        NOT NULL DEFAULT 'signed_up',  -- signed_up | converted | churned
  plan_id          TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  converted_at     TIMESTAMPTZ,
  UNIQUE(referred_user_id)  -- one affiliate per referred user
);

-- ────────────────────────────────────────────────────────────────────────────
-- affiliate_commissions: one row per payment that earns a commission
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS affiliate_commissions (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id    UUID        NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  referral_id     UUID        NOT NULL REFERENCES referrals(id)  ON DELETE CASCADE,
  amount_paise    BIGINT      NOT NULL,
  commission_rate INTEGER     NOT NULL,
  plan_id         TEXT,
  billing_period  TEXT,
  status          TEXT        NOT NULL DEFAULT 'pending',  -- pending | approved | paid
  transaction_id  TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────────────────────
-- affiliate_payouts: payout requests
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS affiliate_payouts (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id    UUID        NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  amount_paise    BIGINT      NOT NULL,
  status          TEXT        NOT NULL DEFAULT 'pending',  -- pending | processing | paid | failed
  payment_method  TEXT        NOT NULL DEFAULT 'paypal',
  payment_details TEXT,
  paid_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────────────────────
-- Row-Level Security
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE affiliates           ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals            ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_payouts    ENABLE ROW LEVEL SECURITY;

-- Users can read/update their own affiliate row
CREATE POLICY "affiliates_select_own" ON affiliates
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "affiliates_update_own" ON affiliates
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can read referrals that belong to their affiliate record
CREATE POLICY "referrals_select_own" ON referrals
  FOR SELECT USING (
    affiliate_id IN (SELECT id FROM affiliates WHERE user_id = auth.uid())
  );

-- Users can read commissions that belong to their affiliate record
CREATE POLICY "commissions_select_own" ON affiliate_commissions
  FOR SELECT USING (
    affiliate_id IN (SELECT id FROM affiliates WHERE user_id = auth.uid())
  );

-- Users can read payouts that belong to their affiliate record
CREATE POLICY "payouts_select_own" ON affiliate_payouts
  FOR SELECT USING (
    affiliate_id IN (SELECT id FROM affiliates WHERE user_id = auth.uid())
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_affiliates_ref_code    ON affiliates(ref_code);
CREATE INDEX IF NOT EXISTS idx_affiliates_user_id     ON affiliates(user_id);
CREATE INDEX IF NOT EXISTS idx_referrals_affiliate_id ON referrals(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_commissions_affiliate  ON affiliate_commissions(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_payouts_affiliate      ON affiliate_payouts(affiliate_id);
