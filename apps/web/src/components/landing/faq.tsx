"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Reveal, Stagger, MotionItem } from "@/components/ui/motion";
import { cn } from "@/lib/utils";
import { MessageCircle, Rocket, CreditCard, Monitor, Shield } from "lucide-react";
import { MARKETING_FAQS } from "@/lib/faqs";

const CATEGORIES = [
  { label: "All", icon: null },
  { label: "Getting started", icon: Rocket },
  { label: "Credits & billing", icon: CreditCard },
  { label: "Platform & formats", icon: Monitor },
  { label: "Privacy & security", icon: Shield },
];

export function FAQ() {
  const [active, setActive] = useState("All");

  const filtered = active === "All"
    ? MARKETING_FAQS
    : MARKETING_FAQS.filter((f) => f.category === active);

  return (
    <section id="faq" className="px-4 py-28 sm:px-6">
      <div className="mx-auto max-w-4xl">
        <Reveal className="text-center">
          <p className="section-label mx-auto mb-6">FAQ</p>
          <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            Questions? <span className="text-aurora">Answered.</span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground sm:text-lg">
            Everything you need to know about AutoClipr.ai. Can&apos;t find what you&apos;re looking for?{" "}
            <Link href="/contact" className="text-aurora hover:underline">
              Ask us directly.
            </Link>
          </p>
        </Reveal>

        {/* Category filter tabs */}
        <Reveal delay={0.1} className="mt-10">
          <div className="flex flex-wrap items-center justify-center gap-2">
            {CATEGORIES.map(({ label, icon: Icon }) => (
              <button
                key={label}
                onClick={() => setActive(label)}
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm font-medium transition-all",
                  active === label
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                    : "border-white/[0.08] bg-white/[0.03] text-muted-foreground hover:border-white/20 hover:text-white"
                )}
              >
                {Icon && <Icon className="h-3.5 w-3.5" />}
                {label}
              </button>
            ))}
          </div>
        </Reveal>

        {/* FAQ accordion */}
        <Accordion key={active} type="single" collapsible className="mt-10">
          <Stagger className="space-y-3" amount={0.08}>
            {filtered.map((f, i) => (
              <MotionItem key={`${active}-${f.q}`}>
                <AccordionItem
                  value={`item-${active}-${i}`}
                  className="overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.03] px-0 transition-colors hover:border-white/[0.12]"
                >
                  <AccordionTrigger className="px-6 py-5 text-left text-[15px] font-semibold text-white hover:no-underline [&[data-state=open]]:text-aurora">
                    <span className="flex items-center gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-white/[0.06] text-[10px] font-bold text-white/40">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      {f.q}
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="px-6 pb-5 pt-0">
                    <div className="ml-9 border-l border-white/[0.06] pl-4 text-[15px] leading-relaxed text-muted-foreground">
                      {f.a}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </MotionItem>
            ))}
          </Stagger>
        </Accordion>

        {/* Support CTA */}
        <Reveal delay={0.2} className="mt-14">
          <div className="flex flex-col items-center gap-4 rounded-3xl border border-white/[0.07] bg-white/[0.02] px-8 py-10 text-center sm:flex-row sm:text-left">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/10 ring-1 ring-emerald-500/20">
              <MessageCircle className="h-7 w-7 text-emerald-400" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-white">Still have questions?</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Our team typically replies within 1–2 business days. We&apos;re happy to help.
              </p>
            </div>
            <Link
              href="/contact"
              className="shrink-0 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-5 py-2.5 text-sm font-semibold text-emerald-400 transition-all hover:bg-emerald-500/20 hover:text-emerald-300"
            >
              Contact support →
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
