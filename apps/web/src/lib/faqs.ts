export const MARKETING_FAQS = [
  {
    q: "How does AI clip generation work?",
    a: "AutoClipr analyzes your video transcript and visual signals to find high-engagement segments, then renders short clips with optional burned-in subtitles.",
  },
  {
    q: "What are credits?",
    a: "Credits are consumed when generating clips (5 credits per clip by default). Your plan includes a monthly credit allowance.",
  },
  {
    q: "Can I use Google login?",
    a: "Yes. Sign in with Google or email/password via Supabase Auth.",
  },
  {
    q: "Which formats are supported?",
    a: "MP4, MOV, and WebM uploads. Exports default to 9:16 for Shorts/Reels/TikTok.",
  },
  {
    q: "Is my content secure?",
    a: "Videos are stored in private Supabase buckets with row-level security. Only you can access your files.",
  },
] as const;
