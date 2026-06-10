import { Hero } from "@/components/landing/hero";
import { Features } from "@/components/landing/features";
import { UrlToShorts } from "@/components/landing/url-to-shorts";
import { HowItWorks } from "@/components/landing/how-it-works";
import { Testimonials } from "@/components/landing/testimonials";
import { PricingSection } from "@/components/landing/pricing-section";
import { FAQ } from "@/components/landing/faq";
import { CTA } from "@/components/landing/cta";
import { Comparison } from "@/components/landing/comparison";

export default function HomePage() {
  return (
    <>
      <Hero />
      <UrlToShorts />
      <Features />
      <HowItWorks />
      <Comparison />
      <Testimonials />
      <PricingSection />
      <FAQ />
      <CTA />
    </>
  );
}
