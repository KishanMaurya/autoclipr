import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { FAQ } from "@/components/landing/faq";
import { CTA } from "@/components/landing/cta";

export const metadata: Metadata = pageMetadata({
  title: "FAQ — Frequently Asked Questions",
  description:
    "Everything you need to know about AutoClipr.ai — pricing, platforms, credits, privacy, and how it works.",
  path: "/faq",
});

export default function FAQPage() {
  return (
    <>
      <FAQ />
      <CTA />
    </>
  );
}
