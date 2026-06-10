-- Replace phone emoji avatars with boy/girl avatars

UPDATE public.profiles
SET
  avatar_url = CASE
    WHEN (RIGHT(regexp_replace(phone, '\D', '', 'g'), 1)::int % 2) = 0 THEN '👧'
    ELSE '👦'
  END,
  updated_at = NOW()
WHERE phone IS NOT NULL
  AND phone <> ''
  AND (avatar_url IS NULL OR avatar_url = '' OR avatar_url = '📱');

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  phone_digits TEXT;
BEGIN
  phone_digits := regexp_replace(COALESCE(NEW.phone, ''), '\D', '', 'g');

  INSERT INTO public.profiles (id, email, full_name, avatar_url, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    COALESCE(
      NULLIF(NEW.raw_user_meta_data->>'avatar_url', ''),
      CASE
        WHEN NEW.phone IS NOT NULL AND phone_digits <> '' THEN
          CASE
            WHEN (RIGHT(phone_digits, 1)::int % 2) = 0 THEN '👧'
            ELSE '👦'
          END
        WHEN NEW.phone IS NOT NULL THEN '👦'
        ELSE NULL
      END
    ),
    NEW.phone
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_subscriptions (user_id, plan_id, status)
  VALUES (NEW.id, 'free', 'active')
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
