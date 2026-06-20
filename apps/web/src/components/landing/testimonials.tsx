"use client";

import { Star, Quote } from "lucide-react";
import { Reveal, Stagger, MotionCard } from "@/components/ui/motion";

const testimonials = [
  {
    quote:
      "Cut my editing time from 4 hours to 15 minutes per episode. I went from posting once a week to every single day — and my Shorts views tripled in the first month.",
    author: "Sarah K.",
    role: "Podcast Creator",
    channel: "82K subscribers",
    initials: "SK",
    tint: "from-violet-500/30 to-pink-500/20",
    stars: 5,
  },
  {
    quote:
      "The AI scoring surfaces clips that actually perform on TikTok. Other tools just cut randomly — AutoClipr finds the hooks. Our client retention jumped 40% since we started using it.",
    author: "Marcus T.",
    role: "Growth Marketer",
    channel: "Agency — 12 clients",
    initials: "MT",
    tint: "from-cyan-500/30 to-blue-500/20",
    stars: 5,
  },
  {
    quote:
      "Clean UI, fast exports, fair credits. Exactly what we needed as a small team. The auto-subtitles alone save us 2 hours per video and they're more accurate than anything we tried before.",
    author: "Elena R.",
    role: "Agency Founder",
    channel: "Content studio — 8 creators",
    initials: "ER",
    tint: "from-amber-500/30 to-orange-500/20",
    stars: 5,
  },
  {
    quote:
      "I was skeptical about another AI tool, but the viral detection is genuinely impressive. It picked out a 47-second clip that got 2.3M views. I never would have found that manually.",
    author: "James L.",
    role: "YouTuber",
    channel: "210K subscribers",
    initials: "JL",
    tint: "from-emerald-500/30 to-teal-500/20",
    stars: 5,
  },
  {
    quote:
      "We process 30+ videos a week for our clients. AutoClipr handles the entire short-form pipeline — no bottlenecks, no errors. It's become our secret weapon.",
    author: "Priya M.",
    role: "Video Production Lead",
    channel: "Media company — 200+ videos/mo",
    initials: "PM",
    tint: "from-pink-500/30 to-rose-500/20",
    stars: 5,
  },
  {
    quote:
      "Setup took 3 minutes. First batch of clips was ready before I made my coffee. The multi-platform export means I publish to TikTok, Reels, and Shorts simultaneously.",
    author: "Tom A.",
    role: "Solo Creator",
    channel: "Lifestyle & Travel",
    initials: "TA",
    tint: "from-blue-500/30 to-indigo-500/20",
    stars: 5,
  },
];

export function Testimonials() {
  return (
    <section className="px-4 py-28 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <Reveal className="text-center">
          <p className="section-label mx-auto mb-6">Testimonials</p>
          <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            Loved by <span className="text-aurora">creators</span>
          </h2>

          {/* Aggregate rating */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <div className="flex gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="h-5 w-5 fill-amber-400 text-amber-400" />
              ))}
            </div>
            <span className="text-lg font-bold">4.9 / 5</span>
            <span className="text-muted-foreground">·</span>
            <span className="text-muted-foreground text-sm">Based on 200+ creator reviews</span>
          </div>
        </Reveal>

        <Stagger className="mt-14 grid gap-4 md:grid-cols-2 xl:grid-cols-3" amount={0.15}>
          {testimonials.map((t) => (
            <MotionCard key={t.author} className="glass-panel group relative flex flex-col p-8">
              <Quote className="mb-4 h-6 w-6 shrink-0 text-white/10 transition-colors group-hover:text-white/20" />
              <p className="flex-1 text-[15px] leading-relaxed text-white/80">&ldquo;{t.quote}&rdquo;</p>
              <div className="mt-6 flex items-center gap-3 border-t border-white/[0.06] pt-6">
                <span
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${t.tint} text-sm font-bold`}
                >
                  {t.initials}
                </span>
                <div className="min-w-0">
                  <p className="font-semibold">{t.author}</p>
                  <p className="text-sm text-muted-foreground">{t.role}</p>
                  <p className="text-xs text-white/30">{t.channel}</p>
                </div>
                <div className="ml-auto flex shrink-0 gap-0.5">
                  {Array.from({ length: t.stars }).map((_, i) => (
                    <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  ))}
                </div>
              </div>
            </MotionCard>
          ))}
        </Stagger>
      </div>
    </section>
  );
}
