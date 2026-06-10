"use client";

import Link from "next/link";
import { ArrowRight, Play, Sparkles, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, Stagger, MotionItem } from "@/components/ui/motion";

const stats = [
  { value: "10K+", label: "Clips generated" },
  { value: "2min", label: "Avg. processing" },
  { value: "99%", label: "Satisfaction" },
];

const EASE = [0.22, 1, 0.36, 1] as const;

export function Hero() {
  return (
    <section className="relative overflow-hidden px-4 pb-28 pt-24 sm:px-6 lg:pt-32">
      <Stagger className="relative mx-auto max-w-5xl text-center" amount={0.1}>
        <MotionItem>
          <motion.span
            className="section-label mx-auto mb-8 inline-flex"
            whileHover={{ scale: 1.04 }}
          >
            <Sparkles className="h-3.5 w-3.5" />
            AI-Powered Video Clipping
          </motion.span>
        </MotionItem>

        <MotionItem>
          <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-6xl lg:text-7xl lg:leading-[1.05]">
            Turn long videos into{" "}
            <span className="text-aurora">viral shorts</span>
            <br className="hidden sm:block" /> — automatically
          </h1>
        </MotionItem>

        <MotionItem>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
            Monitor channels. Detect uploads. Auto-clip. Zero editing.
          </p>
        </MotionItem>

        <MotionItem className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Button variant="gradient" size="lg" className="group min-w-[220px]" asChild>
            <Link href="/register">
              Start Free Trial
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </Button>
          <Button variant="outline" size="lg" className="min-w-[200px]" asChild>
            <Link href="/#how-it-works">
              <Play className="h-4 w-4" />
              See how it works
            </Link>
          </Button>
        </MotionItem>

        <MotionItem className="mt-14 flex flex-wrap items-center justify-center gap-8 sm:gap-12">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-2xl font-bold text-aurora sm:text-3xl">{stat.value}</p>
              <p className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">
                {stat.label}
              </p>
            </div>
          ))}
        </MotionItem>
      </Stagger>

      <motion.div
        initial={{ opacity: 0, y: 48 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.8, ease: EASE }}
        className="relative mx-auto mt-20 max-w-4xl"
      >
        <div className="glow-line mb-6 w-full opacity-80" />
        <motion.div
          className="gradient-border shadow-glow-lg"
          whileHover={{ y: -4, transition: { duration: 0.3, ease: EASE } }}
        >
          <div className="overflow-hidden p-1">
            <div className="rounded-[calc(1rem-2px)] bg-gradient-brand-subtle p-6 sm:p-8">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                <div className="text-left">
                  <div className="mb-3 flex items-center gap-2">
                    <span className="flex h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                    <span className="text-xs font-medium uppercase tracking-wider text-emerald-400">
                      Live monitoring
                    </span>
                  </div>
                  <p className="text-lg font-semibold sm:text-xl">
                    New upload detected → 4 clips ready in 2 minutes
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Auto subtitles · 9:16 export · TikTok, Reels & Shorts
                  </p>
                </div>
                <div className="flex shrink-0 gap-3">
                  {[1, 2, 3, 4].map((i) => (
                    <motion.div
                      key={i}
                      className="group relative h-24 w-14 overflow-hidden rounded-xl border border-white/10 bg-black/40 sm:h-28 sm:w-16"
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.7 + i * 0.12, duration: 0.5, ease: EASE }}
                      whileHover={{ y: -6, scale: 1.04 }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-b from-violet-600/40 via-pink-500/30 to-orange-500/20 opacity-80" />
                      <div className="absolute inset-x-0 bottom-0 bg-black/60 p-1.5">
                        <div className="h-1 w-full rounded-full bg-white/20">
                          <motion.div
                            className="h-full rounded-full bg-gradient-brand"
                            initial={{ width: 0 }}
                            animate={{ width: `${60 + i * 10}%` }}
                            transition={{ delay: 1 + i * 0.12, duration: 0.7, ease: EASE }}
                          />
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Zap className="h-4 w-4 text-amber-400" />
            No credit card required
          </span>
          <span className="hidden h-1 w-1 rounded-full bg-white/20 sm:block" />
          <span>Free trial included</span>
          <span className="hidden h-1 w-1 rounded-full bg-white/20 sm:block" />
          <span>Cancel anytime</span>
        </div>
      </motion.div>
    </section>
  );
}
