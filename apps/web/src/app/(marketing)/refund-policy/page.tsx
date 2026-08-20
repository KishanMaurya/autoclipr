import type { Metadata } from "next";
import { LegalDocument } from "@/components/marketing/legal-document";
import { REFUND_POLICY } from "@/lib/legal-content";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Refund & Cancellation Policy",
  description:
    "How AutoClipr subscriptions, cancellations, and refunds work — including when credits are charged and when they are returned automatically.",
  path: "/refund-policy",
});

export default function RefundPolicyPage() {
  return (
    <div className="pt-16">
      <LegalDocument document={REFUND_POLICY} type="refund" />
    </div>
  );
}
