"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { X, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

export function AnnouncementBanner() {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    const target = document.getElementById("url-to-shorts");
    if (!target) return;

    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisible(true);
      },
      { threshold: 0.1 }
    );

    observerRef.current.observe(target);
    return () => observerRef.current?.disconnect();
  }, []);

  if (dismissed) return null;

  return (
    <div
      className={cn(
        "fixed bottom-6 left-1/2 z-50 w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 transition-all duration-500",
        visible ? "translate-y-0 opacity-100" : "translate-y-16 opacity-0 pointer-events-none"
      )}
    >
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/[0.1] bg-[#0f0f1a]/95 px-4 py-3 shadow-2xl shadow-black/60 backdrop-blur-xl sm:px-5">
        {/* Left: icon + text */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400">
            <Zap className="h-4 w-4 fill-emerald-400" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white leading-tight">
              Start growing your channel today
            </p>
            <p className="text-xs text-white/40 mt-0.5">
              Free forever &nbsp;·&nbsp; 20M+ creators &nbsp;·&nbsp; No credit card
            </p>
          </div>
        </div>

        {/* Right: CTA + close */}
        <div className="flex shrink-0 items-center gap-2">
          <Link
            href="/register"
            className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-bold text-black transition hover:bg-white/90 whitespace-nowrap"
          >
            <svg width="14" height="14" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
              <path d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 6.293C4.672 4.166 6.656 3.58 9 3.58z" fill="#EA4335"/>
            </svg>
            Try Free
          </Link>
          <button
            onClick={() => setDismissed(true)}
            className="flex h-7 w-7 items-center justify-center rounded-full text-white/40 transition hover:bg-white/10 hover:text-white"
            aria-label="Dismiss"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
