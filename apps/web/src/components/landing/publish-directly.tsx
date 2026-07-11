"use client";

import Link from "next/link";
import { Reveal, Stagger } from "@/components/ui/motion";

/* ─── Platform brand colours ─── */
const YT_RED = "#FF0000";
const IG_GRAD = "linear-gradient(135deg,#f09433 0%,#e6683c 25%,#dc2743 50%,#cc2366 75%,#bc1888 100%)";
const TT_BLACK = "#010101";
const FB_BLUE = "#1877F2";
const LI_BLUE = "#0A66C2";

/* ─── Platform mock previews (pure SVG / CSS — no images needed) ─── */

function YoutubeMockup() {
  return (
    <div className="relative mx-auto w-full max-w-[340px]">
      {/* phone shell */}
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black aspect-[9/16]">
        {/* video bg */}
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-800 to-zinc-950" />
        {/* progress bar */}
        <div className="absolute bottom-0 left-0 h-1 w-full bg-white/10">
          <div className="h-full w-[62%] bg-red-500" />
        </div>
        {/* shorts ui */}
        <div className="absolute inset-0 flex flex-col justify-between p-4">
          {/* top bar */}
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold tracking-widest text-white/70">SHORTS</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M6 18L18 6M6 6l12 12" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>
          </div>
          {/* right actions */}
          <div className="absolute right-3 bottom-16 flex flex-col items-center gap-5">
            {[
              <svg key="like" width="22" height="22" viewBox="0 0 24 24" fill="white"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>,
              <svg key="cmt" width="22" height="22" viewBox="0 0 24 24" fill="white"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
              <svg key="share" width="22" height="22" viewBox="0 0 24 24" fill="white"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>,
            ]}
            <div className="mt-1 h-8 w-8 overflow-hidden rounded-full border-2 border-white bg-red-500 flex items-center justify-center">
              <span className="text-[8px] font-bold text-white">AC</span>
            </div>
          </div>
          {/* bottom info */}
          <div className="mt-auto">
            <p className="text-[11px] font-semibold text-white mb-1">@autoclipr</p>
            <p className="text-[10px] text-white/70 leading-tight line-clamp-2">
              This one productivity hack changed everything for me 🔥 #shorts #viral
            </p>
          </div>
        </div>
        {/* YouTube logo */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-1">
          <svg width="14" height="10" viewBox="0 0 24 17"><path d="M23.5 2.5S23.2.7 22.4.0C21.5-.8 20.5-.8 20 -.7 16.7 -.5 12 -.5 12 -.5s-4.7 0-8-.2C3.5-.8 2.5-.8 1.6-.0.8.7.5 2.5.5 2.5S.2 4.6.2 6.7v2c0 2.1.3 4.2.3 4.2s.3 1.8 1.1 2.5c.9.8 2.1.8 2.6.9C5.9 16.5 12 16.5 12 16.5s4.7 0 8-.2c.5-.1 1.5-.1 2.4-.9.8-.7 1.1-2.5 1.1-2.5s.3-2.1.3-4.2v-2c0-2.1-.3-4.2-.3-4.2zM9.7 11.5V5l6.5 3.3-6.5 3.2z" fill="white"/></svg>
        </div>
      </div>
      {/* glow */}
      <div className="absolute -inset-2 rounded-3xl blur-xl opacity-20" style={{ background: YT_RED }} />
    </div>
  );
}

function InstagramMockup() {
  return (
    <div className="relative mx-auto w-full max-w-[300px]">
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black aspect-[9/16]">
        <div className="absolute inset-0 bg-gradient-to-b from-purple-950/60 to-zinc-950" />
        {/* top bar */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-3 py-2.5">
          <span className="text-[11px] font-bold text-white" style={{ fontFamily: "serif" }}>Reels</span>
          <div className="flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
          </div>
        </div>
        {/* right actions */}
        <div className="absolute right-2.5 bottom-20 flex flex-col items-center gap-4">
          <div className="flex flex-col items-center gap-0.5">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
            <span className="text-[9px] text-white/70">24.5K</span>
          </div>
          <div className="flex flex-col items-center gap-0.5">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            <span className="text-[9px] text-white/70">843</span>
          </div>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
        </div>
        {/* bottom info */}
        <div className="absolute bottom-3 left-3 right-10">
          <p className="text-[10px] font-semibold text-white mb-0.5">autoclipr.ai</p>
          <p className="text-[9px] text-white/60 leading-tight">Turn videos into viral reels instantly ✨ #reels #creator</p>
          <div className="mt-1.5 flex items-center gap-1">
            <div className="h-3 w-3 rounded-full bg-gradient-to-br from-pink-500 to-orange-400" />
            <span className="text-[9px] text-white/50">Original audio · autoclipr</span>
          </div>
        </div>
        {/* IG gradient overlay subtle */}
        <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 50%)" }} />
      </div>
      <div className="absolute -inset-2 rounded-3xl blur-xl opacity-20" style={{ background: "linear-gradient(135deg,#f09433,#bc1888)" }} />
    </div>
  );
}

function TikTokMockup() {
  return (
    <div className="relative mx-auto w-full max-w-[280px]">
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black aspect-[9/16]">
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-900 to-black" />
        {/* tiktok header */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-center gap-6 px-3 py-2.5">
          <span className="text-[10px] text-white/40">Following</span>
          <span className="text-[10px] font-bold text-white border-b border-white pb-0.5">For You</span>
          <span className="text-[10px] text-white/40">LIVE</span>
        </div>
        {/* right actions */}
        <div className="absolute right-2 bottom-20 flex flex-col items-center gap-4">
          <div className="h-8 w-8 rounded-full bg-zinc-700 border-2 border-white flex items-center justify-center">
            <span className="text-[7px] font-bold text-white">AC</span>
          </div>
          <div className="flex flex-col items-center gap-0.5">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
            <span className="text-[9px] text-white/70">312K</span>
          </div>
          <div className="flex flex-col items-center gap-0.5">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            <span className="text-[9px] text-white/70">4.2K</span>
          </div>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2" fill="white" stroke="none"/></svg>
        </div>
        {/* bottom info */}
        <div className="absolute bottom-4 left-3 right-10">
          <p className="text-[10px] font-semibold text-white mb-0.5">@autoclipr</p>
          <p className="text-[9px] text-white/60 leading-tight">#fyp #viral #shorts #ai #contentcreator</p>
          <div className="mt-1 flex items-center gap-1">
            <div className="h-3 w-3 rounded-full" style={{ background: TT_BLACK, border: "1px solid #fff" }} />
            <span className="text-[9px] text-white/50">Original sound - autoclipr</span>
          </div>
        </div>
        {/* tiktok gradient */}
        <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 45%)" }} />
        {/* coming soon overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-[2px]">
          <span className="rounded-full bg-white/10 border border-white/20 px-4 py-1.5 text-xs font-semibold text-white/80 tracking-wide">Coming Soon</span>
        </div>
      </div>
      <div className="absolute -inset-2 rounded-3xl blur-xl opacity-10" style={{ background: "#69C9D0" }} />
    </div>
  );
}

function FacebookMockup() {
  return (
    <div className="relative mx-auto w-full max-w-[280px]">
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#18191A] aspect-[9/16]">
        {/* header */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-3 py-2" style={{ background: "#18191A" }}>
          <svg width="80" height="16" viewBox="0 0 90 18"><text y="14" fontSize="14" fontWeight="700" fill="#1877F2" fontFamily="sans-serif">Reels</text></svg>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#B0B3B8" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        </div>
        {/* video bg */}
        <div className="absolute inset-0 mt-8 bg-gradient-to-b from-zinc-800 to-zinc-950" />
        {/* right actions */}
        <div className="absolute right-2 bottom-20 flex flex-col items-center gap-4">
          <div className="flex flex-col items-center gap-0.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
            </div>
            <span className="text-[9px] text-white/60">15K</span>
          </div>
          <div className="flex flex-col items-center gap-0.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            </div>
            <span className="text-[9px] text-white/60">392</span>
          </div>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2" fill="white" stroke="none"/></svg>
          </div>
        </div>
        {/* bottom */}
        <div className="absolute bottom-4 left-3 right-10">
          <div className="flex items-center gap-1.5 mb-1">
            <div className="h-5 w-5 rounded-full flex items-center justify-center text-white text-[8px] font-bold" style={{ background: FB_BLUE }}>AC</div>
            <span className="text-[10px] font-semibold text-white">AutoClipr</span>
          </div>
          <p className="text-[9px] text-white/60 leading-tight">AI that finds your best moments automatically 🚀</p>
        </div>
        <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 50%)" }} />
      </div>
      <div className="absolute -inset-2 rounded-3xl blur-xl opacity-15" style={{ background: FB_BLUE }} />
    </div>
  );
}

function LinkedInMockup() {
  return (
    <div className="relative mx-auto w-full max-w-[320px]">
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#1B1F23] aspect-[4/3]">
        {/* LinkedIn post card */}
        <div className="absolute inset-0 flex flex-col p-4">
          {/* header */}
          <div className="flex items-start gap-2 mb-3">
            <div className="h-9 w-9 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0" style={{ background: LI_BLUE }}>AC</div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold text-white leading-tight">AutoClipr</p>
              <p className="text-[9px] text-white/40 leading-tight">AI Video Platform · 2,847 followers</p>
              <p className="text-[9px] text-white/30 mt-0.5">2h · 🌐</p>
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
          </div>
          {/* post text */}
          <p className="text-[10px] text-white/60 leading-relaxed mb-3 line-clamp-3">
            We just launched AI-powered short-form video clipping 🚀<br/>
            Paste any YouTube link → get viral clips in minutes.<br/>
            <span className="text-[#0A66C2]">#ContentMarketing #AI #VideoMarketing</span>
          </p>
          {/* video thumbnail */}
          <div className="flex-1 rounded-lg overflow-hidden bg-gradient-to-br from-zinc-700 to-zinc-900 flex items-center justify-center min-h-0">
            <div className="flex flex-col items-center gap-1">
              <div className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="white"><polygon points="5,3 19,12 5,21"/></svg>
              </div>
              <span className="text-[8px] text-white/30">autoclipr.com</span>
            </div>
          </div>
          {/* reactions */}
          <div className="flex items-center justify-between mt-3 pt-2 border-t border-white/8">
            <div className="flex items-center gap-1">
              <div className="flex -space-x-1">
                <span className="text-[10px]">👍</span><span className="text-[10px]">❤️</span><span className="text-[10px]">🔥</span>
              </div>
              <span className="text-[9px] text-white/30 ml-1">1.2K</span>
            </div>
            <span className="text-[9px] text-white/30">84 comments · 231 reposts</span>
          </div>
        </div>
      </div>
      <div className="absolute -inset-2 rounded-3xl blur-xl opacity-15" style={{ background: LI_BLUE }} />
    </div>
  );
}

/* ─── Card configs ─── */
const CARDS = [
  {
    id: "youtube",
    label: "YouTube Shorts",
    badge: null,
    badgeComingSoon: false,
    icon: (
      <svg width="28" height="28" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill={YT_RED}/><polygon points="13,10 13,22 23,16" fill="#fff"/></svg>
    ),
    accent: "text-red-400",
    glow: "rgba(239,68,68,0.12)",
    border: "hover:border-red-500/30",
    desc: "AutoClipr detects your top moments and publishes vertical clips directly to YouTube Shorts — with captions already burned in.",
    tags: ["Auto-publish", "9:16 crop", "Viral score"],
    mockup: <YoutubeMockup />,
    wide: true,
  },
  {
    id: "instagram",
    label: "Instagram Reels",
    badge: "NEW",
    badgeComingSoon: false,
    icon: (
      <svg width="28" height="28" viewBox="0 0 32 32">
        <defs><linearGradient id="ig2" x1="0%" y1="100%" x2="100%" y2="0%"><stop offset="0%" stopColor="#f09433"/><stop offset="50%" stopColor="#dc2743"/><stop offset="100%" stopColor="#bc1888"/></linearGradient></defs>
        <rect width="32" height="32" rx="8" fill="url(#ig2)"/>
        <rect x="9" y="9" width="14" height="14" rx="4" fill="none" stroke="#fff" strokeWidth="1.5"/>
        <circle cx="16" cy="16" r="3.5" fill="none" stroke="#fff" strokeWidth="1.5"/>
        <circle cx="21.5" cy="10.5" r="1" fill="#fff"/>
      </svg>
    ),
    accent: "text-pink-400",
    glow: "rgba(236,72,153,0.12)",
    border: "hover:border-pink-500/30",
    desc: "Push Reels directly from AutoClipr to your Instagram page. Hook optimised, caption-ready, tap to post.",
    tags: ["Direct publish", "Reel format", "Auto-caption"],
    mockup: <InstagramMockup />,
    wide: false,
  },
  {
    id: "tiktok",
    label: "TikTok",
    badge: null,
    badgeComingSoon: true,
    icon: (
      <svg width="28" height="28" viewBox="0 0 32 32">
        <rect width="32" height="32" rx="8" fill={TT_BLACK}/>
        <path d="M21.5 6a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 1 1-2.89-2.89c.28 0 .54.04.79.1V9.01a6.34 6.34 0 1 0 5.54 6.33V8.69a8.19 8.19 0 0 0 4.78 1.52V6.76a4.85 4.85 0 0 1-1-.07" fill="white" transform="translate(4,4) scale(0.75)"/>
      </svg>
    ),
    accent: "text-cyan-400",
    glow: "rgba(34,211,238,0.08)",
    border: "hover:border-cyan-500/20",
    desc: "TikTok publishing is on its way. AutoClipr will auto-detect trending audio hooks and post your clips at peak hours.",
    tags: ["Trending hooks", "Peak-hour post", "Auto-hashtags"],
    mockup: <TikTokMockup />,
    wide: false,
  },
  {
    id: "facebook",
    label: "Facebook Reels",
    badge: null,
    badgeComingSoon: true,
    icon: (
      <svg width="28" height="28" viewBox="0 0 32 32">
        <rect width="32" height="32" rx="8" fill={FB_BLUE}/>
        <path d="M20 16h-3v8h-4v-8h-2v-4h2v-2.5C13 7.5 14.5 6 17 6h3v4h-2c-.6 0-1 .4-1 1V12h3l-.5 4z" fill="white"/>
      </svg>
    ),
    accent: "text-blue-400",
    glow: "rgba(59,130,246,0.08)",
    border: "hover:border-blue-500/20",
    desc: "Facebook Reels reach billions. AutoClipr will let you schedule and post clips to your Facebook page in one click.",
    tags: ["Schedule posts", "Page publishing", "Reach billions"],
    mockup: <FacebookMockup />,
    wide: false,
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    badge: null,
    badgeComingSoon: true,
    icon: (
      <svg width="28" height="28" viewBox="0 0 32 32">
        <rect width="32" height="32" rx="8" fill={LI_BLUE}/>
        <path d="M9 12h3v11H9zm1.5-4.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3zM14 12h3v1.5c.5-.9 1.7-1.7 3.5-1.7 3.3 0 4 2.2 4 5v6h-3v-5.3c0-1.3 0-3-1.8-3-1.9 0-2.2 1.5-2.2 3V23h-3V12z" fill="white"/>
      </svg>
    ),
    accent: "text-sky-400",
    glow: "rgba(10,102,194,0.12)",
    border: "hover:border-sky-500/20",
    desc: "Repurpose long-form content into punchy LinkedIn videos. AutoClipr will post clips with professional captions directly to your company page.",
    tags: ["Company page", "Professional clips", "B2B reach"],
    mockup: <LinkedInMockup />,
    wide: false,
  },
];

function PlatformCard({ card }: { card: typeof CARDS[number] }) {
  return (
    <div
      className={`group relative flex flex-col overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0d0d18] transition-all duration-300 ${card.border} ${card.wide ? "lg:col-span-2" : ""}`}
      style={{ boxShadow: `0 0 0 0 ${card.glow}` }}
    >
      {/* hover glow bg */}
      <div
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100 rounded-2xl"
        style={{ background: `radial-gradient(600px circle at 50% 0%, ${card.glow}, transparent 70%)` }}
      />

      {/* Mockup preview */}
      <div className={`relative flex items-end justify-center overflow-hidden bg-gradient-to-b from-white/[0.03] to-transparent ${card.wide ? "h-64 lg:h-72" : "h-56"} px-6 pt-8`}>
        <div className="w-full">{card.mockup}</div>
      </div>

      {/* Card content */}
      <div className="relative flex flex-col flex-1 p-6">
        {/* badges */}
        <div className="mb-3 flex items-center gap-2">
          {card.icon}
          <span className={`text-base font-bold ${card.accent}`}>{card.label}</span>
          {card.badge && (
            <span className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-white"
              style={{ background: IG_GRAD }}>
              {card.badge}
            </span>
          )}
          {card.badgeComingSoon && (
            <span className="rounded-full border border-white/15 bg-white/8 px-2 py-0.5 text-[10px] font-medium text-white/50">
              Coming soon
            </span>
          )}
        </div>

        <p className="mb-4 text-sm leading-relaxed text-white/50">{card.desc}</p>

        {/* tags */}
        <div className="mt-auto flex flex-wrap gap-2">
          {card.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-white/[0.06] px-3 py-1 text-[11px] font-medium text-white/40"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export function PublishDirectly() {
  return (
    <section className="relative border-t border-white/5 px-4 py-24 sm:px-6 overflow-hidden">
      {/* background glows */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/3 top-1/4 h-[500px] w-[500px] rounded-full bg-red-500/5 blur-3xl" />
        <div className="absolute right-1/4 bottom-1/4 h-[400px] w-[400px] rounded-full bg-pink-500/5 blur-3xl" />
        <div className="absolute left-1/2 top-1/2 h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500/4 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-6xl">
        {/* Header */}
        <Reveal className="mb-14 text-center">
          <p className="section-label mx-auto mb-4">Multi-platform</p>
          <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            Publish directly to{" "}
            <span className="text-aurora">every platform</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground sm:text-lg">
            Clip once. Publish everywhere. AutoClipr formats and pushes your content to YouTube Shorts,
            Instagram Reels, TikTok, and Facebook — no manual re-uploading.
          </p>
        </Reveal>

        {/* Bento grid */}
        <Stagger className="grid grid-cols-1 gap-5 lg:grid-cols-3" amount={0.12}>
          {CARDS.map((card) => (
            <PlatformCard key={card.id} card={card} />
          ))}
        </Stagger>

        {/* Bottom CTA */}
        <Reveal className="mt-12 text-center" delay={0.2}>
          <p className="mb-5 text-sm text-white/30">
            Connect your accounts once · publish to all platforms in one click
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 px-7 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-900/30 transition hover:opacity-90 hover:scale-105"
          >
            Start publishing for free →
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
