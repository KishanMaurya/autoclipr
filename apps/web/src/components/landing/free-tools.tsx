"use client";

import Link from "next/link";
import {
  Scissors, FileVideo, Maximize2, Music, Film, ImageIcon,
  Captions, FileArchive, Info, ArrowRight, Zap, ShieldCheck, Globe,
} from "lucide-react";
import { Reveal, Stagger, MotionItem } from "@/components/ui/motion";

const TOOLS = [
  {
    icon: Scissors,
    label: "Video Slicer",
    desc: "Trim any video to the exact second",
    formats: ["MP4", "MOV", "MKV"],
    color: "from-violet-500/15 to-purple-500/10",
    iconColor: "text-violet-400",
    iconBg: "bg-violet-500/15",
    href: "/tools/video-slicer",
  },
  {
    icon: FileVideo,
    label: "Format Converter",
    desc: "Convert between MP4, WebM, MOV & more",
    formats: ["MP4", "WebM", "AVI"],
    color: "from-sky-500/15 to-blue-500/10",
    iconColor: "text-sky-400",
    iconBg: "bg-sky-500/15",
    href: "/tools/format-converter",
  },
  {
    icon: Maximize2,
    label: "Aspect Ratio Converter",
    desc: "Resize to TikTok, Reels, YouTube",
    formats: ["9:16", "16:9", "1:1"],
    color: "from-orange-500/15 to-amber-500/10",
    iconColor: "text-orange-400",
    iconBg: "bg-orange-500/15",
    href: "/tools/aspect-ratio-converter",
  },
  {
    icon: Music,
    label: "Audio Extractor",
    desc: "Pull audio as MP3, WAV, FLAC & more",
    formats: ["MP3", "WAV", "AAC"],
    color: "from-emerald-500/15 to-teal-500/10",
    iconColor: "text-emerald-400",
    iconBg: "bg-emerald-500/15",
    href: "/tools/audio-extractor",
  },
  {
    icon: Captions,
    label: "Caption Generator",
    desc: "AI transcription → SRT, VTT, TXT",
    formats: ["SRT", "VTT", "TXT"],
    color: "from-pink-500/15 to-rose-500/10",
    iconColor: "text-pink-400",
    iconBg: "bg-pink-500/15",
    href: "/tools/caption-generator",
  },
  {
    icon: FileArchive,
    label: "Video Compressor",
    desc: "Shrink files without killing quality",
    formats: ["H.264", "H.265", "VP9"],
    color: "from-yellow-500/15 to-amber-500/10",
    iconColor: "text-yellow-400",
    iconBg: "bg-yellow-500/15",
    href: "/tools/video-compressor",
  },
  {
    icon: ImageIcon,
    label: "Thumbnail Extractor",
    desc: "Grab any frame as PNG, JPG or WebP",
    formats: ["PNG", "JPG", "WebP"],
    color: "from-cyan-500/15 to-sky-500/10",
    iconColor: "text-cyan-400",
    iconBg: "bg-cyan-500/15",
    href: "/tools/thumbnail-extractor",
  },
  {
    icon: Film,
    label: "GIF Generator",
    desc: "Turn any clip into a looping GIF",
    formats: ["GIF", "Boomerang", "Loop"],
    color: "from-amber-500/15 to-yellow-500/10",
    iconColor: "text-amber-400",
    iconBg: "bg-amber-500/15",
    href: "/tools/gif-generator",
  },
  {
    icon: Info,
    label: "Metadata Viewer",
    desc: "Inspect codec, bitrate, FPS & tags",
    formats: ["MP4", "MKV", "MP3"],
    color: "from-slate-500/15 to-gray-500/10",
    iconColor: "text-slate-400",
    iconBg: "bg-slate-500/15",
    href: "/tools/video-metadata",
  },
];

const MARQUEE_ITEMS = [
  "MP4 · WebM · MOV · AVI · MKV · FLV · TS · 3GP · WMV · M4V",
  "MP3 · WAV · AAC · FLAC · OGG · Opus · M4A · AIFF",
  "SRT · VTT · TXT · ASS captions",
  "9:16 · 16:9 · 1:1 · 4:5 · 21:9 · custom",
  "H.264 · H.265 · VP9 · GIF",
  "PNG · JPG · WebP thumbnails",
];

const BADGES = [
  { icon: ShieldCheck, label: "100% Private" },
  { icon: Globe,       label: "No Upload" },
  { icon: Zap,         label: "Powered by FFmpeg" },
];

export function FreeTools() {
  return (
    <section className="relative overflow-hidden px-4 py-20 sm:px-6 sm:py-28">
      {/* Ambient glows */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-40 left-1/2 h-[500px] w-[900px] -translate-x-1/2 rounded-full bg-emerald-500/5 blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-violet-500/5 blur-[80px]" />
      </div>

      <div className="mx-auto max-w-7xl">

        {/* Header */}
        <Reveal>
          <div className="mb-12 flex flex-col items-center text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-4 py-1.5 text-sm font-semibold text-emerald-400">
              <Zap className="h-3.5 w-3.5" />
              10 Free Browser Tools · Zero Upload
            </div>
            <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-5xl">
              Everything you need to<br />
              <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                process video — free
              </span>
            </h2>
            <p className="mt-4 max-w-xl text-base text-white/50 sm:text-lg">
              No accounts. No uploads. Your video never leaves your device. All tools run entirely in your browser using WebAssembly.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              {BADGES.map(b => (
                <span key={b.label} className="flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-xs text-white/50">
                  <b.icon className="h-3 w-3" />
                  {b.label}
                </span>
              ))}
            </div>
          </div>
        </Reveal>

        {/* Tool cards grid */}
        <Stagger className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {TOOLS.map((tool) => {
            const Icon = tool.icon;
            return (
              <MotionItem key={tool.label}>
                <Link
                  href={tool.href}
                  className={`group relative flex flex-col gap-4 overflow-hidden rounded-2xl border border-white/[0.07] bg-gradient-to-br ${tool.color} p-5 transition-all duration-300 hover:border-white/[0.14] hover:scale-[1.02] hover:shadow-lg hover:shadow-black/30`}
                >
                  {/* Icon + arrow */}
                  <div className="flex items-start justify-between">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${tool.iconBg}`}>
                      <Icon className={`h-5 w-5 ${tool.iconColor}`} />
                    </div>
                    <ArrowRight className="h-4 w-4 text-white/20 transition-all group-hover:translate-x-0.5 group-hover:text-white/60" />
                  </div>

                  {/* Text */}
                  <div>
                    <p className="font-semibold text-white">{tool.label}</p>
                    <p className="mt-0.5 text-sm text-white/45">{tool.desc}</p>
                  </div>

                  {/* Format tags */}
                  <div className="flex flex-wrap gap-1.5">
                    {tool.formats.map(f => (
                      <span key={f} className="rounded-md border border-white/[0.07] bg-white/[0.05] px-2 py-0.5 text-[10px] font-semibold text-white/40">
                        {f}
                      </span>
                    ))}
                  </div>
                </Link>
              </MotionItem>
            );
          })}

          {/* "See all" card */}
          <MotionItem>
            <Link
              href="/tools"
              className="group flex h-full min-h-[160px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/[0.12] bg-white/[0.015] p-5 text-center transition-all hover:border-emerald-500/30 hover:bg-emerald-500/5"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 transition-all group-hover:bg-emerald-500/20">
                <ArrowRight className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-white">See all free tools</p>
                <p className="mt-0.5 text-xs text-white/40">No sign-up required</p>
              </div>
            </Link>
          </MotionItem>
        </Stagger>

        {/* Scrolling format marquee */}
        <div className="relative mt-10 overflow-hidden">
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-[#07080f] to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-[#07080f] to-transparent" />
          <div className="flex animate-marquee gap-4 whitespace-nowrap will-change-transform">
            {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((item, i) => (
              <span
                key={i}
                className="inline-flex shrink-0 rounded-full border border-white/[0.07] bg-white/[0.03] px-4 py-1.5 text-xs text-white/35"
              >
                {item}
              </span>
            ))}
          </div>
        </div>

        {/* Bottom CTA */}
        <Reveal>
          <div className="mt-12 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/tools"
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 px-7 py-3.5 text-sm font-bold text-white shadow-lg shadow-emerald-900/30 transition hover:from-emerald-500 hover:to-teal-500"
            >
              Open free tools
              <ArrowRight className="h-4 w-4" />
            </Link>
            <p className="text-sm text-white/35">No account needed · Works on any video</p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
