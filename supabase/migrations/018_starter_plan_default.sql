-- Make Starter the free default plan for all new signups
UPDATE public.subscription_plans
SET
  price_cents = 0,
  credits_per_month = 100,
  max_videos = 20,
  features = '["20 short clips / month","100 credits included","Fast mode up to 60s","AI viral moment detection","Auto captions & subtitles","Niche-specific templates","TikTok, Reels & Shorts export","Unlimited exports"]'
WHERE id = 'starter';

-- Update default credits on new profiles from 10 → 100
ALTER TABLE public.profiles
  ALTER COLUMN credits SET DEFAULT 100;

-- Migrate existing free-plan users to starter with 100 credits
UPDATE public.user_subscriptions
SET plan_id = 'starter'
WHERE plan_id = 'free';

UPDATE public.profiles
SET credits = 100, subscription_tier = 'starter'
WHERE subscription_tier = 'free' AND credits = 10;

-- Update the signup trigger to assign starter plan
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
    100,
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
