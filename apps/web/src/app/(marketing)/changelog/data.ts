export type ChangeType = "feature" | "improvement" | "fix" | "security";

export interface ChangeItem {
  type: ChangeType;
  text: string;
}

export interface Release {
  version: string;
  date: string;
  badge?: string;
  badgeColor?: string;
  headline: string;
  description: string;
  changes: ChangeItem[];
  highlight?: boolean;
}

export const RELEASES: Release[] = [
  {
    version: "v1.4.0",
    date: "June 2025",
    badge: "Latest",
    badgeColor: "from-emerald-500 to-teal-400",
    headline: "Starter Plan is now free + 100 credits on signup",
    description:
      "We're making AutoClipr accessible to every creator. The Starter plan is now completely free with 100 credits included on signup — no credit card required.",
    highlight: true,
    changes: [
      { type: "feature", text: "Starter plan is now $0/month — free forever" },
      { type: "feature", text: "New signups receive 100 credits automatically" },
      { type: "feature", text: "20 clips/month included on the free tier" },
      { type: "improvement", text: "Onboarding flow redesigned for faster first clip" },
      { type: "improvement", text: "Welcome email sent on first sign-in with tips" },
      { type: "fix", text: "Fixed signup trigger error on new registrations" },
    ],
  },
  {
    version: "v1.3.0",
    date: "May 2025",
    badge: "Major",
    badgeColor: "from-violet-500 to-purple-400",
    headline: "YouTube Shorts embedded in hero + success stories redesign",
    description:
      "The hero now showcases real AutoClipr-generated clips from YouTube. The success stories page got a complete motion-first redesign with real creator photos.",
    changes: [
      { type: "feature", text: "Real YouTube Shorts autoplay in hero clip cards" },
      { type: "feature", text: "Success Stories page — 9 creator cards with real results" },
      { type: "feature", text: "Animated stat counters and staggered card animations" },
      { type: "improvement", text: "Hero stats bar redesigned with icons and hover glow" },
      { type: "improvement", text: "Coming Soon page replaces all 404 pages" },
      { type: "fix", text: "Fixed hero stats text truncating on mobile" },
    ],
  },
  {
    version: "v1.2.0",
    date: "April 2025",
    badge: "Auth",
    badgeColor: "from-blue-500 to-cyan-400",
    headline: "Custom email branding + profile photo improvements",
    description:
      "Confirmation and welcome emails now send from AutoClipr via Resend. Profile photo uploads were rewritten to support re-uploading without errors.",
    changes: [
      { type: "feature", text: "Welcome email sent from AutoClipr (not Supabase)" },
      { type: "feature", text: "Branded email confirmation template with AutoClipr design" },
      { type: "feature", text: "Email confirmation screen shown after signup (form hidden)" },
      { type: "improvement", text: "Profile photo re-upload now works without errors" },
      { type: "improvement", text: "Settings form now uses Sonner toast notifications" },
      { type: "fix", text: "Fixed resource-already-exists error on avatar upload" },
      { type: "fix", text: "Fixed welcome email not being received (30s window extended to 24h)" },
    ],
  },
  {
    version: "v1.1.0",
    date: "March 2025",
    headline: "Mobile menu overhaul + real YouTube creator data",
    description:
      "The mobile menu was rebuilt as a full-screen overlay and the Top Creators page now fetches real subscriber counts and profile pictures from YouTube API.",
    changes: [
      { type: "feature", text: "Full-screen mobile menu overlay with accordion sections" },
      { type: "feature", text: "Top Creators page fetches real YouTube data (subscribers, views, photos)" },
      { type: "feature", text: "Country flag emoji on channel detail pages" },
      { type: "feature", text: "Actual channel rankings on creator detail pages" },
      { type: "improvement", text: "YouTube API batch-fetched (1 call/hour) to minimise quota" },
      { type: "improvement", text: "Removed How it Works from main nav — moved into Resources dropdown" },
      { type: "fix", text: "Fixed mobile menu z-index bleeding through navbar" },
      { type: "fix", text: "Fixed channel detail page showing #1 ranking for every creator" },
    ],
  },
  {
    version: "v1.0.0",
    date: "February 2025",
    badge: "Launch",
    badgeColor: "from-rose-500 to-orange-400",
    headline: "AutoClipr launches — AI clip generation is live",
    description:
      "The first public release of AutoClipr. Monitor YouTube channels, auto-detect viral moments, generate short clips with captions, and export for TikTok, Reels & Shorts.",
    changes: [
      { type: "feature", text: "YouTube channel monitoring — detect uploads automatically" },
      { type: "feature", text: "AI viral moment detection across any niche" },
      { type: "feature", text: "Auto captions & subtitles on every clip" },
      { type: "feature", text: "9:16 export for TikTok, Reels & Shorts" },
      { type: "feature", text: "Dashboard with clip management and analytics" },
      { type: "feature", text: "Credit-based system — deducted per clip generated" },
      { type: "feature", text: "Google & email auth via Supabase" },
      { type: "security", text: "Row-level security on all user data" },
    ],
  },
];
