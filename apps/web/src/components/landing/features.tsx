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
  accent: string;
  iconBg: string;
};

const features: Feature[] = [
  {
    icon: Sparkles,
    title: "AI Viral Detection",
    description: "Models score every moment for shareability.",
    accent: "from-violet-500/20 to-transparent",
    iconBg: "bg-violet-500/15 text-violet-400",
  },
  {
    icon: Subtitles,
    title: "Auto Subtitles",
    description: "Captions styled for TikTok, Reels & Shorts.",
    accent: "from-pink-500/20 to-transparent",
    iconBg: "bg-pink-500/15 text-pink-400",
  },
  {
    icon: Zap,
    title: "Lightning Fast",
    description: "Clips in minutes, not hours.",
    accent: "from-amber-500/20 to-transparent",
    iconBg: "bg-amber-500/15 text-amber-400",
  },
  {
    icon: Share2,
    title: "Multi-Platform",
    description: "9:16, 1:1, and 16:9 — one click.",
    accent: "from-cyan-500/20 to-transparent",
    iconBg: "bg-cyan-500/15 text-cyan-400",
  },
  {
    icon: BarChart3,
    title: "Credits & Plans",
    description: "Transparent tiers for creators and teams.",
    accent: "from-emerald-500/20 to-transparent",
    iconBg: "bg-emerald-500/15 text-emerald-400",
  },
  {
    icon: Shield,
    title: "Enterprise Ready",
    description: "JWT auth, RLS, clean architecture.",
    accent: "from-blue-500/20 to-transparent",
    iconBg: "bg-blue-500/15 text-blue-400",
  },
];

export function Features() {
  return (
    <section id="features" className="relative px-4 py-28 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="section-label mx-auto mb-6">Features</p>
          <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            Everything to <span className="text-aurora">go viral</span>
          </h2>
        </Reveal>

        <Stagger className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" amount={0.15}>
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <MotionCard
                key={f.title}
                className="glass-panel group p-6 sm:p-8 transition-colors hover:border-white/[0.16]"
              >
                <div
                  className={cn(
                    "pointer-events-none absolute inset-0 bg-gradient-to-br opacity-0 transition-opacity duration-500 group-hover:opacity-100",
                    f.accent
                  )}
                />
                <div className="relative">
                  <div
                    className={cn(
                      "mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl",
                      f.iconBg
                    )}
                  >
                    <Icon className="h-6 w-6" />
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
