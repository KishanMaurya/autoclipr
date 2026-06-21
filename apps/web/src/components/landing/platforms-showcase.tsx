import Link from "next/link";
import { Check } from "lucide-react";
import { Reveal, Stagger } from "@/components/ui/motion";

const PLATFORMS = [
  {
    name: "YouTube",
    accent: "text-red-500",
    borderActive: "border-red-500/30",
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
      <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
        <rect width="32" height="32" rx="8" fill="#FF0000" />
        <polygon points="13,10 13,22 23,16" fill="#fff" />
      </svg>
    ),
  },
  {
    name: "Instagram",
    accent: "text-pink-500",
    borderActive: "border-pink-500/30",
    badge: "NEW",
    badgeColor: "bg-gradient-to-r from-pink-500 to-orange-400",
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
      <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="ig-grad" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f09433" />
            <stop offset="25%" stopColor="#e6683c" />
            <stop offset="50%" stopColor="#dc2743" />
            <stop offset="75%" stopColor="#cc2366" />
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

export function PlatformsShowcase() {
  return (
    <section className="border-t border-white/5 px-4 py-24 sm:px-6">
      <div className="mx-auto max-w-6xl">
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
            <div
              key={p.name}
              className={`relative flex flex-col rounded-3xl border bg-[#0d0d18] p-8 transition-colors hover:${p.borderActive} border-white/[0.08]`}
            >
              {p.badge && (
                <span className={`absolute right-6 top-6 rounded-full ${p.badgeColor} px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white`}>
                  {p.badge}
                </span>
              )}

              {/* Header */}
              <div className="flex items-center gap-3 mb-5">
                {p.icon}
                <div>
                  <h3 className={`text-xl font-bold ${p.accent}`}>{p.name}</h3>
                  <p className="text-xs text-white/40">{p.tagline}</p>
                </div>
              </div>

              {/* Description */}
              <p className="mb-6 text-sm leading-relaxed text-muted-foreground">{p.description}</p>

              {/* Features */}
              <ul className="mb-8 space-y-2.5">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-white/70">
                    <Check className={`mt-0.5 h-4 w-4 shrink-0 ${p.accent}`} />
                    {f}
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <Link href="/register" className={`mt-auto text-sm font-semibold transition ${p.ctaColor}`}>
                {p.cta}
              </Link>
            </div>
          ))}
        </Stagger>

        {/* Footer line */}
        <Reveal className="mt-10 text-center" delay={0.2}>
          <p className="mb-5 text-sm text-white/30">One subscription. Both platforms. No extra logins.</p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-pink-500 to-orange-400 px-6 py-2.5 text-sm font-bold text-white transition hover:opacity-90"
          >
            Start clipping on both platforms →
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
