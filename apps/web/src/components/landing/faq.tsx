"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Reveal, Stagger, MotionItem } from "@/components/ui/motion";

import { MARKETING_FAQS } from "@/lib/faqs";

const faqs = MARKETING_FAQS;

export function FAQ() {
  return (
    <section id="faq" className="px-4 py-28 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <Reveal className="text-center">
          <p className="section-label mx-auto mb-6">FAQ</p>
          <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            Questions? <span className="text-aurora">Answered.</span>
          </h2>
        </Reveal>

        <Accordion type="single" collapsible className="mt-12">
          <Stagger className="space-y-3" amount={0.1}>
            {faqs.map((f, i) => (
              <MotionItem key={f.q}>
                <AccordionItem
                  value={`item-${i}`}
                  className="glass-panel border-none px-5"
                >
                  <AccordionTrigger className="text-left">{f.q}</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    {f.a}
                  </AccordionContent>
                </AccordionItem>
              </MotionItem>
            ))}
          </Stagger>
        </Accordion>
      </div>
    </section>
  );
}
