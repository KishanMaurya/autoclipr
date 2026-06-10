"use client";

import {
  Link2,
  Inbox,
  ArrowDown,
  ArrowUp,
  Bell,
  Scissors,
  BadgeDollarSign,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Reveal, Stagger, MotionCard } from "@/components/ui/motion";

function YouTubeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn("h-4 w-4", className)} aria-hidden>
      <path
        fill="#FF0000"
        d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .6 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.3.6 9.3.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8z"
      />
      <path fill="#fff" d="M9.75 15.02l6.5-3.52-6.5-3.52v7.04z" />
    </svg>
  );
}

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn("h-4 w-4", className)} aria-hidden>
      <path
        fill="currentColor"
        d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.77 1.52V6.76a4.85 4.85 0 0 1-1-.07z"
      />
    </svg>
  );
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn("h-4 w-4", className)} aria-hidden>
      <defs>
        <linearGradient id="ig" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#feda75" />
          <stop offset="25%" stopColor="#fa7e1e" />
          <stop offset="50%" stopColor="#d62976" />
          <stop offset="75%" stopColor="#962fbf" />
          <stop offset="100%" stopColor="#4f5bd5" />
        </linearGradient>
      </defs>
      <rect width="24" height="24" rx="6" fill="url(#ig)" />
      <circle cx="12" cy="12" r="4.5" fill="none" stroke="#fff" strokeWidth="1.5" />
      <circle cx="17.5" cy="6.5" r="1.2" fill="#fff" />
    </svg>
  );
}

const cards = [
  {
    title: "Connect Channel",
    description:
      "Paste your YouTube channel URL or authenticate with Google.",
    visual: (
      <div className="flex flex-col items-center gap-4">
        <Link2 className="h-10 w-10 text-zinc-300" strokeWidth={1.5} />
        <div className="flex w-full max-w-[200px] items-center gap-2 rounded-lg border border-white/10 bg-black/40 px-3 py-2">
          <YouTubeIcon />
          <span className="truncate text-xs text-muted-foreground">Paste URL</span>
        </div>
      </div>
    ),
  },
  {
    title: "Detect Uploads",
    description:
      "AutoClipr detects new videos instantly—no refresh needed.",
    visual: (
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <Inbox className="h-10 w-10 text-sky-400" strokeWidth={1.5} />
          <ArrowDown className="absolute -bottom-1 -right-1 h-5 w-5 text-red-500" strokeWidth={2.5} />
        </div>
        <div className="flex items-center gap-3">
          <Bell className="h-5 w-5 text-amber-400" />
          <YouTubeIcon className="h-5 w-5" />
        </div>
      </div>
    ),
  },
  {
    title: "Auto-Clip AI",
    description:
      "AI scans for viral moments and creates TikTok/Shorts-ready clips.",
    visual: (
      <div className="flex w-full max-w-[200px] flex-col items-center gap-4">
        <Scissors className="h-10 w-10 text-pink-400" strokeWidth={1.5} />
        <div className="relative h-3 w-full overflow-hidden rounded-full bg-white/10">
          <div className="absolute inset-y-0 left-0 w-[70%] rounded-full bg-gradient-to-r from-violet-500 via-pink-500 to-orange-400" />
          <div className="absolute left-[65%] top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border-2 border-pink-300 bg-pink-500/80 shadow-lg shadow-pink-500/40" />
        </div>
      </div>
    ),
  },
  {
    title: "Auto-Post",
    description:
      "Clips publish directly to TikTok, Instagram, and YouTube Shorts.",
    visual: (
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <Inbox className="h-10 w-10 text-sky-400" strokeWidth={1.5} />
          <ArrowUp className="absolute -bottom-1 -right-1 h-5 w-5 text-red-500" strokeWidth={2.5} />
        </div>
        <div className="flex items-center gap-2.5 text-zinc-300">
          <TikTokIcon />
          <InstagramIcon />
          <YouTubeIcon />
        </div>
      </div>
    ),
  },
  {
    title: "Earn Money",
    description: "Get paid $0.50–$20 per 1K views through creator campaigns.",
    badge: "NEW!",
    visual: (
      <div className="flex flex-col items-center gap-4">
        <span className="text-4xl" role="img" aria-label="Money bag">
          💰
        </span>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold tracking-wide text-orange-400">REWARDS</span>
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-500 text-white">
            <BadgeDollarSign className="h-4 w-4" />
          </span>
        </div>
      </div>
    ),
  },
];

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="relative border-y border-white/[0.06] px-4 py-28 sm:px-6"
    >
      <div className="mx-auto max-w-[1400px]">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="section-label mx-auto mb-6">Workflow</p>
          <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            From upload to viral in{" "}
            <span className="text-aurora">5 steps</span>
          </h2>
        </Reveal>

        <Stagger
          className="mt-16 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
          amount={0.1}
        >
          {cards.map((card, i) => (
            <MotionCard
              key={card.title}
              className="glass-panel group relative flex flex-col items-center p-8 text-center"
            >
              <span className="absolute left-4 top-4 flex h-7 w-7 items-center justify-center rounded-lg bg-white/[0.06] text-xs font-bold text-muted-foreground">
                {i + 1}
              </span>
              {card.badge && (
                <Badge
                  variant="success"
                  className="absolute right-4 top-4 border-0 bg-emerald-500 px-2 py-0.5 text-[10px] font-bold text-white"
                >
                  {card.badge}
                </Badge>
              )}

              <div className="mb-8 flex min-h-[120px] w-full items-center justify-center">
                {card.visual}
              </div>

              <h3 className="text-lg font-semibold text-white">{card.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {card.description}
              </p>
            </MotionCard>
          ))}
        </Stagger>
      </div>
    </section>
  );
}
