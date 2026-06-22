"use client";

import { useState } from "react";
import Link from "next/link";
import { Scissors, ChevronDown, X, Menu } from "lucide-react";

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

export function MobileMenu({ isLoggedIn }: { isLoggedIn: boolean }) {
  const [open, setOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [resourcesOpen, setResourcesOpen] = useState(false);

  const close = () => {
    setOpen(false);
    setToolsOpen(false);
    setResourcesOpen(false);
  };

  return (
    <div className="md:hidden">
      {/* Hamburger */}
      <button
        onClick={() => setOpen(true)}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-white/60 hover:text-white transition-colors"
        aria-label="Open menu"
      >
        <Menu className="h-6 w-6" />
      </button>

      {/* Full-screen overlay */}
      {open && (
        <div className="fixed inset-0 z-[999] flex flex-col bg-[#0a0a18]">
          {/* Top bar */}
          <div className="flex h-14 items-center justify-between px-4 border-b border-white/[0.06]">
            <Link href="/" onClick={close} className="flex items-center gap-2 font-bold">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500">
                <Scissors className="h-4 w-4 text-white" />
              </span>
              <span className="text-white text-sm">AutoClipr<span className="text-emerald-400">.ai</span></span>
            </Link>
            <button
              onClick={close}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-white/50 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Nav items */}
          <nav className="flex-1 overflow-y-auto divide-y divide-white/[0.06]">

            {/* Features */}
            <Link href="/#features" onClick={close} className="flex items-center justify-between px-5 py-4 text-base font-medium text-white hover:bg-white/[0.04] transition-colors">
              Features
            </Link>

            {/* Free Tools accordion */}
            <div>
              <button
                onClick={() => setToolsOpen((p) => !p)}
                className="flex w-full items-center justify-between px-5 py-4 text-base font-medium text-white hover:bg-white/[0.04] transition-colors"
              >
                Free YouTube Tools
                <ChevronDown className={`h-5 w-5 text-white/40 transition-transform duration-200 ${toolsOpen ? "rotate-180" : ""}`} />
              </button>
              {toolsOpen && (
                <div className="divide-y divide-white/[0.04] bg-white/[0.02]">
                  {FREE_TOOLS.map((t) => (
                    <Link
                      key={t.href}
                      href={t.href}
                      onClick={close}
                      className="flex items-center px-8 py-3 text-sm text-white/60 hover:text-white hover:bg-white/[0.04] transition-colors"
                    >
                      {t.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Coaching */}
            <Link href="/coaching" onClick={close} className="flex items-center justify-between px-5 py-4 text-base font-medium text-white hover:bg-white/[0.04] transition-colors">
              Coaching
            </Link>

            {/* Top Creators */}
            <Link href="/top-creators" onClick={close} className="flex items-center justify-between px-5 py-4 text-base font-medium text-white hover:bg-white/[0.04] transition-colors">
              Top 100 YouTube Channels
            </Link>

            {/* Resources accordion */}
            <div>
              <button
                onClick={() => setResourcesOpen((p) => !p)}
                className="flex w-full items-center justify-between px-5 py-4 text-base font-medium text-white hover:bg-white/[0.04] transition-colors"
              >
                Resources
                <ChevronDown className={`h-5 w-5 text-white/40 transition-transform duration-200 ${resourcesOpen ? "rotate-180" : ""}`} />
              </button>
              {resourcesOpen && (
                <div className="divide-y divide-white/[0.04] bg-white/[0.02]">
                  {RESOURCES.map((r) => (
                    <Link
                      key={r.href}
                      href={r.href}
                      onClick={close}
                      className="flex items-center px-8 py-3 text-sm text-white/60 hover:text-white hover:bg-white/[0.04] transition-colors"
                    >
                      {r.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Pricing */}
            <Link href="/pricing" onClick={close} className="flex items-center justify-between px-5 py-4 text-base font-medium text-white hover:bg-white/[0.04] transition-colors">
              Pricing
            </Link>
          </nav>

          {/* Bottom CTA */}
          <div className="border-t border-white/[0.06] p-4 space-y-3">
            {isLoggedIn ? (
              <Link
                href="/dashboard"
                onClick={close}
                className="block w-full rounded-xl bg-emerald-500 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-emerald-400 transition-colors"
              >
                Go to Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/register"
                  onClick={close}
                  className="block w-full rounded-xl bg-emerald-500 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-emerald-400 transition-colors"
                >
                  Start free
                </Link>
                <Link
                  href="/login"
                  onClick={close}
                  className="block w-full rounded-xl border border-white/10 px-4 py-3 text-center text-sm font-medium text-white/70 hover:bg-white/[0.06] hover:text-white transition-colors"
                >
                  Log in
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
