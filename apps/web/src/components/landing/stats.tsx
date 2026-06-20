"use client";

import { Reveal, Stagger, MotionItem } from "@/components/ui/motion";

const stats = [
  { value: "10K+", label: "Clips generated", sub: "and growing every day" },
  { value: "< 2 min", label: "Avg. processing time", sub: "from paste to download" },
  { value: "94%", label: "Avg. viral score", sub: "on AI-detected moments" },
  { value: "99%", label: "Creator satisfaction", sub: "across all plan tiers" },
];

export function Stats() {
  return (
    <section className="relative border-y border-white/[0.06] bg-white/[0.015] px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <Reveal className="mb-12 text-center">
          <p className="section-label mx-auto mb-4">By the numbers</p>
          <h2 className="text-balance text-2xl font-bold tracking-tight sm:text-3xl">
            Trusted by thousands of creators worldwide
          </h2>
        </Reveal>
        <Stagger className="grid grid-cols-2 gap-6 lg:grid-cols-4" amount={0.15}>
          {stats.map((s) => (
            <MotionItem key={s.label} className="text-center">
              <p className="text-4xl font-extrabold tracking-tight text-aurora sm:text-5xl">
                {s.value}
              </p>
              <p className="mt-2 font-semibold text-white">{s.label}</p>
              <p className="mt-1 text-xs text-muted-foreground">{s.sub}</p>
            </MotionItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}
