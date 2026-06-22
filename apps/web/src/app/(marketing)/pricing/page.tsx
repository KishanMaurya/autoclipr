import type { Metadata } from "next";
import { Suspense } from "react";
import { PricingSection } from "@/components/landing/pricing-section";
import { FAQ } from "@/components/landing/faq";
import { pageMetadata } from "@/lib/seo";
import { Check, Zap, Shield, HeadphonesIcon } from "lucide-react";

export const metadata: Metadata = pageMetadata({
  title: "Pricing",
  description:
    "AutoClipr plans for solo creators, agencies, and teams. Flexible credits for AI clip generation, captions, and multi-platform export.",
  path: "/pricing",
});

const TRUST_ITEMS = [
  { icon: Check, label: "No credit card required to start" },
  { icon: Zap, label: "Instant access after signup" },
  { icon: Shield, label: "Cancel anytime, no lock-in" },
  { icon: HeadphonesIcon, label: "Priority support on paid plans" },
];

export default function PricingPage() {
  return (
    <div className="relative overflow-hidden pt-4">
      {/* Background glow blobs */}
      <div
        className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2"
        style={{
          width: "900px",
          height: "500px",
          background:
            "radial-gradient(ellipse at 50% 0%, rgba(16,185,129,0.18) 0%, rgba(16,185,129,0.05) 55%, transparent 75%)",
          filter: "blur(48px)",
        }}
      />
      <div
        className="pointer-events-none absolute left-1/4 top-40 -translate-x-1/2"
        style={{
          width: "400px",
          height: "400px",
          background: "radial-gradient(ellipse, rgba(91,108,246,0.10) 0%, transparent 70%)",
          filter: "blur(60px)",
        }}
      />

      {/* Hero header */}
      <div className="relative mx-auto max-w-3xl px-4 pb-4 pt-10 text-center sm:px-6">
        {/* Label pill */}
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/8 px-4 py-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_2px_rgba(52,211,153,0.6)]" />
          <span className="text-xs font-semibold uppercase tracking-widest text-emerald-400">
            Pricing &
          </span>
          <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
            Plan
          </span>
        </div>

        <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
          Pay for what you{" "}
          <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
            actually use
          </span>
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-base text-white/50 sm:text-lg">
          Start free. Upgrade when you grow. No contracts, no hidden fees —
          just powerful AI video tools at a fair price.
        </p>

        {/* Trust strip */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
          {TRUST_ITEMS.map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-1.5 text-xs text-white/40">
              <Icon className="h-3.5 w-3.5 text-emerald-500" />
              {label}
            </div>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div className="relative mx-auto mt-8 max-w-5xl px-4">
        <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </div>

      {/* Pricing cards */}
      <Suspense>
        <PricingSection showHeader={false} />
      </Suspense>

      <FAQ />
    </div>
  );
}
