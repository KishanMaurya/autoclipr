-- Add per-user email notification preference to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS email_notifications_enabled boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN profiles.email_notifications_enabled IS
  'When false, AutoClipr will not send transactional email notifications to this user.';
