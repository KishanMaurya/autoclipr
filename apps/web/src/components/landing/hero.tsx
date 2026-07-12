"use client";

import Link from "next/link";
import { ArrowRight, Play, Sparkles, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, Stagger, MotionItem } from "@/components/ui/motion";

const CLIPS = [
  { id: "LmxTVsJfInQ", score: 94, platform: "TikTok", border: "from-violet-500 to-pink-500" },
  { id: "mXTlAKm0VEo", score: 88, platform: "Reels",  border: "from-rose-500 to-orange-400" },
  { id: "Ypbsei0ug7w", score: 91, platform: "Shorts", border: "from-cyan-500 to-blue-500"   },
  { id: "aiQrLxzu9ug", score: 79, platform: "TikTok", border: "from-emerald-500 to-teal-400" },
];

const stats = [
  { value: "10K+", label: "Clips generated", icon: "🎬" },
  { value: "2min", label: "Avg. processing", icon: "⚡" },
  { value: "99%", label: "Satisfaction", icon: "🏆" },
];

const EASE = [0.22, 1, 0.36, 1] as const;

const AVATARS = [
  "from-rose-400 to-orange-400",
  "from-violet-400 to-fuchsia-400",
  "from-cyan-400 to-blue-400",
  "from-emerald-400 to-teal-400",
  "from-amber-400 to-yellow-400",
];

export function Hero() {
  return (
    <section className="relative overflow-hidden px-4 pb-12 pt-2 sm:px-6 lg:pt-2">
      {/* Ambient drifting orbs */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <motion.div
          className="absolute left-[8%] top-[6%] h-72 w-72 rounded-full bg-emerald-500/[0.07] blur-3xl"
          animate={{ x: [0, 40, -20, 0], y: [0, -30, 20, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute right-[6%] top-[18%] h-80 w-80 rounded-full bg-violet-500/[0.06] blur-3xl"
          animate={{ x: [0, -50, 30, 0], y: [0, 40, -20, 0] }}
          transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-[10%] left-[35%] h-64 w-64 rounded-full bg-teal-500/[0.06] blur-3xl"
          animate={{ x: [0, 30, -40, 0], y: [0, -20, 30, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

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
            className="font-bold tracking-[-1.28px] leading-[1.1] px-2 text-darks-off-white"
            style={{ fontSize: "clamp(2rem, 5vw, 5rem)" }}
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
          <Button
            variant="gradient"
            size="lg"
            className="group relative min-w-[220px] overflow-hidden shadow-lg shadow-emerald-500/25"
            asChild
          >
            <Link href="/register">
              {/* Shimmer sweep */}
              <motion.span
                aria-hidden
                className="pointer-events-none absolute inset-y-0 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/25 to-transparent"
                animate={{ x: ["-150%", "400%"] }}
                transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut", repeatDelay: 1.2 }}
              />
              Start Free Trial
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </Button>
          <Button variant="outline" size="lg" className="min-w-[200px] backdrop-blur" asChild>
            <Link href="/#how-it-works">
              <Play className="h-4 w-4" />
              See how it works
            </Link>
          </Button>
        </MotionItem>

        {/* Social proof strip */}
        <MotionItem className="mt-8 flex items-center justify-center gap-3">
          <div className="flex -space-x-2.5">
            {AVATARS.map((g, i) => (
              <span
                key={g}
                className={`flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br ${g} text-[10px] font-bold text-black/70 ring-2 ring-[#030014]`}
                style={{ zIndex: AVATARS.length - i }}
              >
                {String.fromCharCode(65 + i)}
              </span>
            ))}
          </div>
          <div className="text-left">
            <div className="flex items-center gap-0.5 text-amber-400" aria-label="5 star rating">
              {"★★★★★".split("").map((s, i) => (
                <span key={i} className="text-xs">{s}</span>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Loved by <span className="font-semibold text-foreground/90">2,000+ creators</span>
            </p>
          </div>
        </MotionItem>

        <MotionItem className="mt-14 flex justify-center px-4">
          <div className="inline-flex w-full max-w-sm gap-3 sm:w-auto sm:max-w-none sm:gap-4">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + i * 0.1, duration: 0.5, ease: EASE }}
                className="group relative flex flex-1 flex-col items-center gap-1 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0d0d18]/80 px-4 py-4 backdrop-blur-sm transition-colors hover:border-emerald-500/20 hover:bg-emerald-500/5 sm:px-8 sm:py-5"
              >
                {/* Subtle glow on hover */}
                <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/0 to-emerald-500/0 transition-all duration-300 group-hover:from-emerald-500/5 group-hover:to-transparent" />
                <span className="text-lg sm:text-xl">{stat.icon}</span>
                <p className="text-xl font-extrabold text-aurora sm:text-3xl">{stat.value}</p>
                <p className="text-center text-[9px] font-semibold uppercase tracking-widest text-white/40 sm:text-[10px]">
                  {stat.label}
                </p>
              </motion.div>
            ))}
          </div>
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
                      key={clip.id}
                      className="group relative h-44 w-24 overflow-hidden rounded-2xl bg-black shadow-xl sm:h-52 sm:w-28"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.6 + i * 0.12, duration: 0.5, ease: EASE }}
                      whileHover={{ y: -8, scale: 1.03, transition: { duration: 0.25 } }}
                    >
                      {/* Gradient border ring */}
                      <div className={`absolute inset-0 rounded-2xl bg-gradient-to-b ${clip.border} p-[1.5px]`}>
                        <div className="h-full w-full rounded-2xl bg-black" />
                      </div>

                      {/* YouTube Short iframe */}
                      {/* credentialless attr needed for COEP credentialless policy */}
                      <iframe
                        src={`https://www.youtube.com/embed/${clip.id}?autoplay=1&mute=1&loop=1&playlist=${clip.id}&controls=0&modestbranding=1&rel=0&showinfo=0`}
                        allow="autoplay; encrypted-media"
                        allowFullScreen
                        // @ts-expect-error credentialless is a newer attr not yet in React types
                        credentialless=""
                        className="absolute inset-0 h-full w-full scale-[1.35] rounded-2xl"
                        style={{ border: "none", pointerEvents: "none" }}
                      />

                      {/* Score badge */}
                      <div className="absolute left-1.5 top-1.5 z-10 flex items-center gap-0.5 rounded-full bg-black/70 px-1.5 py-0.5 backdrop-blur-sm">
                        <span className="text-[9px] font-bold text-emerald-400">{clip.score}</span>
                        <span className="text-[8px]">🔥</span>
                      </div>

                      {/* Platform badge */}
                      <div className="absolute bottom-1.5 left-1.5 right-1.5 z-10 rounded-lg bg-black/70 px-1.5 py-1 backdrop-blur-sm">
                        <span className="text-[9px] font-semibold text-white/80">{clip.platform}</span>
                        <div className="mt-1 h-0.5 w-full overflow-hidden rounded-full bg-white/20">
                          <div className={`h-full rounded-full bg-gradient-to-r ${clip.border}`} style={{ width: `${clip.score}%` }} />
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
