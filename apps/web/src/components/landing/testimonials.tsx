"use client";

import { Star } from "lucide-react";
import { Reveal, Stagger, MotionCard } from "@/components/ui/motion";

const testimonials = [
  {
    quote: "Cut my editing time from 4 hours to 15 minutes per episode.",
    author: "Sarah K.",
    role: "Podcast Creator",
    initials: "SK",
    tint: "from-violet-500/30 to-pink-500/20",
  },
  {
    quote: "The AI scoring surfaces clips that actually perform on TikTok.",
    author: "Marcus T.",
    role: "Growth Marketer",
    initials: "MT",
    tint: "from-cyan-500/30 to-blue-500/20",
  },
  {
    quote: "Clean UI, fast exports, fair credits. Exactly what we needed.",
    author: "Elena R.",
    role: "Agency Founder",
    initials: "ER",
    tint: "from-amber-500/30 to-orange-500/20",
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
        </Reveal>

        <Stagger className="mt-16 grid gap-4 md:grid-cols-3" amount={0.2}>
          {testimonials.map((t) => (
            <MotionCard key={t.author} className="glass-panel p-8">
              <div className="mb-4 flex gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p className="text-lg leading-relaxed">&ldquo;{t.quote}&rdquo;</p>
              <div className="mt-6 flex items-center gap-3">
                <span
                  className={`flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br ${t.tint} text-sm font-bold`}
                >
                  {t.initials}
                </span>
                <div>
                  <p className="font-semibold">{t.author}</p>
                  <p className="text-sm text-muted-foreground">{t.role}</p>
                </div>
              </div>
            </MotionCard>
          ))}
        </Stagger>
      </div>
    </section>
  );
}
