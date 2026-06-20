import type { Metadata } from "next";
import { LegalDocument } from "@/components/marketing/legal-document";
import { PRIVACY_POLICY } from "@/lib/legal-content";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Privacy Policy",
  description:
    "How AutoClipr collects, uses, and protects your personal information, video content, and connected platform data.",
  path: "/privacy",
});

export default function PrivacyPage() {
  return (
    <div className="pt-16">
      <LegalDocument document={PRIVACY_POLICY} type="privacy" />
    </div>
  );
}
