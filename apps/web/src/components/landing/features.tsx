"use client";

import {
  Sparkles,
  Subtitles,
  Zap,
  Share2,
  BarChart3,
  Shield,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Reveal, Stagger, MotionCard } from "@/components/ui/motion";

type Feature = {
  icon: LucideIcon;
  title: string;
  description: string;
  stat: string;
  statLabel: string;
  accent: string;
  iconBg: string;
  statColor: string;
};

const features: Feature[] = [
  {
    icon: Sparkles,
    title: "AI Viral Detection",
    description:
      "Our model scores every second of footage for hooks, emotion peaks, and shareability signals — surfacing only the moments most likely to go viral.",
    stat: "94%",
    statLabel: "avg. clip score",
    accent: "from-violet-500/20 to-transparent",
    iconBg: "bg-violet-500/15 text-violet-400",
    statColor: "text-violet-400",
  },
  {
    icon: Subtitles,
    title: "Auto Subtitles",
    description:
      "Word-level captions burned directly into the clip, styled for TikTok, Reels & Shorts. No manual SRT editing — ever.",
    stat: "99%",
    statLabel: "caption accuracy",
    accent: "from-pink-500/20 to-transparent",
    iconBg: "bg-pink-500/15 text-pink-400",
    statColor: "text-pink-400",
  },
  {
    icon: Zap,
    title: "Lightning Fast",
    description:
      "From paste to download in under 2 minutes on most videos. Distributed workers process your clips in parallel so you never wait.",
    stat: "< 2 min",
    statLabel: "avg. processing",
    accent: "from-amber-500/20 to-transparent",
    iconBg: "bg-amber-500/15 text-amber-400",
    statColor: "text-amber-400",
  },
  {
    icon: Share2,
    title: "Multi-Platform Export",
    description:
      "One video becomes content for every platform. 9:16 for TikTok & Reels, 16:9 for YouTube, 1:1 for LinkedIn — all exported in a single click.",
    stat: "3 formats",
    statLabel: "per clip",
    accent: "from-cyan-500/20 to-transparent",
    iconBg: "bg-cyan-500/15 text-cyan-400",
    statColor: "text-cyan-400",
  },
  {
    icon: BarChart3,
    title: "Transparent Credits",
    description:
      "Simple, predictable pricing with no surprise overages. Credits roll over, usage is live-tracked, and you can top up anytime from the dashboard.",
    stat: "0",
    statLabel: "hidden fees",
    accent: "from-emerald-500/20 to-transparent",
    iconBg: "bg-emerald-500/15 text-emerald-400",
    statColor: "text-emerald-400",
  },
  {
    icon: Shield,
    title: "Enterprise Grade",
    description:
      "JWT auth, row-level security, encrypted storage, and audit logs. Built for teams and agencies that can't afford data leaks.",
    stat: "SOC 2",
    statLabel: "aligned arch.",
    accent: "from-blue-500/20 to-transparent",
    iconBg: "bg-blue-500/15 text-blue-400",
    statColor: "text-blue-400",
  },
];

export function Features() {
  return (
    <section id="features" className="relative px-4 py-12 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="section-label mx-auto mb-6">Features</p>
          <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            Everything to <span className="text-aurora">go viral</span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground sm:text-lg">
            One tool replaces your entire short-form content workflow — from monitoring to publishing.
          </p>
        </Reveal>

        <Stagger className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" amount={0.15}>
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <MotionCard
                key={f.title}
                className="glass-panel group relative p-6 sm:p-8 transition-colors hover:border-white/[0.16]"
              >
                <div
                  className={cn(
                    "pointer-events-none absolute inset-0 bg-gradient-to-br opacity-0 transition-opacity duration-500 group-hover:opacity-100",
                    f.accent
                  )}
                />
                <div className="relative">
                  <div className="mb-5 flex items-start justify-between">
                    <div
                      className={cn(
                        "inline-flex h-12 w-12 items-center justify-center rounded-xl",
                        f.iconBg
                      )}
                    >
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="text-right">
                      <p className={cn("text-xl font-bold tabular-nums", f.statColor)}>{f.stat}</p>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{f.statLabel}</p>
                    </div>
                  </div>
                  <h3 className="text-xl font-semibold">{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {f.description}
                  </p>
                </div>
              </MotionCard>
            );
          })}
        </Stagger>
      </div>
    </section>
  );
}
