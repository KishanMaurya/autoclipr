import type { Metadata } from "next";
import Link from "next/link";
import {
  Scissors, FileVideo, Maximize2, FileArchive, ImageIcon,
  Music, Film, Info, Captions, Type, ArrowRight, Zap,
  ShieldCheck, Globe, Crop,
} from "lucide-react";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Free Video Tools",
  description: "Free online video tools — slicer, compressor, format converter, audio extractor, caption generator and more.",
  path: "/tools",
});

const TOOLS = [
  {
    icon: Scissors,
    label: "Video Slicer",
    desc: "Cut 15s, 30s, 45s, 60s clips in bulk",
    href: "/tools/video-slicer",
    badge: "Popular",
    color: "emerald",
    gradient: "from-emerald-500/20 to-teal-500/10",
    border: "hover:border-emerald-500/40",
    iconBg: "bg-emerald-500/15 group-hover:bg-emerald-500/25",
    iconColor: "text-emerald-400",
    tag: "Trim · Multi-segment · Fade",
  },
  {
    icon: FileVideo,
    label: "Format Converter",
    desc: "Convert between any video format instantly",
    href: "/tools/format-converter",
    badge: null,
    color: "violet",
    gradient: "from-violet-500/20 to-fuchsia-500/10",
    border: "hover:border-violet-500/40",
    iconBg: "bg-violet-500/15 group-hover:bg-violet-500/25",
    iconColor: "text-violet-400",
    tag: "MP4 · WebM · MOV · GIF · MP3",
  },
  {
    icon: Maximize2,
    label: "Aspect Ratio Converter",
    desc: "Reframe for Shorts, Reels & Stories",
    href: "/tools/aspect-ratio-converter",
    badge: "Popular",
    color: "sky",
    gradient: "from-sky-500/20 to-blue-500/10",
    border: "hover:border-sky-500/40",
    iconBg: "bg-sky-500/15 group-hover:bg-sky-500/25",
    iconColor: "text-sky-400",
    tag: "16:9 · 9:16 · 1:1 · 4:3",
  },
  {
    icon: FileArchive,
    label: "Video Compressor",
    desc: "Reduce file size without quality loss",
    href: "/tools/video-compressor",
    badge: null,
    color: "orange",
    gradient: "from-orange-500/20 to-amber-500/10",
    border: "hover:border-orange-500/40",
    iconBg: "bg-orange-500/15 group-hover:bg-orange-500/25",
    iconColor: "text-orange-400",
    tag: "H.264 · H.265 · VP9",
  },
  {
    icon: ImageIcon,
    label: "Thumbnail Extractor",
    desc: "Grab frames as PNG at any timestamp",
    href: "/tools/thumbnail-extractor",
    badge: null,
    color: "pink",
    gradient: "from-pink-500/20 to-rose-500/10",
    border: "hover:border-pink-500/40",
    iconBg: "bg-pink-500/15 group-hover:bg-pink-500/25",
    iconColor: "text-pink-400",
    tag: "PNG · JPEG · Any timestamp",
  },
  {
    icon: Music,
    label: "Audio Extractor",
    desc: "Export MP3 or WAV from any video",
    href: "/tools/audio-extractor",
    badge: null,
    color: "cyan",
    gradient: "from-cyan-500/20 to-teal-500/10",
    border: "hover:border-cyan-500/40",
    iconBg: "bg-cyan-500/15 group-hover:bg-cyan-500/25",
    iconColor: "text-cyan-400",
    tag: "MP3 · WAV · M4A · OGG",
  },
  {
    icon: Film,
    label: "GIF Generator",
    desc: "Create GIFs from any video segment",
    href: "/tools/gif-generator",
    badge: null,
    color: "yellow",
    gradient: "from-yellow-500/20 to-amber-500/10",
    border: "hover:border-yellow-500/40",
    iconBg: "bg-yellow-500/15 group-hover:bg-yellow-500/25",
    iconColor: "text-yellow-400",
    tag: "Looped · Custom FPS · Scale",
  },
  {
    icon: Info,
    label: "Video Metadata Viewer",
    desc: "Inspect codec, bitrate, FPS and more",
    href: "/tools/video-metadata",
    badge: null,
    color: "slate",
    gradient: "from-slate-500/20 to-zinc-500/10",
    border: "hover:border-slate-400/40",
    iconBg: "bg-slate-500/15 group-hover:bg-slate-500/25",
    iconColor: "text-slate-400",
    tag: "Duration · FPS · Codec · Bitrate",
  },
  {
    icon: Captions,
    label: "Caption Generator",
    desc: "Auto-generate transcripts for free",
    href: "/tools/caption-generator",
    badge: "AI",
    color: "indigo",
    gradient: "from-indigo-500/20 to-purple-500/10",
    border: "hover:border-indigo-500/40",
    iconBg: "bg-indigo-500/15 group-hover:bg-indigo-500/25",
    iconColor: "text-indigo-400",
    tag: "SRT · VTT · 6 languages",
  },
  {
    icon: Type,
    label: "Caption Templates",
    desc: "Stylish caption overlays for social",
    href: "/tools/caption-templates",
    badge: null,
    color: "rose",
    gradient: "from-rose-500/20 to-pink-500/10",
    border: "hover:border-rose-500/40",
    iconBg: "bg-rose-500/15 group-hover:bg-rose-500/25",
    iconColor: "text-rose-400",
    tag: "Bold · Minimal · Karaoke",
  },
];

const STATS = [
  { icon: <ShieldCheck className="h-4 w-4" />, label: "100% Private", sub: "Nothing leaves your browser" },
  { icon: <Globe       className="h-4 w-4" />, label: "No Upload",    sub: "Powered by WebAssembly" },
  { icon: <Zap         className="h-4 w-4" />, label: "No Signup",    sub: "Free forever, no account" },
];

export default function ToolsPage() {
  return (
    <div className="relative min-h-screen bg-[#07080f]">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-emerald-500/5 blur-[120px]" />
        <div className="absolute top-1/3 -left-40 h-[400px] w-[400px] rounded-full bg-violet-500/5 blur-[100px]" />
        <div className="absolute top-1/3 -right-40 h-[400px] w-[400px] rounded-full bg-sky-500/5 blur-[100px]" />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6">

        {/* ── Header ── */}
        <div className="mb-16 text-center">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/8 px-4 py-1.5">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400 shadow-[0_0_6px_2px_rgba(52,211,153,0.6)]" />
            <span className="text-xs font-semibold uppercase tracking-widest text-emerald-400">100% Free · No Signup</span>
          </div>

          <h1 className="text-5xl font-extrabold tracking-tight text-white sm:text-6xl">
            Free Video{" "}
            <span className="relative">
              <span className="bg-gradient-to-r from-emerald-400 via-cyan-400 to-violet-400 bg-clip-text text-transparent">
                Tools
              </span>
              <span className="absolute -bottom-1 left-0 h-px w-full bg-gradient-to-r from-emerald-400/50 via-cyan-400/50 to-violet-400/50" />
            </span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base text-white/40 leading-relaxed">
            Professional video editing tools that run entirely in your browser.
            <br className="hidden sm:block" /> No uploads, no accounts, no cost — ever.
          </p>

          {/* Stat pills */}
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {STATS.map(s => (
              <div key={s.label} className="flex items-center gap-2.5 rounded-full border border-white/[0.07] bg-white/[0.03] px-4 py-2">
                <span className="text-emerald-400">{s.icon}</span>
                <div className="text-left">
                  <p className="text-xs font-semibold text-white/80 leading-none">{s.label}</p>
                  <p className="mt-0.5 text-[10px] text-white/30 leading-none">{s.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Featured hero tool ── */}
        <Link
          href={TOOLS[0].href}
          className="group relative mb-6 flex items-center gap-6 overflow-hidden rounded-3xl border border-white/[0.07] bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent p-7 transition-all duration-300 hover:border-emerald-500/30 hover:shadow-[0_0_60px_-15px_rgba(52,211,153,0.2)] sm:p-8"
        >
          {/* glow orb */}
          <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl transition-all duration-500 group-hover:bg-emerald-500/20" />

          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/20 transition-all group-hover:scale-110 group-hover:bg-emerald-500/30">
            <Scissors className="h-8 w-8" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3">
              <p className="text-xl font-bold text-white">{TOOLS[0].label}</p>
              <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                Most Popular
              </span>
            </div>
            <p className="mt-1 text-sm text-white/50">{TOOLS[0].desc}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {["Multi-segment", "Fade In/Out", "Speed Control", "9:16 Crop", "GIF Export"].map(t => (
                <span key={t} className="rounded-md bg-white/[0.04] px-2 py-0.5 text-[10px] text-white/40 border border-white/[0.06]">{t}</span>
              ))}
            </div>
          </div>

          <div className="hidden shrink-0 sm:flex items-center gap-1.5 text-sm font-semibold text-emerald-400 group-hover:gap-3 transition-all">
            Open tool <ArrowRight className="h-4 w-4" />
          </div>
        </Link>

        {/* ── Format converter hero (second featured) ── */}
        <Link
          href={TOOLS[1].href}
          className="group relative mb-6 flex items-center gap-6 overflow-hidden rounded-3xl border border-white/[0.07] bg-gradient-to-br from-violet-500/10 via-fuchsia-500/5 to-transparent p-7 transition-all duration-300 hover:border-violet-500/30 hover:shadow-[0_0_60px_-15px_rgba(139,92,246,0.2)] sm:p-8"
        >
          <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-violet-500/10 blur-3xl transition-all duration-500 group-hover:bg-violet-500/20" />

          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-violet-500/20 text-violet-400 ring-1 ring-violet-500/20 transition-all group-hover:scale-110 group-hover:bg-violet-500/30">
            <FileVideo className="h-8 w-8" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3">
              <p className="text-xl font-bold text-white">{TOOLS[1].label}</p>
              <span className="rounded-full bg-violet-500/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-violet-400">
                New
              </span>
            </div>
            <p className="mt-1 text-sm text-white/50">{TOOLS[1].desc}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {["MP4", "WebM", "MOV", "GIF", "MP3", "M4A", "WAV"].map(t => (
                <span key={t} className="rounded-md bg-white/[0.04] px-2 py-0.5 text-[10px] text-white/40 border border-white/[0.06]">{t}</span>
              ))}
            </div>
          </div>

          <div className="hidden shrink-0 sm:flex items-center gap-1.5 text-sm font-semibold text-violet-400 group-hover:gap-3 transition-all">
            Open tool <ArrowRight className="h-4 w-4" />
          </div>
        </Link>

        {/* ── Aspect Ratio Converter hero (third featured) ── */}
        <Link
          href={TOOLS[2].href}
          className="group relative mb-6 flex items-center gap-6 overflow-hidden rounded-3xl border border-white/[0.07] bg-gradient-to-br from-orange-500/10 via-amber-500/5 to-transparent p-7 transition-all duration-300 hover:border-orange-500/30 hover:shadow-[0_0_60px_-15px_rgba(249,115,22,0.2)] sm:p-8"
        >
          <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-orange-500/10 blur-3xl transition-all duration-500 group-hover:bg-orange-500/20" />

          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-orange-500/20 text-orange-400 ring-1 ring-orange-500/20 transition-all group-hover:scale-110 group-hover:bg-orange-500/30">
            <Crop className="h-8 w-8" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3">
              <p className="text-xl font-bold text-white">{TOOLS[2].label}</p>
              <span className="rounded-full bg-orange-500/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-orange-400">
                New
              </span>
            </div>
            <p className="mt-1 text-sm text-white/50">{TOOLS[2].desc}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {["16:9", "9:16", "1:1", "4:5", "21:9", "Custom", "Crop · Pad · Stretch"].map(t => (
                <span key={t} className="rounded-md bg-white/[0.04] px-2 py-0.5 text-[10px] text-white/40 border border-white/[0.06]">{t}</span>
              ))}
            </div>
          </div>

          <div className="hidden shrink-0 sm:flex items-center gap-1.5 text-sm font-semibold text-orange-400 group-hover:gap-3 transition-all">
            Open tool <ArrowRight className="h-4 w-4" />
          </div>
        </Link>

        {/* ── Section label ── */}
        <div className="mb-4 flex items-center gap-3">
          <div className="h-px flex-1 bg-white/[0.05]" />
          <p className="text-xs font-semibold uppercase tracking-widest text-white/20">All Tools</p>
          <div className="h-px flex-1 bg-white/[0.05]" />
        </div>

        {/* ── Tool grid ── */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {TOOLS.slice(3).map((tool) => {
            const Icon = tool.icon;
            return (
              <Link
                key={tool.href}
                href={tool.href}
                className={`group relative flex flex-col gap-4 overflow-hidden rounded-2xl border border-white/[0.06] bg-gradient-to-br ${tool.gradient} bg-white/[0.02] p-5 transition-all duration-300 ${tool.border} hover:shadow-lg hover:-translate-y-0.5`}
              >
                {/* icon */}
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${tool.iconBg} ${tool.iconColor} transition-all duration-300`}>
                  <Icon className="h-5 w-5" />
                </div>

                <div className="flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-white/90 group-hover:text-white text-sm leading-snug">{tool.label}</p>
                    {tool.badge && (
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider
                        ${tool.badge === "AI"
                          ? "bg-indigo-500/20 text-indigo-400"
                          : "bg-emerald-500/15 text-emerald-400"}`}>
                        {tool.badge}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-white/35 leading-snug">{tool.desc}</p>
                </div>

                {/* tag strip */}
                <p className={`text-[10px] font-medium ${tool.iconColor} opacity-60 group-hover:opacity-100 transition-opacity`}>
                  {tool.tag}
                </p>

                {/* hover arrow */}
                <ArrowRight className={`absolute bottom-4 right-4 h-3.5 w-3.5 ${tool.iconColor} opacity-0 group-hover:opacity-100 transition-all translate-x-1 group-hover:translate-x-0`} />
              </Link>
            );
          })}
        </div>

        {/* ── Bottom CTA ── */}
        <div className="mt-16 text-center">
          <p className="text-sm text-white/30">
            More tools shipping soon —{" "}
            <Link href="/register" className="text-emerald-400 hover:text-emerald-300 underline underline-offset-2 transition-colors">
              get notified
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
