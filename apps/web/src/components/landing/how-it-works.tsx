"use client";

import { Link2, Bell, Scissors, Upload, BadgeDollarSign, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Reveal, Stagger, MotionCard, MotionItem } from "@/components/ui/motion";

function YouTubeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn("h-5 w-5", className)} aria-hidden>
      <path fill="#FF0000" d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .6 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.3.6 9.3.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8z" />
      <path fill="#fff" d="M9.75 15.02l6.5-3.52-6.5-3.52v7.04z" />
    </svg>
  );
}

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn("h-5 w-5", className)} aria-hidden>
      <path fill="currentColor" d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.77 1.52V6.76a4.85 4.85 0 0 1-1-.07z" />
    </svg>
  );
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn("h-5 w-5", className)} aria-hidden>
      <defs>
        <linearGradient id="ig-hiw" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#feda75" />
          <stop offset="25%" stopColor="#fa7e1e" />
          <stop offset="50%" stopColor="#d62976" />
          <stop offset="75%" stopColor="#962fbf" />
          <stop offset="100%" stopColor="#4f5bd5" />
        </linearGradient>
      </defs>
      <rect width="24" height="24" rx="6" fill="url(#ig-hiw)" />
      <circle cx="12" cy="12" r="4.5" fill="none" stroke="#fff" strokeWidth="1.5" />
      <circle cx="17.5" cy="6.5" r="1.2" fill="#fff" />
    </svg>
  );
}

const steps = [
  {
    num: "01",
    title: "Connect Channel",
    description: "Paste your YouTube channel URL or sign in with Google. AutoClipr starts monitoring instantly.",
    icon: Link2,
    accent: "from-violet-500 to-purple-600",
    iconBg: "bg-violet-500/15 text-violet-400",
    glow: "shadow-violet-500/20",
    visual: (
      <div className="flex flex-col items-center gap-3 w-full">
        <div className="flex w-full max-w-[180px] items-center gap-2 rounded-xl border border-white/10 bg-black/40 px-3 py-2.5">
          <YouTubeIcon />
          <span className="truncate text-xs text-muted-foreground">youtube.com/channel/…</span>
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold text-emerald-400 ring-1 ring-emerald-500/20">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Connected
        </div>
      </div>
    ),
  },
  {
    num: "02",
    title: "Detect Uploads",
    description: "AutoClipr watches 24/7 and triggers processing the moment a new video goes live — no manual refresh.",
    icon: Bell,
    accent: "from-sky-500 to-blue-600",
    iconBg: "bg-sky-500/15 text-sky-400",
    glow: "shadow-sky-500/20",
    visual: (
      <div className="flex flex-col items-center gap-3">
        <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-500/10 ring-1 ring-sky-500/20">
          <Bell className="h-7 w-7 text-sky-400" strokeWidth={1.5} />
          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">1</span>
        </div>
        <p className="text-[11px] font-medium text-sky-400">New upload detected!</p>
      </div>
    ),
  },
  {
    num: "03",
    title: "AI Clips It",
    description: "Our model scores every moment for hooks, emotion, and shareability — then renders 9:16 clips with auto-captions.",
    icon: Scissors,
    accent: "from-pink-500 to-rose-600",
    iconBg: "bg-pink-500/15 text-pink-400",
    glow: "shadow-pink-500/20",
    badge: "Core feature",
    visual: (
      <div className="flex w-full max-w-[180px] flex-col items-center gap-3">
        <div className="flex items-center gap-2">
          <Scissors className="h-6 w-6 text-pink-400" strokeWidth={1.5} />
          <span className="rounded-full bg-pink-500/10 px-2 py-0.5 text-[10px] font-bold text-pink-400 ring-1 ring-pink-500/20">94 🔥</span>
        </div>
        <div className="relative h-2 w-full overflow-hidden rounded-full bg-white/10">
          <div className="absolute inset-y-0 left-0 w-[72%] rounded-full bg-gradient-to-r from-violet-500 via-pink-500 to-orange-400" />
          <div className="absolute left-[68%] top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full border-2 border-pink-300 bg-pink-500 shadow-md shadow-pink-500/50" />
        </div>
        <p className="text-[10px] text-muted-foreground">AI viral score · 0:45 clip</p>
      </div>
    ),
  },
  {
    num: "04",
    title: "Auto-Publish",
    description: "Clips go live directly on TikTok, Instagram Reels, and YouTube Shorts — all at once, automatically.",
    icon: Upload,
    accent: "from-amber-500 to-orange-500",
    iconBg: "bg-amber-500/15 text-amber-400",
    glow: "shadow-amber-500/20",
    visual: (
      <div className="flex flex-col items-center gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-black/40 ring-1 ring-white/10"><TikTokIcon /></div>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-black/40 ring-1 ring-white/10"><InstagramIcon /></div>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-black/40 ring-1 ring-white/10"><YouTubeIcon /></div>
        </div>
        <p className="text-[11px] font-medium text-amber-400">Published to 3 platforms</p>
      </div>
    ),
  },
  {
    num: "05",
    title: "Earn Rewards",
    description: "Get paid $0.50–$20 per 1K views through creator campaigns. Your content. Your earnings.",
    icon: BadgeDollarSign,
    accent: "from-emerald-500 to-teal-500",
    iconBg: "bg-emerald-500/15 text-emerald-400",
    glow: "shadow-emerald-500/20",
    badge: "NEW",
    visual: (
      <div className="flex flex-col items-center gap-3">
        <span className="text-4xl">💰</span>
        <div className="flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 ring-1 ring-emerald-500/20">
          <span className="text-xs font-bold text-emerald-400">$0.50–$20</span>
          <span className="text-[10px] text-emerald-400/60">per 1K views</span>
        </div>
      </div>
    ),
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="relative px-4 py-12 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="section-label mx-auto mb-6">Workflow</p>
          <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            From upload to viral in{" "}
            <span className="text-aurora">5 steps</span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            A fully automated pipeline — paste a link and walk away.
          </p>
        </Reveal>

        {/* Desktop: horizontal with connector line */}
        <div className="relative mt-16 hidden xl:block">
          {/* Connector line */}
          <div className="absolute left-[10%] right-[10%] top-[52px] h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

          <Stagger className="grid grid-cols-5 gap-4" amount={0.1}>
            {steps.map((step, i) => {
              const Icon = step.icon;
              return (
                <MotionCard
                  key={step.title}
                  className="group relative flex flex-col rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6 text-center transition-all hover:border-white/[0.14] hover:bg-white/[0.04]"
                >
                  {step.badge && (
                    <span className={cn(
                      "absolute right-3 top-3 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider",
                      step.badge === "NEW" ? "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/25" : "bg-white/10 text-white/50"
                    )}>
                      {step.badge}
                    </span>
                  )}

                  {/* Step number + icon */}
                  <div className="relative mx-auto mb-6 flex h-[52px] w-[52px] items-center justify-center">
                    <div className={cn("absolute inset-0 rounded-full bg-gradient-to-br opacity-20 blur-md", step.accent)} />
                    <div className={cn("relative flex h-full w-full items-center justify-center rounded-full ring-1 ring-white/10", step.iconBg, `shadow-lg ${step.glow}`)}>
                      <Icon className="h-5 w-5" strokeWidth={1.75} />
                    </div>
                    <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#0d0d18] text-[9px] font-bold text-white/40 ring-1 ring-white/10">
                      {i + 1}
                    </span>
                  </div>

                  {/* Visual */}
                  <div className="mb-5 flex min-h-[80px] items-center justify-center">{step.visual}</div>

                  <h3 className="text-base font-bold text-white">{step.title}</h3>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{step.description}</p>

                  {/* Arrow between cards */}
                  {i < steps.length - 1 && (
                    <ArrowRight className="absolute -right-3 top-[48px] z-10 h-5 w-5 text-white/20" />
                  )}
                </MotionCard>
              );
            })}
          </Stagger>
        </div>

        {/* Mobile/tablet: vertical stack */}
        <Stagger className="mt-12 space-y-4 xl:hidden" amount={0.1}>
          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <MotionItem key={step.title}>
                <div className="flex gap-4 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5">
                  <div className="relative shrink-0">
                    <div className={cn("flex h-11 w-11 items-center justify-center rounded-full ring-1 ring-white/10", step.iconBg)}>
                      <Icon className="h-5 w-5" strokeWidth={1.75} />
                    </div>
                    <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#0d0d18] text-[8px] font-bold text-white/40 ring-1 ring-white/10">
                      {i + 1}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-white">{step.title}</h3>
                      {step.badge && (
                        <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[9px] font-bold text-emerald-400">{step.badge}</span>
                      )}
                    </div>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{step.description}</p>
                  </div>
                </div>
              </MotionItem>
            );
          })}
        </Stagger>
      </div>
    </section>
  );
}
