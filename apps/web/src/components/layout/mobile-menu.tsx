"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X, Scissors, ChevronDown } from "lucide-react";

const FREE_TOOLS = [
  { href: "/tools/video-trimmer", label: "Video Trimmer" },
  { href: "/tools/clip-extractor", label: "Clip Extractor" },
  { href: "/tools/video-compressor", label: "Video Compressor" },
  { href: "/tools/gif-generator", label: "GIF Generator" },
  { href: "/tools/subtitle-generator", label: "Subtitle Generator" },
  { href: "/tools/transcript-extractor", label: "Transcript Extractor" },
  { href: "/tools/aspect-ratio-converter", label: "Aspect Ratio Converter" },
  { href: "/tools/thumbnail-downloader", label: "Thumbnail Downloader" },
  { href: "/tools/channel-analyzer", label: "Channel Analyzer" },
  { href: "/tools/viral-score-checker", label: "Viral Score Checker" },
];

const RESOURCES = [
  { href: "/blog", label: "Blog" },
  { href: "/faq", label: "FAQ" },
  { href: "/tutorials", label: "Tutorials" },
  { href: "/success-stories", label: "Success Stories" },
  { href: "/#how-it-works", label: "How it Works" },
  { href: "/changelog", label: "Changelog" },
  { href: "/affiliate", label: "Affiliate" },
];

const MAIN_LINKS = [
  { href: "/#features", label: "Features" },
  { href: "/#how-it-works", label: "How it Works" },
  { href: "/coaching", label: "Coaching" },
  { href: "/top-creators", label: "Top Creators" },
  { href: "/pricing", label: "Pricing" },
];

export function MobileMenu({ isLoggedIn }: { isLoggedIn: boolean }) {
  const [open, setOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [resourcesOpen, setResourcesOpen] = useState(false);

  const close = () => setOpen(false);

  return (
    <div className="md:hidden">
      <button
        onClick={() => setOpen(true)}
        className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-white/70 hover:bg-white/[0.08] hover:text-white transition-colors"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          onClick={close}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed inset-y-0 right-0 z-50 flex w-72 flex-col bg-[#0a0a1a] border-l border-white/[0.06] transition-transform duration-300 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
          <div className="flex items-center gap-2 font-bold">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500">
              <Scissors className="h-4 w-4 text-white" />
            </span>
            <span className="text-white">AutoClipr<span className="text-emerald-400">.ai</span></span>
          </div>
          <button
            onClick={close}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-white/40 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Links */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
          {MAIN_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={close}
              className="flex items-center rounded-xl px-4 py-2.5 text-sm font-medium text-white/70 transition-colors hover:bg-white/[0.06] hover:text-white"
            >
              {l.label}
            </Link>
          ))}

          {/* Free Tools accordion */}
          <div>
            <button
              onClick={() => setToolsOpen((p) => !p)}
              className="flex w-full items-center justify-between rounded-xl px-4 py-2.5 text-sm font-medium text-white/70 transition-colors hover:bg-white/[0.06] hover:text-white"
            >
              Free Tools
              <ChevronDown className={`h-4 w-4 transition-transform ${toolsOpen ? "rotate-180" : ""}`} />
            </button>
            {toolsOpen && (
              <div className="ml-4 mt-0.5 space-y-0.5 border-l border-white/[0.06] pl-3">
                {FREE_TOOLS.map((t) => (
                  <Link
                    key={t.href}
                    href={t.href}
                    onClick={close}
                    className="block rounded-lg px-3 py-2 text-xs text-white/50 hover:bg-white/[0.04] hover:text-white/80 transition-colors"
                  >
                    {t.label}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Resources accordion */}
          <div>
            <button
              onClick={() => setResourcesOpen((p) => !p)}
              className="flex w-full items-center justify-between rounded-xl px-4 py-2.5 text-sm font-medium text-white/70 transition-colors hover:bg-white/[0.06] hover:text-white"
            >
              Resources
              <ChevronDown className={`h-4 w-4 transition-transform ${resourcesOpen ? "rotate-180" : ""}`} />
            </button>
            {resourcesOpen && (
              <div className="ml-4 mt-0.5 space-y-0.5 border-l border-white/[0.06] pl-3">
                {RESOURCES.map((r) => (
                  <Link
                    key={r.href}
                    href={r.href}
                    onClick={close}
                    className="block rounded-lg px-3 py-2 text-xs text-white/50 hover:bg-white/[0.04] hover:text-white/80 transition-colors"
                  >
                    {r.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </nav>

        {/* CTA */}
        <div className="border-t border-white/[0.06] p-4 space-y-2">
          {isLoggedIn ? (
            <Link
              href="/dashboard"
              onClick={close}
              className="block w-full rounded-xl bg-emerald-500 px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-emerald-400 transition-colors"
            >
              Dashboard
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                onClick={close}
                className="block w-full rounded-xl border border-white/10 px-4 py-2.5 text-center text-sm font-medium text-white/70 hover:bg-white/[0.06] hover:text-white transition-colors"
              >
                Log in
              </Link>
              <Link
                href="/register"
                onClick={close}
                className="block w-full rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 px-4 py-2.5 text-center text-sm font-semibold text-white hover:from-emerald-500 hover:to-emerald-400 transition-all"
              >
                Start free
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
