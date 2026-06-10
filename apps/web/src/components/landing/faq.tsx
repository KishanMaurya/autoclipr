"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Reveal, Stagger, MotionItem } from "@/components/ui/motion";

const faqs = [
  {
    q: "How does AI clip generation work?",
    a: "AutoClipr analyzes your video transcript and visual signals to find high-engagement segments, then renders short clips with optional burned-in subtitles.",
  },
  {
    q: "What are credits?",
    a: "Credits are consumed when generating clips (5 credits per clip by default). Your plan includes a monthly credit allowance.",
  },
  {
    q: "Can I use Google login?",
    a: "Yes. Sign in with Google or email/password via Supabase Auth.",
  },
  {
    q: "Which formats are supported?",
    a: "MP4, MOV, and WebM uploads. Exports default to 9:16 for Shorts/Reels/TikTok.",
  },
  {
    q: "Is my content secure?",
    a: "Videos are stored in private Supabase buckets with row-level security. Only you can access your files.",
  },
];

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
