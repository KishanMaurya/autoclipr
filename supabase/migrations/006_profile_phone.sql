-- Optional phone on profile (synced from Supabase auth for OTP users)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone TEXT;
