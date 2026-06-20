export const MARKETING_FAQS = [
  {
    category: "Getting started",
    q: "How does AI clip generation work?",
    a: "AutoClipr analyzes your video's transcript and visual signals to detect high-engagement moments — hooks, emotional peaks, and punchlines. It then renders short clips with burned-in subtitles, optimized for 9:16 vertical formats like TikTok, Reels, and YouTube Shorts.",
  },
  {
    category: "Getting started",
    q: "How long does processing take?",
    a: "Most videos are processed in under 2 minutes. Longer videos (60+ minutes) may take up to 5 minutes. You'll receive an email notification as soon as your clips are ready.",
  },
  {
    category: "Credits & billing",
    q: "What are credits and how are they used?",
    a: "Credits are consumed when generating clips — 5 credits per clip by default. Your plan includes a monthly credit allowance that resets on your billing date. You can purchase top-up credits from the dashboard at any time without upgrading your plan.",
  },
  {
    category: "Credits & billing",
    q: "Do unused credits roll over?",
    a: "Yes — unused credits roll over for up to 3 months. After that, they expire. Top-up credits never expire once purchased.",
  },
  {
    category: "Credits & billing",
    q: "Can I cancel my subscription anytime?",
    a: "Absolutely. Cancel directly from your billing settings — no calls, no hoops. You keep access until the end of your current billing period.",
  },
  {
    category: "Platform & formats",
    q: "Which video formats are supported?",
    a: "You can upload MP4, MOV, and WebM files, or paste a YouTube URL directly. Exports default to 9:16 for Shorts/Reels/TikTok, with 16:9 and 1:1 also available on Creator and Business plans.",
  },
  {
    category: "Platform & formats",
    q: "Can I use Google login?",
    a: "Yes. Sign in with Google or email/password — both are supported. Google login is the fastest way to get started.",
  },
  {
    category: "Privacy & security",
    q: "Is my content secure?",
    a: "Your videos are stored in private, encrypted buckets with row-level security — only you can access your files. We never share or use your content to train AI models.",
  },
  {
    category: "Privacy & security",
    q: "Do you use my videos to train your AI?",
    a: "No. Your content is never used to train any AI model. Processing happens in isolated worker containers and raw video data is deleted after clip generation is complete.",
  },
] as const;
