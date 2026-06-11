import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { CTA } from "@/components/landing/cta";
import type { LandingPage } from "@/lib/landing-pages";

export function SeoLandingPage({ page }: { page: LandingPage }) {
  return (
    <>
      <section className="px-4 pb-16 pt-28 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <p className="section-label mx-auto mb-6">AutoClipr for creators</p>
          <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            {page.h1}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            {page.subtitle}
          </p>
          <Button variant="gradient" size="lg" className="mt-10" asChild>
            <Link href="/register">
              {page.heroCta}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      <section className="px-4 py-20 sm:px-6">
        <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-3">
          {page.benefits.map((b) => (
            <div key={b.title} className="glass-panel rounded-2xl p-6">
              <CheckCircle2 className="mb-4 h-6 w-6 text-emerald-400" />
              <h2 className="text-lg font-semibold">{b.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{b.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-center text-3xl font-bold">How it works</h2>
          <ol className="mt-12 space-y-8">
            {page.steps.map((step, i) => (
              <li key={step.title} className="flex gap-5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-brand text-sm font-bold text-white">
                  {i + 1}
                </span>
                <div>
                  <h3 className="text-lg font-semibold">{step.title}</h3>
                  <p className="mt-1 text-muted-foreground">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-center text-3xl font-bold">FAQ</h2>
          <Accordion type="single" collapsible className="mt-10">
            {page.faq.map((item, i) => (
              <AccordionItem key={item.q} value={`faq-${i}`} className="glass-panel mb-3 border-none px-5">
                <AccordionTrigger className="text-left">{item.q}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">{item.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      <CTA />
    </>
  );
}
