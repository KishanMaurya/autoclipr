import type { Metadata } from "next";
import { Suspense } from "react";
import { PricingSection } from "@/components/landing/pricing-section";
import { FAQ } from "@/components/landing/faq";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Pricing",
  description:
    "AutoClipr plans for solo creators, agencies, and teams. Flexible credits for AI clip generation, captions, and multi-platform export.",
  path: "/pricing",
});

export default function PricingPage() {
  return (
    <div className="pt-16">
      <div className="mx-auto max-w-3xl px-4 py-12 text-center sm:px-6">
        <div className="flex items-center justify-center gap-3">
          <h1 className="text-4xl font-bold">Pricing</h1>
          <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-sm font-semibold text-emerald-400">
            _Plan
          </span>
        </div>
        <p className="mt-4 text-muted-foreground">
          Flexible plans for solo creators, agencies, and teams.
        </p>
      </div>
      <Suspense>
        <PricingSection showHeader={false} />
      </Suspense>
      <FAQ />
    </div>
  );
}
