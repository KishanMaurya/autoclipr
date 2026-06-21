"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import { useRef, useState } from "react";
import { Reveal, Stagger } from "@/components/ui/motion";

const PLATFORMS = [
  {
    name: "YouTube",
    accent: "text-red-400",
    glow: "rgba(239,68,68,0.15)",
    borderHover: "rgba(239,68,68,0.4)",
    tagline: "Where creators go viral",
    description:
      "94% of our clips get recommended by the YouTube algorithm. AutoClipr finds the exact moments that drive views, subscribers, and watch time.",
    features: [
      "AI Shorts clip extraction from long videos",
      "Auto captions tuned for YouTube retention",
      "Viral score prediction before you post",
    ],
    cta: "Start clipping for YouTube →",
    ctaColor: "text-red-400 hover:text-red-300",
    icon: (
      <svg width="36" height="36" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
        <rect width="32" height="32" rx="8" fill="#FF0000" />
        <polygon points="13,10 13,22 23,16" fill="#fff" />
      </svg>
    ),
  },
  {
    name: "Instagram",
    accent: "text-pink-400",
    glow: "rgba(236,72,153,0.15)",
    borderHover: "rgba(236,72,153,0.4)",
    badge: "NEW",
    badgeGradient: "linear-gradient(to right, #ec4899, #f97316)",
    tagline: "Reels that reach non-followers",
    description:
      "55% of Reels views come from people who don't follow you. AutoClipr creates short-form clips optimised for Instagram's discovery engine.",
    features: [
      "Reel-format export with vertical crop",
      "Hook optimisation for first 3 seconds",
      "Hashtag & caption suggestions",
    ],
    cta: "Start clipping for Instagram →",
    ctaColor: "text-pink-400 hover:text-pink-300",
    icon: (
      <svg width="36" height="36" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="ig-grad" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f09433" />
            <stop offset="50%" stopColor="#dc2743" />
            <stop offset="100%" stopColor="#bc1888" />
          </linearGradient>
        </defs>
        <rect width="32" height="32" rx="8" fill="url(#ig-grad)" />
        <rect x="9" y="9" width="14" height="14" rx="4" fill="none" stroke="#fff" strokeWidth="1.5" />
        <circle cx="16" cy="16" r="3.5" fill="none" stroke="#fff" strokeWidth="1.5" />
        <circle cx="21.5" cy="10.5" r="1" fill="#fff" />
      </svg>
    ),
  },
];

function PlatformCard({ p }: { p: typeof PLATFORMS[number] }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [mouse, setMouse] = useState({ x: 50, y: 50 });
  const [hovered, setHovered] = useState(false);

  function onMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = cardRef.current!.getBoundingClientRect();
    setMouse({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    });
  }

  return (
    <div
      ref={cardRef}
      onMouseMove={onMouseMove}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative flex flex-col overflow-hidden rounded-3xl border border-white/[0.08] bg-[#0d0d18] p-8 transition-all duration-300"
      style={{
        borderColor: hovered ? p.borderHover : undefined,
      }}
    >
      {/* Mouse-tracking gradient glow */}
      <div
        className="pointer-events-none absolute inset-0 transition-opacity duration-500"
        style={{
          opacity: hovered ? 1 : 0,
          background: `radial-gradient(400px circle at ${mouse.x}% ${mouse.y}%, ${p.glow}, transparent 70%)`,
        }}
      />

      {/* Ambient animated gradient in corner */}
      <div
        className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full blur-3xl transition-opacity duration-700"
        style={{
          opacity: hovered ? 0.35 : 0.1,
          background: p.glow,
        }}
      />

      {/* NEW badge */}
      {p.badge && (
        <span
          className="absolute right-6 top-6 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white"
          style={{ background: p.badgeGradient }}
        >
          {p.badge}
        </span>
      )}

      {/* Header */}
      <div className="relative flex items-center gap-3 mb-5">
        {p.icon}
        <div>
          <h3 className={`text-xl font-bold ${p.accent}`}>{p.name}</h3>
          <p className="text-xs text-white/40">{p.tagline}</p>
        </div>
      </div>

      {/* Description */}
      <p className="relative mb-6 text-sm leading-relaxed text-muted-foreground">{p.description}</p>

      {/* Features */}
      <ul className="relative mb-8 space-y-2.5">
        {p.features.map((f) => (
          <li key={f} className="flex items-start gap-2.5 text-sm text-white/70">
            <Check className={`mt-0.5 h-4 w-4 shrink-0 ${p.accent}`} />
            {f}
          </li>
        ))}
      </ul>

      {/* CTA */}
      <Link href="/register" className={`relative mt-auto text-sm font-semibold transition ${p.ctaColor}`}>
        {p.cta}
      </Link>
    </div>
  );
}

export function PlatformsShowcase() {
  return (
    <section className="relative border-t border-white/5 px-4 py-24 sm:px-6 overflow-hidden">
      {/* Section-level animated background blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/4 top-1/3 h-96 w-96 animate-pulse rounded-full bg-red-500/5 blur-3xl" />
        <div className="absolute right-1/4 bottom-1/3 h-96 w-96 animate-pulse rounded-full bg-pink-500/5 blur-3xl [animation-delay:1.5s]" />
      </div>

      <div className="relative mx-auto max-w-6xl">
        <Reveal className="mb-14 text-center">
          <p className="section-label mx-auto mb-6">Platforms</p>
          <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            One app. Every platform{" "}
            <span className="text-aurora">you grow on.</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground sm:text-lg">
            One toolkit for YouTube Shorts and Instagram Reels — AI clipping and captions
            tuned to how each platform actually works.
          </p>
        </Reveal>

        <Stagger className="grid gap-6 lg:grid-cols-2" amount={0.15}>
          {PLATFORMS.map((p) => (
            <PlatformCard key={p.name} p={p} />
          ))}
        </Stagger>

        {/* Footer line */}
        <Reveal className="mt-10 text-center" delay={0.2}>
          <p className="mb-5 text-sm text-white/30">One subscription. Both platforms. No extra logins.</p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-pink-500 to-orange-400 px-6 py-2.5 text-sm font-bold text-white transition hover:opacity-90 hover:scale-105"
          >
            Start clipping on both platforms →
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
