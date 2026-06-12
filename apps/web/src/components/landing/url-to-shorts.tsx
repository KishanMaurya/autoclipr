"use client";

import Link from "next/link";
import {
  Link2,
  Download,
  Mic,
  Sparkles,
  Subtitles,
  Share2,
  Flame,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Reveal, Stagger, MotionCard } from "@/components/ui/motion";
import { SUPPORTED_SOURCES } from "@/lib/video-sources";

const pipeline = [
  {
    step: 1,
    title: "Paste Video URL",
    icon: Link2,
    items: SUPPORTED_SOURCES.map((s) => s.label),
    example: "https://youtube.com/watch?v=xxxxx",
  },
  {
    step: 2,
    title: "AI Analysis",
    icon: Mic,
    items: [
      "Download video",
      "Extract audio & transcript",
      "Detect speakers & hooks",
      "Viral moments & scene changes",
    ],
  },
  {
    step: 3,
    title: "Generate Shorts",
    icon: Sparkles,
    items: ["YouTube Shorts", "Instagram Reels", "TikTok", "LinkedIn — 5–20 clips"],
    durations: ["15s", "30s", "45s", "60s"],
  },
  {
    step: 4,
    title: "AI Captions",
    icon: Subtitles,
    items: ["Animated", "Emoji", "Karaoke", "Viral style — 6 languages"],
  },
  {
    step: 5,
    title: "Export & Publish",
    icon: Share2,
    items: ["9:16 · 1080×1920", "HD / Full HD / 4K", "One-click to connected channels"],
  },
];

export function UrlToShorts() {
  return (
    <section className="relative px-4 py-24 sm:px-6 sm:py-32">
      <div className="absolute inset-0 bg-mesh-violet opacity-40" aria-hidden />
      <div className="relative mx-auto max-w-7xl">
        <Reveal className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-medium uppercase tracking-widest text-violet-400">
            Any video → viral shorts
          </p>
          <h2 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
            Create Viral Shorts from{" "}
            <span className="text-aurora">Any Video URL</span>
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Paste a link. AutoClipr downloads, analyzes, scores, captions, and exports — ready to
            publish without re-uploading.
          </p>
        </Reveal>

        <Stagger className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {pipeline.map((p) => {
            const Icon = p.icon;
            return (
              <MotionCard key={p.step} className="glass-panel flex flex-col p-5">
                <div className="mb-4 flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/15 text-sm font-bold text-violet-300">
                    {p.step}
                  </span>
                  <Icon className="h-5 w-5 text-violet-400" />
                </div>
                <h3 className="font-semibold">{p.title}</h3>
                <ul className="mt-3 flex-1 space-y-1.5">
                  {p.items.map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-2 text-xs text-muted-foreground"
                    >
                      <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-emerald-500/80" />
                      {item}
                    </li>
                  ))}
                </ul>
                {"durations" in p && p.durations && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {p.durations.map((d) => (
                      <span
                        key={d}
                        className="rounded-md bg-white/[0.06] px-2 py-0.5 text-xs font-medium"
                      >
                        {d}
                      </span>
                    ))}
                  </div>
                )}
                {p.example && (
                  <p className="mt-3 truncate font-mono text-[10px] text-muted-foreground/70">
                    {p.example}
                  </p>
                )}
              </MotionCard>
            );
          })}
        </Stagger>

        <Reveal delay={0.2} className="mx-auto mt-12 max-w-xl">
          <div className="glass-panel flex items-center gap-4 p-6">
            <Flame className="h-10 w-10 shrink-0 text-orange-400" />
            <div>
              <p className="font-semibold">AI Viral Score per clip</p>
              <p className="text-sm text-muted-foreground">
                Hook strength, engagement & retention prediction, share potential — scored 0–100.
              </p>
            </div>
          </div>
        </Reveal>

        <Reveal delay={0.3} className="mt-10 flex justify-center">
          <Button variant="gradient" size="lg" asChild>
            <Link href="/create">
              <Download className="mr-2 h-5 w-5" />
              Paste URL & Create Shorts
            </Link>
          </Button>
        </Reveal>
      </div>
    </section>
  );
}
