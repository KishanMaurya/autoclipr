import type { Metadata } from "next";
import { Sparkles, Zap, Bug, Shield, Rocket, Star, ArrowRight } from "lucide-react";
import Link from "next/link";
import { ChangelogClient } from "./client";

export const metadata: Metadata = {
  title: "Changelog — AutoClipr",
  description: "What's new in AutoClipr — latest features, improvements, and bug fixes.",
};

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
      { type: "fix", text: "Fixed &lsquo;resource already exists&rsquo; error on avatar upload" },
      { type: "fix", text: "Fixed welcome email not being received (30s window → 24h)" },
    ],
  },
  {
    version: "v1.1.0",
    date: "March 2025",
    headline: "Mobile menu overhaul + real YouTube creator data",
    description:
      "The mobile menu was rebuilt as a full-screen overlay (inspired by vidIQ) and the Top Creators page now fetches real subscriber counts and profile pictures from YouTube API.",
    changes: [
      { type: "feature", text: "Full-screen mobile menu overlay with accordion sections" },
      { type: "feature", text: "Top Creators page fetches real YouTube data (subscribers, views, photos)" },
      { type: "feature", text: "Country flag emoji on channel detail pages" },
      { type: "feature", text: "Actual channel rankings on creator detail pages" },
      { type: "improvement", text: "YouTube API batch-fetched (1 call/hour) to minimise quota" },
      { type: "improvement", text: "Removed &lsquo;How it Works&rsquo; from main nav — moved into Resources dropdown" },
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

export default function ChangelogPage() {
  return (
    <div className="min-h-screen">

      {/* Hero */}
      <section className="relative overflow-hidden px-4 pb-16 pt-16 text-center sm:px-6 sm:pt-24">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-0 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-violet-500/6 blur-[100px]" />
          <div className="absolute right-1/4 top-1/3 h-48 w-48 rounded-full bg-emerald-500/5 blur-[60px]" />
          <div
            className="absolute inset-0 opacity-[0.012]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
              backgroundSize: "60px 60px",
            }}
          />
        </div>

        <div className="mx-auto max-w-2xl">
          <span className="section-label mx-auto mb-6 inline-flex items-center gap-2">
            <Rocket className="h-3.5 w-3.5" />
            Product updates
          </span>
          <h1 className="text-4xl font-extrabold leading-tight text-white sm:text-5xl lg:text-6xl">
            What&apos;s{" "}
            <span className="bg-gradient-to-r from-violet-400 via-purple-300 to-pink-400 bg-clip-text text-transparent">
              new
            </span>
          </h1>
          <p className="mt-5 text-lg text-white/45">
            Every feature, fix, and improvement — shipped and documented.
          </p>

          {/* Quick stats */}
          <div className="mt-10 flex flex-wrap justify-center gap-8">
            {[
              { value: `${RELEASES.length}`, label: "Releases" },
              { value: `${RELEASES.reduce((s, r) => s + r.changes.length, 0)}+`, label: "Changes shipped" },
              { value: "Feb 2025", label: "Since launch" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-3xl font-black text-white">{s.value}</p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-white/30">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="px-4 pb-28 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <ChangelogClient releases={RELEASES} />
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-white/[0.05] px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mb-5 flex justify-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-400 shadow-[0_0_28px_rgba(16,185,129,0.3)]">
              <Star className="h-7 w-7 text-white" />
            </span>
          </div>
          <h2 className="text-2xl font-bold text-white sm:text-3xl">
            Have a feature request?
          </h2>
          <p className="mt-3 text-white/45">
            We build AutoClipr based on creator feedback. Tell us what you need.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-4">
            <Link
              href="/feedback"
              className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 px-6 py-3 text-sm font-bold text-white shadow-[0_0_18px_rgba(16,185,129,0.25)] transition-all hover:scale-[1.02] hover:shadow-[0_0_28px_rgba(16,185,129,0.4)]"
            >
              <Sparkles className="h-4 w-4" />
              Request a feature
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-6 py-3 text-sm font-semibold text-white/70 transition-all hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
            >
              Start free — 100 credits
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
