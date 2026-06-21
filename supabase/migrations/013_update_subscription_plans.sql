-- Remove old plans and insert the current Autoclipr pricing tiers
DELETE FROM public.subscription_plans WHERE id IN ('free', 'starter', 'pro', 'enterprise');

INSERT INTO public.subscription_plans (id, name, price_cents, credits_per_month, max_videos, features, active)
VALUES
  (
    'starter',
    'Starter',
    0,
    100,
    20,
    '["20 short clips / month","100 credits included","Fast mode up to 60s","AI viral moment detection","Auto captions & subtitles","Niche-specific templates","TikTok, Reels & Shorts export","Unlimited exports"]',
    true
  ),
  (
    'creator',
    'Creator',
    34900,
    500,
    90,
    '["90 short clips / month","500 credits included","Fast + Pro rendering modes","AI clip scoring & highlights","Short-form video templates","Auto captions & subtitles","Brand kits","Priority exports + faster queue","Multi-platform publishing","Unlimited exports"]',
    true
  ),
  (
    'business',
    'Business',
    174900,
    1200,
    200,
    '["200 short clips / month","1200 credits included","All rendering modes unlocked","AI Shorts creator","Auto captions & subtitles","Team access + commercial rights","Priority rendering queue","Advanced brand kits","Bulk video creation","Analytics & performance tracking","Unlimited exports"]',
    true
  )
ON CONFLICT (id) DO UPDATE
  SET
    name              = EXCLUDED.name,
    price_cents       = EXCLUDED.price_cents,
    credits_per_month = EXCLUDED.credits_per_month,
    max_videos        = EXCLUDED.max_videos,
    features          = EXCLUDED.features,
    active            = EXCLUDED.active;
