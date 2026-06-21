"use client";

import Link from "next/link";
import { ArrowRight, Play, Sparkles, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, Stagger, MotionItem } from "@/components/ui/motion";

const CLIPS = [
  {
    score: 94,
    title: "The moment that changed everything...",
    duration: "0:45",
    platform: "TikTok",
    progress: 72,
    bg: "from-violet-700 via-purple-600 to-pink-600",
    lines: ["from-white/40 w-3/4", "from-white/25 w-1/2", "from-white/20 w-2/3"],
  },
  {
    score: 88,
    title: "Nobody talks about this hack",
    duration: "0:30",
    platform: "Reels",
    progress: 85,
    bg: "from-rose-600 via-orange-500 to-yellow-500",
    lines: ["from-white/40 w-2/3", "from-white/25 w-3/4", "from-white/20 w-1/2"],
  },
  {
    score: 91,
    title: "Wait for it… 🔥",
    duration: "0:58",
    platform: "Shorts",
    progress: 60,
    bg: "from-cyan-600 via-blue-600 to-indigo-700",
    lines: ["from-white/40 w-1/2", "from-white/25 w-2/3", "from-white/20 w-3/4"],
  },
  {
    score: 79,
    title: "POV: You finally get it",
    duration: "0:22",
    platform: "TikTok",
    progress: 90,
    bg: "from-emerald-600 via-teal-600 to-cyan-600",
    lines: ["from-white/40 w-3/4", "from-white/25 w-1/2", "from-white/20 w-1/3"],
  },
];

const stats = [
  { value: "10K+", label: "Clips generated" },
  { value: "2min", label: "Avg. processing" },
  { value: "99%", label: "Satisfaction" },
];

const EASE = [0.22, 1, 0.36, 1] as const;

export function Hero() {
  return (
    <section className="relative overflow-hidden px-4 pb-28 pt-2 sm:px-6 lg:pt-2">
      {/* Green ambient glow — sits behind all content */}
      <div
        className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2"
        style={{
          width: "900px",
          height: "600px",
          background: "radial-gradient(ellipse at 50% 20%, rgba(16,185,129,0.18) 0%, rgba(16,185,129,0.06) 45%, transparent 75%)",
          filter: "blur(40px)",
        }}
      />
      <Stagger className="relative mx-auto max-w-[100vw] text-center" amount={0.1}>
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
          <h1
            className="font-extrabold tracking-tight leading-[1] px-2"
            style={{ fontSize: "clamp(2.5rem, 8.5vw, 9rem)" }}
          >
            Turn long videos into{" "}
            <span className="text-aurora">viral shorts</span>
            <br /> — automatically
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
                <div className="flex shrink-0 gap-2.5">
                  {CLIPS.map((clip, i) => (
                    <motion.div
                      key={i}
                      className="group relative h-36 w-20 overflow-hidden rounded-2xl border border-white/10 bg-black shadow-xl sm:h-44 sm:w-24"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.6 + i * 0.12, duration: 0.5, ease: EASE }}
                      whileHover={{ y: -8, scale: 1.05, transition: { duration: 0.25 } }}
                    >
                      {/* Thumbnail background */}
                      <div className={`absolute inset-0 bg-gradient-to-b ${clip.bg} opacity-90`} />

                      {/* Fake content lines simulating video scene */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 px-2 opacity-30">
                        {clip.lines.map((cls, j) => (
                          <div key={j} className={`h-1 rounded-full bg-gradient-to-r ${cls} to-transparent`} />
                        ))}
                      </div>

                      {/* Viral score badge top-left */}
                      <div className="absolute left-1.5 top-1.5 flex items-center gap-0.5 rounded-full bg-black/60 px-1.5 py-0.5 backdrop-blur-sm">
                        <span className="text-[9px] font-bold text-emerald-400">{clip.score}</span>
                        <span className="text-[7px] text-emerald-400/70">🔥</span>
                      </div>

                      {/* Duration top-right */}
                      <div className="absolute right-1.5 top-1.5 rounded bg-black/60 px-1 py-0.5 text-[8px] font-medium text-white/80 backdrop-blur-sm">
                        {clip.duration}
                      </div>

                      {/* Bottom overlay: title + platform + progress */}
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-2 pt-4">
                        <p className="mb-1.5 line-clamp-2 text-[8px] font-semibold leading-tight text-white sm:text-[9px]">
                          {clip.title}
                        </p>
                        <div className="mb-1 flex items-center justify-between">
                          <span className="text-[7px] font-medium text-white/50">{clip.platform}</span>
                        </div>
                        <div className="h-0.5 w-full overflow-hidden rounded-full bg-white/20">
                          <motion.div
                            className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400"
                            initial={{ width: 0 }}
                            animate={{ width: `${clip.progress}%` }}
                            transition={{ delay: 1 + i * 0.15, duration: 0.8, ease: EASE }}
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
