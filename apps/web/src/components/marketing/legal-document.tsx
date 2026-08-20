"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Shield, FileText, Receipt, ChevronRight, Mail } from "lucide-react";
import { cn } from "@/lib/utils";
import { CONTACT_EMAIL, LEGAL_LAST_UPDATED, type LegalDocumentContent } from "@/lib/legal-content";

type LegalDocType = "privacy" | "terms" | "refund";

type LegalDocumentProps = {
  document: LegalDocumentContent;
  type?: LegalDocType;
};

const DOC_THEME: Record<
  LegalDocType,
  { icon: typeof Shield; accent: string; badge: string; active: string; dot: string; label: string; href: string }
> = {
  privacy: {
    icon: Shield,
    accent: "text-emerald-400",
    badge: "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20",
    active: "bg-emerald-500/10 text-emerald-400 border-l-emerald-500",
    dot: "bg-emerald-500/60",
    label: "Privacy Policy",
    href: "/privacy",
  },
  terms: {
    icon: FileText,
    accent: "text-violet-400",
    badge: "bg-violet-500/10 text-violet-400 ring-violet-500/20",
    active: "bg-violet-500/10 text-violet-400 border-l-violet-500",
    dot: "bg-violet-500/60",
    label: "Terms & Conditions",
    href: "/terms",
  },
  refund: {
    icon: Receipt,
    accent: "text-sky-400",
    badge: "bg-sky-500/10 text-sky-400 ring-sky-500/20",
    active: "bg-sky-500/10 text-sky-400 border-l-sky-500",
    dot: "bg-sky-500/60",
    label: "Refund & Cancellation Policy",
    href: "/refund-policy",
  },
};

export function LegalDocument({ document, type = "privacy" }: LegalDocumentProps) {
  const [activeId, setActiveId] = useState<string>("");

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActiveId(entry.target.id);
        }
      },
      { rootMargin: "-20% 0% -70% 0%" }
    );
    document.sections.forEach((s) => {
      const el = globalThis.document?.getElementById(s.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [document.sections]);

  const theme = DOC_THEME[type];
  const Icon = theme.icon;
  const accentClass = theme.accent;
  const badgeBg = theme.badge;
  const activeBg = theme.active;
  // The other two policies, so every legal page cross-links to its siblings.
  const relatedDocs = (Object.keys(DOC_THEME) as LegalDocType[])
    .filter((t) => t !== type)
    .map((t) => DOC_THEME[t]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
      {/* Hero header */}
      <div className="mb-14 text-center">
        <div className={cn("mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl ring-1", badgeBg)}>
          <Icon className="h-8 w-8" />
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">{document.title}</h1>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Last updated: {LEGAL_LAST_UPDATED}
          </span>
          <span>·</span>
          <span>{document.sections.length} sections</span>
          <span>·</span>
          <Link href={`mailto:${CONTACT_EMAIL}`} className={cn("hover:underline", accentClass)}>
            {CONTACT_EMAIL}
          </Link>
        </div>

        {/* Intro paragraphs */}
        <div className="mx-auto mt-8 max-w-2xl space-y-3 text-left text-[15px] leading-relaxed text-muted-foreground">
          {document.intro.map((p) => (
            <p key={p.slice(0, 40)}>{p}</p>
          ))}
        </div>
      </div>

      {/* Two-column layout */}
      <div className="flex gap-10 lg:gap-16">
        {/* Sticky TOC sidebar */}
        <aside className="hidden w-56 shrink-0 lg:block">
          <div className="sticky top-24">
            <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-white/30">
              On this page
            </p>
            <nav className="space-y-0.5">
              {document.sections.map((s) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  className={cn(
                    "flex items-center gap-2 rounded-r-lg border-l-2 py-1.5 pl-3 pr-2 text-xs transition-all",
                    activeId === s.id
                      ? cn("border-l-2 font-semibold", activeBg)
                      : "border-l-transparent text-muted-foreground hover:text-white hover:border-l-white/20"
                  )}
                >
                  <ChevronRight className={cn("h-3 w-3 shrink-0 transition-transform", activeId === s.id ? "opacity-100" : "opacity-0")} />
                  <span className="line-clamp-2 leading-snug">{s.title}</span>
                </a>
              ))}
            </nav>

            {/* Quick contact in sidebar */}
            <div className="mt-8 rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
              <p className="text-xs font-semibold text-white">Questions?</p>
              <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                Reach out and we&apos;ll respond within 1–2 business days.
              </p>
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className={cn("mt-3 flex items-center gap-1.5 text-[11px] font-medium hover:underline", accentClass)}
              >
                <Mail className="h-3 w-3" />
                {CONTACT_EMAIL}
              </a>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="min-w-0 flex-1">
          <div className="space-y-12">
            {document.sections.map((section, i) => (
              <section
                key={section.id}
                id={section.id}
                className="scroll-mt-24 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 sm:p-8 transition-colors hover:border-white/[0.10]"
              >
                {/* Section header */}
                <div className="mb-5 flex items-start gap-4">
                  <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold ring-1", badgeBg)}>
                    {i + 1}
                  </div>
                  <h2 className="text-xl font-bold text-white leading-snug">{section.title.replace(/^\d+\.\s*/, "")}</h2>
                </div>

                {/* Paragraphs */}
                {section.paragraphs?.map((p) => (
                  <p key={p.slice(0, 48)} className="mb-3 text-[15px] leading-relaxed text-muted-foreground">
                    {p}
                  </p>
                ))}

                {/* List */}
                {section.list && (
                  <ul className="mt-3 space-y-2.5">
                    {section.list.map((item) => (
                      <li key={item.slice(0, 48)} className="flex items-start gap-3 text-[15px] leading-relaxed text-muted-foreground">
                        <span className={cn("mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full", theme.dot)} />
                        {item}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>

          {/* Footer contact */}
          <div className="mt-12 flex flex-col items-center gap-4 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-8 text-center sm:flex-row sm:text-left">
            <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ring-1", badgeBg)}>
              <Mail className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-white">Still have questions?</p>
              <p className="mt-1 text-sm text-muted-foreground">
                We&apos;re happy to clarify anything in this document.
              </p>
            </div>
            <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className={cn("rounded-xl border px-4 py-2 text-sm font-semibold transition-colors ring-1", badgeBg, "hover:opacity-80")}
              >
                Email us
              </a>
              <Link
                href="/contact"
                className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/[0.08]"
              >
                Contact form
              </Link>
            </div>
          </div>

          {/* Cross-links to the sibling policies */}
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Also see our{" "}
            {relatedDocs.map((doc, i) => (
              <span key={doc.href}>
                {i > 0 && " · "}
                <Link href={doc.href} className={cn("hover:underline", accentClass)}>
                  {doc.label} →
                </Link>
              </span>
            ))}
          </p>
        </main>
      </div>
    </div>
  );
}
