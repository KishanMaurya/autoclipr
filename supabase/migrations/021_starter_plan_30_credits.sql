-- Reduce Starter (free) plan credits from 100 → 30 to improve conversion to paid plans.
-- Only affects future signups; existing users' current credit balances are left untouched.

UPDATE public.subscription_plans
SET
  credits_per_month = 30,
  features = '["20 short clips / month","30 credits included","Fast mode up to 60s","AI viral moment detection","Auto captions & subtitles","Niche-specific templates","TikTok, Reels & Shorts export","Unlimited exports"]'
WHERE id = 'starter';

-- Update default credits on new profiles from 100 → 30
ALTER TABLE public.profiles
  ALTER COLUMN credits SET DEFAULT 30;

-- Update the signup trigger to grant 30 credits instead of 100
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url, phone, credits, subscription_tier)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    COALESCE(
      NEW.raw_user_meta_data->>'avatar_url',
      CASE
        WHEN NEW.phone IS NOT NULL THEN
          CASE
            WHEN (RIGHT(regexp_replace(COALESCE(NEW.phone, ''), '\D', '', 'g'), 1)::int % 2) = 0
              THEN '👧'
            ELSE '👦'
          END
        ELSE NULL
      END
    ),
    NEW.phone,
    30,
    'starter'
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_subscriptions (user_id, plan_id, status)
  VALUES (NEW.id, 'starter', 'active')
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'handle_new_user error for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
