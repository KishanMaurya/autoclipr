"use client";

import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Reveal, motion } from "@/components/ui/motion";

export function CTA() {
  return (
    <section className="px-4 py-28 sm:px-6">
      <Reveal className="relative mx-auto max-w-4xl overflow-hidden rounded-3xl" variant={{
        hidden: { opacity: 0, scale: 0.96, y: 24 },
        show: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } },
      }}>
        <div className="absolute inset-0 bg-gradient-brand opacity-90" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSA2MCAwIEwgMCAwIDAgNjAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgwLDAsMCwwLjA4KSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-30" />
        <div className="relative px-8 py-16 text-center sm:px-12 sm:py-20">
          <motion.div
            className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-black/20 backdrop-blur-sm"
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          >
            <Sparkles className="h-7 w-7 text-white" />
          </motion.div>
          <h2 className="text-balance text-3xl font-bold text-white sm:text-4xl lg:text-5xl">
            Ready to clip smarter?
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-white/80 sm:text-lg">
            Turn one video into dozens of viral shorts.
          </p>
          <Button
            size="lg"
            className="group mt-10 bg-white text-emerald-900 shadow-xl hover:scale-[1.02] hover:bg-white/90"
            asChild
          >
            <Link href="/register">
              Start your free trial
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </Button>
          <p className="mt-4 text-sm text-white/70">
            No credit card · Free trial · Cancel anytime
          </p>
        </div>
      </Reveal>
    </section>
  );
}
