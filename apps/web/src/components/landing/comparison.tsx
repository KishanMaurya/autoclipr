"use client";

import Link from "next/link";
import { Check, X, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { Reveal, Stagger, MotionItem } from "@/components/ui/motion";

const rows = [
  {
    label: "Time investment",
    icon: "⏱️",
    auto: "~2 minutes",
    manual: "2–4 hours",
    highlight: true,
  },
  {
    label: "Consistency",
    icon: "🔄",
    auto: "Every video, automatically",
    manual: "Only when you have time",
  },
  {
    label: "Viral moment detection",
    icon: "🔥",
    auto: "AI-scored, 94% accuracy",
    manual: "Manual guesswork",
    highlight: true,
  },
  {
    label: "Subtitles",
    icon: "💬",
    auto: "Auto-burned, 99% accurate",
    manual: "Manual SRT editing",
  },
  {
    label: "Multi-platform export",
    icon: "📲",
    auto: "TikTok, Reels & Shorts at once",
    manual: "Export per platform, manually",
    highlight: true,
  },
  {
    label: "Channel monitoring",
    icon: "📡",
    auto: "24/7, instant detection",
    manual: "Manual refresh needed",
  },
  {
    label: "Cost",
    icon: "💰",
    auto: "From $9 / month",
    manual: "$50–200/hr editor fee",
    highlight: true,
  },
];

const summary = [
  { value: "10×", label: "faster than manual editing" },
  { value: "94%", label: "viral detection accuracy" },
  { value: "$0", label: "editor fees replaced" },
];

export function Comparison() {
  return (
    <section className="px-4 py-12 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <Reveal className="text-center">
          <p className="section-label mx-auto mb-6">Comparison</p>
          <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            Why creators choose{" "}
            <span className="text-aurora">AutoClipr.ai</span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground sm:text-lg">
            See how automated clipping stacks up against the traditional manual workflow.
          </p>
        </Reveal>

        <Reveal className="mt-14" delay={0.1}>
          <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02] shadow-2xl">

            {/* Header row */}
            <div className="grid grid-cols-[1fr_1fr_1fr] border-b border-white/[0.08]">
              <div className="p-5 lg:p-6" />

              {/* AutoClipr column header */}
              <div className="relative border-l border-white/[0.08] p-5 text-center lg:p-6">
                <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/10 via-emerald-500/5 to-transparent" />
                <div className="relative flex flex-col items-center gap-1.5">
                  <div className="flex items-center gap-1.5">
                    <Zap className="h-4 w-4 text-emerald-400" />
                    <span className="font-bold text-aurora sm:text-lg">AutoClipr.ai</span>
                  </div>
                  <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-400 border border-emerald-500/20">
                    Recommended
                  </span>
                </div>
              </div>

              {/* Manual column header */}
              <div className="border-l border-white/[0.08] p-5 text-center lg:p-6">
                <p className="font-semibold text-muted-foreground sm:text-lg">Manual editing</p>
                <p className="mt-1 text-[10px] uppercase tracking-wider text-white/20">Traditional</p>
              </div>
            </div>

            {/* Data rows */}
            <Stagger amount={0.08}>
              {rows.map((row, i) => (
                <MotionItem
                  key={row.label}
                  className={cn(
                    "grid grid-cols-[1fr_1fr_1fr] border-t border-white/[0.05] text-sm transition-colors",
                    row.highlight && "bg-white/[0.015]"
                  )}
                >
                  {/* Label */}
                  <div className="flex items-center gap-2.5 p-4 font-medium lg:p-5">
                    <span className="text-base" role="img">{row.icon}</span>
                    <span className="text-white/80">{row.label}</span>
                  </div>

                  {/* AutoClipr value */}
                  <div className="relative flex items-center gap-2.5 border-l border-white/[0.06] bg-emerald-500/[0.04] p-4 lg:p-5">
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20">
                      <Check className="h-3 w-3 text-emerald-400" strokeWidth={2.5} />
                    </div>
                    <span className="font-medium text-white/90">{row.auto}</span>
                  </div>

                  {/* Manual value */}
                  <div className="flex items-center gap-2.5 border-l border-white/[0.06] p-4 lg:p-5">
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-500/10">
                      <X className="h-3 w-3 text-red-400/80" strokeWidth={2.5} />
                    </div>
                    <span className="text-muted-foreground">{row.manual}</span>
                  </div>
                </MotionItem>
              ))}
            </Stagger>

            {/* Bottom CTA row */}
            <div className="grid grid-cols-[1fr_1fr_1fr] border-t border-white/[0.08] bg-white/[0.02]">
              <div className="p-5 lg:p-6" />
              <div className="border-l border-white/[0.08] p-5 text-center lg:p-6">
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-900/40 transition-all hover:scale-[1.03] hover:shadow-emerald-800/50"
                >
                  <Zap className="h-3.5 w-3.5" />
                  Start free trial
                </Link>
              </div>
              <div className="flex items-center justify-center border-l border-white/[0.08] p-5 lg:p-6">
                <span className="text-xs text-white/25">No equivalent</span>
              </div>
            </div>
          </div>
        </Reveal>

        {/* Summary stats */}
        <Stagger className="mt-8 grid grid-cols-3 gap-4" amount={0.15}>
          {summary.map((s) => (
            <MotionItem
              key={s.label}
              className="glass-panel rounded-2xl p-5 text-center"
            >
              <p className="text-2xl font-extrabold text-aurora sm:text-3xl">{s.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{s.label}</p>
            </MotionItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}
