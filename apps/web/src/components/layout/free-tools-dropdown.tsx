"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { ChevronDown, Scissors, FileVideo, Maximize2, FileArchive, Image, Music, Film, Info, Captions, Type } from "lucide-react";
import { cn } from "@/lib/utils";

const TOOLS = [
  {
    category: "Video Editing",
    items: [
      { icon: Scissors, label: "Video Slicer", desc: "Cut 15s, 30s, 45s, 60s clips in bulk", href: "/tools/video-slicer" },
      { icon: Maximize2, label: "Aspect Ratio Converter", desc: "16:9 → 9:16 · 1:1 for Shorts & Reels", href: "/tools/aspect-ratio-converter" },
      { icon: FileArchive, label: "Video Compressor", desc: "Reduce file size without quality loss", href: "/tools/video-compressor" },
      { icon: Film, label: "GIF Generator", desc: "Create GIFs from any video segment", href: "/tools/gif-generator" },
    ],
  },
  {
    category: "Convert & Extract",
    items: [
      { icon: FileVideo, label: "Format Converter", desc: "MP4 ↔ MOV · MP4 → WebM", href: "/tools/format-converter" },
      { icon: Music, label: "Audio Extractor", desc: "Export MP3 or WAV from any video", href: "/tools/audio-extractor" },
      { icon: Image, label: "Thumbnail Extractor", desc: "Grab frames as PNG at any timestamp", href: "/tools/thumbnail-extractor" },
    ],
  },
  {
    category: "Captions & Info",
    items: [
      { icon: Captions, label: "Caption Generator", desc: "Auto-generate transcripts for free", href: "/tools/caption-generator" },
      { icon: Type, label: "Caption Templates", desc: "Simple white caption styles", href: "/tools/caption-templates" },
      { icon: Info, label: "Video Metadata Viewer", desc: "Duration · FPS · Codec · Bitrate", href: "/tools/video-metadata" },
    ],
  },
];

export function FreeToolsDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleMouseEnter() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpen(true);
  }

  function handleMouseLeave() {
    closeTimer.current = setTimeout(() => setOpen(false), 120);
  }

  return (
    <div ref={ref} className="relative" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      <button
        className={cn(
          "flex items-center gap-1 rounded-lg px-4 py-2 text-sm transition-colors",
          open
            ? "bg-white/[0.06] text-white"
            : "text-muted-foreground hover:bg-white/[0.04] hover:text-foreground"
        )}
      >
        Free Tools
        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform duration-200", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute left-1/2 top-full mt-2 w-[680px] -translate-x-1/2 rounded-2xl border border-white/[0.12] bg-[#0d0d1f] p-5 shadow-2xl">
          {/* Top accent line */}
          <div className="absolute inset-x-0 top-0 h-px rounded-t-2xl bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" />

          <div className="grid grid-cols-3 gap-6">
            {TOOLS.map((group) => (
              <div key={group.category}>
                <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-white/30">
                  {group.category}
                </p>
                <ul className="space-y-1">
                  {group.items.map((tool) => {
                    const Icon = tool.icon;
                    return (
                      <li key={tool.href}>
                        <Link
                          href={tool.href}
                          onClick={() => setOpen(false)}
                          className="group flex items-start gap-3 rounded-xl p-2.5 transition-colors hover:bg-white/[0.05]"
                        >
                          <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 transition-colors group-hover:bg-emerald-500/20">
                            <Icon className="h-3.5 w-3.5" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-white/80 group-hover:text-white">
                              {tool.label}
                            </p>
                            <p className="mt-0.5 text-xs text-white/35">{tool.desc}</p>
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="mt-4 border-t border-white/[0.06] pt-3">
            <Link
              href="/tools"
              onClick={() => setOpen(false)}
              className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 hover:underline"
            >
              View all free tools →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
