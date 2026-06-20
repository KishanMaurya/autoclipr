import type { Metadata } from "next";
import { LegalDocument } from "@/components/marketing/legal-document";
import { TERMS_AND_CONDITIONS } from "@/lib/legal-content";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Terms & Conditions",
  description:
    "Terms of use for AutoClipr — accounts, credits, AI clipping, content rights, and acceptable use.",
  path: "/terms",
});

export default function TermsPage() {
  return (
    <div className="pt-16">
      <LegalDocument document={TERMS_AND_CONDITIONS} type="terms" />
    </div>
  );
}
