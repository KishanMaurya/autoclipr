import type { Metadata } from "next";
import { Rocket, Star, ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";
import { ChangelogClient } from "./client";
import { RELEASES } from "./data";

export const metadata: Metadata = {
  title: "Changelog — AutoClipr",
  description: "What's new in AutoClipr — latest features, improvements, and bug fixes.",
};

export default function ChangelogPage() {
  return (
    <div className="min-h-screen">

      {/* Hero */}
      <section className="relative overflow-hidden px-4 pb-16 pt-16 text-center sm:px-6 sm:pt-24">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-0 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-violet-500/6 blur-[100px]" />
          <div className="absolute right-1/4 top-1/3 h-48 w-48 rounded-full bg-emerald-500/5 blur-[60px]" />
          <div
            className="absolute inset-0 opacity-[0.012]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
              backgroundSize: "60px 60px",
            }}
          />
        </div>

        <div className="mx-auto max-w-2xl">
          <span className="section-label mx-auto mb-6 inline-flex items-center gap-2">
            <Rocket className="h-3.5 w-3.5" />
            Product updates
          </span>
          <h1 className="text-4xl font-extrabold leading-tight text-white sm:text-5xl lg:text-6xl">
            What&apos;s{" "}
            <span className="bg-gradient-to-r from-violet-400 via-purple-300 to-pink-400 bg-clip-text text-transparent">
              new
            </span>
          </h1>
          <p className="mt-5 text-lg text-white/45">
            Every feature, fix, and improvement — shipped and documented.
          </p>

          <div className="mt-10 flex flex-wrap justify-center gap-8">
            {[
              { value: `${RELEASES.length}`, label: "Releases" },
              { value: `${RELEASES.reduce((s, r) => s + r.changes.length, 0)}+`, label: "Changes shipped" },
              { value: "Feb 2025", label: "Since launch" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-3xl font-black text-white">{s.value}</p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-white/30">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="px-4 pb-28 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <ChangelogClient releases={RELEASES} />
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-white/[0.05] px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mb-5 flex justify-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-400 shadow-[0_0_28px_rgba(16,185,129,0.3)]">
              <Star className="h-7 w-7 text-white" />
            </span>
          </div>
          <h2 className="text-2xl font-bold text-white sm:text-3xl">
            Have a feature request?
          </h2>
          <p className="mt-3 text-white/45">
            We build AutoClipr based on creator feedback. Tell us what you need.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-4">
            <Link
              href="/feedback"
              className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 px-6 py-3 text-sm font-bold text-white shadow-[0_0_18px_rgba(16,185,129,0.25)] transition-all hover:scale-[1.02] hover:shadow-[0_0_28px_rgba(16,185,129,0.4)]"
            >
              <Sparkles className="h-4 w-4" />
              Request a feature
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-6 py-3 text-sm font-semibold text-white/70 transition-all hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
            >
              Start free — 100 credits
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
