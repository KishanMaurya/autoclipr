import type { Metadata } from "next";
import { TrendingUp, Zap } from "lucide-react";
import {
  StoriesGrid,
  StatsRow,
  TestimonialsSection,
  HowItWorksSection,
  FaqSection,
  CtaSection,
} from "./client";

export const metadata: Metadata = {
  title: "Success Stories — AutoClipr",
  description: "Real results from creators using AutoClipr to turn long-form videos into viral short-form content.",
};

export default function SuccessStoriesPage() {
  return (
    <div className="min-h-screen">

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden px-4 pb-20 pt-16 text-center sm:px-6 sm:pt-24">
        {/* Layered bg glows */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-[-10%] h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-emerald-500/8 blur-[120px]" />
          <div className="absolute left-[20%] top-[30%] h-64 w-64 rounded-full bg-violet-500/6 blur-[80px]" />
          <div className="absolute right-[15%] top-[20%] h-48 w-48 rounded-full bg-blue-500/6 blur-[80px]" />
          {/* Faint grid */}
          <div
            className="absolute inset-0 opacity-[0.015]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
              backgroundSize: "60px 60px",
            }}
          />
        </div>

        <div className="mx-auto max-w-4xl">
          <span className="section-label mx-auto mb-6 inline-flex items-center gap-2">
            <TrendingUp className="h-3.5 w-3.5" />
            Real results from real creators
          </span>

          <h1 className="text-4xl font-extrabold leading-[1.1] tracking-tight text-white sm:text-6xl lg:text-7xl">
            Creator{" "}
            <span className="relative inline-block">
              <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
                Success Stories
              </span>
              {/* Underline glow */}
              <span className="absolute -bottom-1 left-0 h-0.5 w-full bg-gradient-to-r from-emerald-400/0 via-emerald-400/60 to-emerald-400/0" />
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-white/45">
            Creators using AutoClipr to turn long-form videos into viral short-form content — completely automatically.
          </p>

          <StatsRow />
        </div>
      </section>

      {/* ── Stories Grid ─────────────────────────────────────────────── */}
      <section className="px-4 pb-24 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <StoriesGrid />
        </div>
      </section>

      {/* ── Testimonials ─────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-y border-white/[0.05] px-4 py-20 sm:px-6">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-white/[0.01] via-transparent to-transparent" />
        <div className="mx-auto max-w-6xl">
          <p className="mb-10 text-center text-xs font-bold uppercase tracking-[0.2em] text-white/25">
            What creators are saying
          </p>
          <TestimonialsSection />
        </div>
      </section>

      {/* ── How It Works ─────────────────────────────────────────────── */}
      <section className="px-4 py-24 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <div className="mb-14 text-center">
            <span className="section-label mb-5 inline-flex items-center gap-2">
              <Zap className="h-3.5 w-3.5" />
              How it works
            </span>
            <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
              Go viral in{" "}
              <span className="bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">
                3 steps
              </span>
            </h2>
            <p className="mt-3 text-white/40">No editing skills required. No complex setup.</p>
          </div>
          <HowItWorksSection />
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────── */}
      <section className="border-t border-white/[0.05] px-4 py-24 sm:px-6">
        <div className="mx-auto max-w-2xl">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-extrabold text-white">
              Frequently asked{" "}
              <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
                questions
              </span>
            </h2>
          </div>
          <FaqSection />
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────── */}
      <section className="px-4 pb-28 sm:px-6">
        <CtaSection />
      </section>

    </div>
  );
}
