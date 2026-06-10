"use client";

import { Check, X } from "lucide-react";
import { Reveal, Stagger, MotionItem } from "@/components/ui/motion";

const rows = [
  { label: "Time investment", auto: "2 min", manual: "2+ hours" },
  { label: "Consistency", auto: "Every video", manual: "When you can" },
  { label: "AI analysis", auto: "Viral detection", manual: "Guesswork" },
  { label: "Subtitles", auto: "Automatic", manual: "Manual" },
  { label: "Multi-format export", auto: "One click", manual: "Per platform" },
];

export function Comparison() {
  return (
    <section className="px-4 py-28 sm:px-6">
      <div className="mx-auto max-w-4xl">
        <Reveal className="text-center">
          <p className="section-label mx-auto mb-6">Comparison</p>
          <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            Why creators choose <span className="text-aurora">AutoClipr</span>
          </h2>
        </Reveal>

        <Reveal className="mt-12" delay={0.1}>
          <div className="glass-panel overflow-hidden">
            <div className="grid grid-cols-3 border-b border-white/[0.08] text-sm font-semibold">
              <div className="p-5" />
              <div className="relative border-l border-white/[0.08] p-5 text-center">
                <div className="absolute inset-0 bg-gradient-to-b from-violet-500/15 to-transparent" />
                <span className="relative text-aurora">AutoClipr</span>
              </div>
              <div className="border-l border-white/[0.08] p-5 text-center text-muted-foreground">
                Manual
              </div>
            </div>

            <Stagger amount={0.1}>
              {rows.map((row) => (
                <MotionItem
                  key={row.label}
                  className="grid grid-cols-3 border-t border-white/[0.06] text-sm"
                >
                  <div className="p-5 font-medium">{row.label}</div>
                  <div className="flex items-center gap-2 border-l border-white/[0.08] bg-violet-500/[0.06] p-5">
                    <Check className="h-4 w-4 shrink-0 text-emerald-400" />
                    {row.auto}
                  </div>
                  <div className="flex items-center gap-2 border-l border-white/[0.08] p-5 text-muted-foreground">
                    <X className="h-4 w-4 shrink-0 text-red-400/80" />
                    {row.manual}
                  </div>
                </MotionItem>
              ))}
            </Stagger>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
