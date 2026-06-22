-- Ensure phone column exists on profiles (idempotent)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone TEXT;

-- Rewrite handle_new_user so it never fails on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url, phone)
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
    NEW.phone
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_subscriptions (user_id, plan_id, status)
  VALUES (NEW.id, 'free', 'active')
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log the error but don't block the signup
  RAISE WARNING 'handle_new_user error for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
