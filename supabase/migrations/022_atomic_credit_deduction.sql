-- Atomic credit deduction + refund.
--
-- Previously credits were spent via read-then-write from application code:
--   SELECT credits ... ; if (balance >= amount) UPDATE credits = balance - amount
-- That is racy — N concurrent requests all read the same balance, all pass the
-- check, and all proceed. Combined with the URL-import flow only *checking*
-- (never deducting) before enqueueing, a free user could burst-fire requests
-- and get several times more paid processing than their balance allowed.
--
-- A single UPDATE ... WHERE credits >= amount is safe: Postgres takes a row
-- lock, so concurrent statements serialize and each re-evaluates the WHERE
-- clause against the already-updated row. The balance can never go negative.

CREATE OR REPLACE FUNCTION deduct_credits_atomic(
  p_user_id      UUID,
  p_amount       INTEGER,
  p_reason       TEXT,
  p_reference_id UUID DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_new_balance INTEGER;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'deduct_credits_atomic: amount must be positive (got %)', p_amount;
  END IF;

  UPDATE public.profiles
  SET credits    = credits - p_amount,
      updated_at = NOW()
  WHERE id = p_user_id
    AND credits >= p_amount
  RETURNING credits INTO v_new_balance;

  -- NULL => no row matched: either the user doesn't exist, or the balance was
  -- insufficient. Caller treats this as a rejection; nothing was written.
  IF v_new_balance IS NULL THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.credit_transactions (user_id, amount, balance_after, reason, reference_id)
  VALUES (p_user_id, -p_amount, v_new_balance, p_reason, p_reference_id);

  RETURN v_new_balance;
END;
$$;

-- Credits are now taken up front, before the expensive pipeline runs, so work
-- that never completes has to be given back.
CREATE OR REPLACE FUNCTION refund_credits(
  p_user_id      UUID,
  p_amount       INTEGER,
  p_reason       TEXT,
  p_reference_id UUID DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_new_balance INTEGER;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'refund_credits: amount must be positive (got %)', p_amount;
  END IF;

  UPDATE public.profiles
  SET credits    = credits + p_amount,
      updated_at = NOW()
  WHERE id = p_user_id
  RETURNING credits INTO v_new_balance;

  IF v_new_balance IS NULL THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.credit_transactions (user_id, amount, balance_after, reason, reference_id)
  VALUES (p_user_id, p_amount, v_new_balance, p_reason, p_reference_id);

  RETURN v_new_balance;
END;
$$;

-- Defence in depth: even if some future code path bypasses the RPCs, the
-- balance can never go negative.
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_credits_non_negative;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_credits_non_negative CHECK (credits >= 0);

-- Lock these two down in the same breath as creating them.
--
-- Postgres grants EXECUTE to PUBLIC by default and Supabase PostgREST exposes
-- public-schema functions to anon/authenticated at /rest/v1/rpc/<name>. Left
-- alone, refund_credits would let anyone holding the public anon key top up
-- their own balance without limit — undoing the very loophole this migration
-- exists to close — and deduct_credits_atomic would let them drain someone
-- else's. Only the API's service_role should ever call either.
--
-- 025 repeats this for the affiliate functions; it is duplicated here so that
-- applying 022 on its own can never leave the hole open.

ALTER FUNCTION public.refund_credits(uuid, integer, text, uuid)
  SET search_path = public, pg_temp;
ALTER FUNCTION public.deduct_credits_atomic(uuid, integer, text, uuid)
  SET search_path = public, pg_temp;

REVOKE ALL ON FUNCTION public.refund_credits(uuid, integer, text, uuid)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.deduct_credits_atomic(uuid, integer, text, uuid)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.refund_credits(uuid, integer, text, uuid)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.deduct_credits_atomic(uuid, integer, text, uuid)
  TO service_role;
