import { PricingSection } from "@/components/landing/pricing-section";
import { FAQ } from "@/components/landing/faq";

export const metadata = { title: "Pricing" };

export default function PricingPage() {
  return (
    <div className="pt-16">
      <div className="mx-auto max-w-3xl px-4 py-12 text-center sm:px-6">
        <h1 className="text-4xl font-bold">Pricing</h1>
        <p className="mt-4 text-muted-foreground">
          Flexible plans for solo creators, agencies, and teams.
        </p>
      </div>
      <PricingSection showHeader={false} />
      <FAQ />
    </div>
  );
}
