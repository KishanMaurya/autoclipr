-- Lock down every SECURITY DEFINER function.
--
-- Postgres grants EXECUTE on a new function to PUBLIC by default, and Supabase
-- PostgREST exposes public-schema functions at /rest/v1/rpc/<name> to the anon
-- and authenticated roles. The anon key is public — it ships in the browser
-- bundle. SECURITY DEFINER means these run as the owner and bypass RLS.
--
-- So until this migration runs, anyone holding the anon key can call:
--
--   add_affiliate_earnings(<any affiliate id>, 99999999)   → real payouts
--   increment_affiliate_clicks/referrals(<any affiliate>)  → falsified stats
--   refund_credits(<their own id>, 999999, 'x')            → unlimited credits
--   deduct_credits_atomic(<someone else's id>, 9999, 'x')  → drain their balance
--
-- These are only ever called by the API using the service_role key, so nothing
-- else needs EXECUTE.
--
-- Idempotent and order-independent: each function is skipped if it does not
-- exist yet, so this runs safely before or after 022.

DO $$
DECLARE
  fn TEXT;
  fns TEXT[] := ARRAY[
    'public.refund_credits(uuid, integer, text, uuid)',
    'public.deduct_credits_atomic(uuid, integer, text, uuid)',
    'public.add_affiliate_earnings(uuid, bigint)',
    'public.increment_affiliate_clicks(uuid)',
    'public.increment_affiliate_referrals(uuid)'
  ];
BEGIN
  FOREACH fn IN ARRAY fns LOOP
    -- to_regprocedure returns NULL rather than raising when the function is
    -- absent, which is what makes this safe to run in any order.
    IF to_regprocedure(fn) IS NULL THEN
      RAISE NOTICE 'skipping %, not present yet', fn;
      CONTINUE;
    END IF;

    -- A SECURITY DEFINER function resolves unqualified names through the
    -- caller's search_path unless it is pinned here.
    EXECUTE format('ALTER FUNCTION %s SET search_path = public, pg_temp', fn);

    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', fn);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', fn);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM authenticated', fn);

    -- The API's service_role is the only intended caller. It loses access
    -- along with PUBLIC above, so grant it back explicitly.
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', fn);

    RAISE NOTICE 'locked down %', fn;
  END LOOP;
END $$;

-- Verification — every row should show grantee service_role (plus the owner).
-- A NULL grantee means the default PUBLIC grant is still in place.
--
--   SELECT p.proname, p.prosecdef, p.proconfig, r.rolname AS grantee
--   FROM pg_proc p
--   JOIN pg_namespace n ON n.oid = p.pronamespace
--   LEFT JOIN LATERAL aclexplode(p.proacl) a ON true
--   LEFT JOIN pg_roles r ON r.oid = a.grantee
--   WHERE n.nspname = 'public' AND p.prosecdef
--   ORDER BY 1, 4;
