import type { Metadata } from "next";
import Link from "next/link";
import { Scissors, FileVideo, Maximize2, FileArchive, Image, Music, Film, Info, Captions, Type } from "lucide-react";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Free Video Tools",
  description: "Free online video tools — slicer, compressor, format converter, audio extractor, caption generator and more.",
  path: "/tools",
});

const TOOLS = [
  { icon: Scissors, label: "Video Slicer", desc: "Cut 15s, 30s, 45s, 60s clips in bulk", href: "/tools/video-slicer", badge: "Popular" },
  { icon: FileVideo, label: "Format Converter", desc: "MP4 ↔ MOV · MP4 → WebM", href: "/tools/format-converter" },
  { icon: Maximize2, label: "Aspect Ratio Converter", desc: "16:9 → 9:16 · 1:1 for Shorts & Reels", href: "/tools/aspect-ratio-converter", badge: "Popular" },
  { icon: FileArchive, label: "Video Compressor", desc: "Reduce file size without quality loss", href: "/tools/video-compressor" },
  { icon: Image, label: "Thumbnail Extractor", desc: "Grab frames as PNG at any timestamp", href: "/tools/thumbnail-extractor" },
  { icon: Music, label: "Audio Extractor", desc: "Export MP3 or WAV from any video", href: "/tools/audio-extractor" },
  { icon: Film, label: "GIF Generator", desc: "Create GIFs from any video segment", href: "/tools/gif-generator" },
  { icon: Info, label: "Video Metadata Viewer", desc: "Duration · FPS · Codec · Bitrate", href: "/tools/video-metadata" },
  { icon: Captions, label: "Caption Generator", desc: "Auto-generate transcripts for free", href: "/tools/caption-generator" },
  { icon: Type, label: "Caption Templates", desc: "Simple white caption styles", href: "/tools/caption-templates" },
];

export default function ToolsPage() {
  return (
    <div className="relative pt-16">
      <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
        {/* Header */}
        <div className="mb-12 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/8 px-4 py-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_2px_rgba(52,211,153,0.6)]" />
            <span className="text-xs font-semibold uppercase tracking-widest text-emerald-400">100% Free</span>
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
            Free Video{" "}
            <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              Tools
            </span>
          </h1>
          <p className="mx-auto mt-4 max-w-lg text-white/50">
            Professional video editing tools — completely free, no signup required.
          </p>
        </div>

        {/* Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {TOOLS.map((tool) => {
            const Icon = tool.icon;
            return (
              <Link
                key={tool.href}
                href={tool.href}
                className="group relative flex items-start gap-4 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 transition-all hover:border-emerald-500/30 hover:bg-white/[0.05]"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 transition-colors group-hover:bg-emerald-500/20">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-white/90 group-hover:text-white">{tool.label}</p>
                    {tool.badge && (
                      <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-400">
                        {tool.badge}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-white/40">{tool.desc}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
