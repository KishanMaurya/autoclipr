import type { Metadata } from "next";
import { Hero } from "@/components/landing/hero";
import { HomePageJsonLd } from "@/components/seo/json-ld";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Auto Clip Videos — AI Clipper for Viral Shorts",
  description:
    "AutoClipr is your AI auto clipper. Paste a YouTube link or upload a video — it finds viral moments, adds captions, and exports TikTok, Reels, and Shorts in minutes. Free to start.",
  path: "/",
  keywords: [
    "auto clip", "auto clipper", "autoclip", "automatic video clipping",
    "ai video clipper", "auto clips generator", "automatic clipping",
    "clipper ai", "youtube to shorts", "viral clip maker",
    "tiktok clip generator", "instagram reels maker",
  ],
});
import { Features } from "@/components/landing/features";
import { UrlToShorts } from "@/components/landing/url-to-shorts";
import { HowItWorks } from "@/components/landing/how-it-works";
import { Testimonials } from "@/components/landing/testimonials";
import { Suspense } from "react";
import { PricingSection } from "@/components/landing/pricing-section";
import { CTA } from "@/components/landing/cta";
import { Comparison } from "@/components/landing/comparison";
import { PlatformMarquee } from "@/components/landing/platform-marquee";
import { Stats } from "@/components/landing/stats";
import { PlatformsShowcase } from "@/components/landing/platforms-showcase";
import { CreatorsMarquee } from "@/components/landing/creators-marquee";
import { CreatorWinTicker } from "@/components/layout/creator-win-ticker";
import { FreeTools } from "@/components/landing/free-tools";

export default function HomePage() {
  return (
    <>
      <HomePageJsonLd />
      <CreatorWinTicker />
      <Hero />
      <CreatorsMarquee />
      <PlatformMarquee />
      <UrlToShorts />
      <Stats />
      <Features />
      <HowItWorks />
      <FreeTools />
      <PlatformsShowcase />
      <Comparison />
      <Testimonials />
      <Suspense>
        <PricingSection />
      </Suspense>
      <CTA />
    </>
  );
}
