"use client";

import Link from "next/link";
import { ArrowRight, Sparkles, Check, Users, Zap } from "lucide-react";
import { Reveal, motion } from "@/components/ui/motion";

const social = [
  { initials: "SK", tint: "from-violet-500 to-pink-500" },
  { initials: "MT", tint: "from-cyan-500 to-blue-500" },
  { initials: "ER", tint: "from-amber-500 to-orange-400" },
  { initials: "JL", tint: "from-emerald-500 to-teal-400" },
];

const trust = [
  { icon: Check, text: "7-day free trial" },
  { icon: Zap, text: "No credit card needed" },
  { icon: Users, text: "Cancel anytime" },
];

export function CTA() {
  return (
    <section className="px-4 py-28 sm:px-6">
      <Reveal
        className="relative mx-auto max-w-5xl overflow-hidden rounded-3xl"
        variant={{
          hidden: { opacity: 0, scale: 0.96, y: 24 },
          show: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } },
        }}
      >
        {/* Background layers */}
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-700 via-emerald-600 to-teal-600" />
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `radial-gradient(circle at 20% 50%, rgba(255,255,255,0.15) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255,255,255,0.1) 0%, transparent 40%)`,
          }}
        />
        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `linear-gradient(to right, rgba(255,255,255,0.15) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.15) 1px, transparent 1px)`,
            backgroundSize: "40px 40px",
          }}
        />

        <div className="relative flex flex-col items-center gap-10 px-8 py-16 sm:px-14 sm:py-20 lg:flex-row lg:text-left">
          {/* Left content */}
          <div className="flex-1">
            <motion.div
              className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-sm font-semibold text-white/90 ring-1 ring-white/20 backdrop-blur-sm"
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            >
              <Sparkles className="h-4 w-4 text-white" />
              Start creating today
            </motion.div>

            <h2 className="text-balance text-3xl font-extrabold leading-tight text-white sm:text-4xl lg:text-5xl">
              Ready to clip<br className="hidden sm:block" /> smarter?
            </h2>
            <p className="mt-4 max-w-md text-lg text-white/75">
              Turn one long video into dozens of viral shorts — in under 2 minutes. No editing skills needed.
            </p>

            {/* Social proof avatars */}
            <div className="mt-6 flex items-center gap-3">
              <div className="flex -space-x-2">
                {social.map((s) => (
                  <div
                    key={s.initials}
                    className={`flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br ${s.tint} text-[10px] font-bold text-white ring-2 ring-emerald-600`}
                  >
                    {s.initials}
                  </div>
                ))}
              </div>
              <p className="text-sm text-white/70">
                <span className="font-semibold text-white">10,000+</span> creators already clipping
              </p>
            </div>
          </div>

          {/* Right CTA box */}
          <div className="w-full max-w-sm shrink-0 rounded-2xl bg-white/10 p-8 backdrop-blur-sm ring-1 ring-white/20">
            <p className="mb-1 text-sm font-medium text-white/60">Get started for free</p>
            <p className="mb-6 text-2xl font-bold text-white">7-day free trial</p>

            <Link
              href="/register"
              className="group flex w-full items-center justify-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-bold text-emerald-800 shadow-lg transition-all hover:scale-[1.02] hover:bg-white/95 hover:shadow-white/20"
            >
              Start your free trial
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>

            <ul className="mt-5 space-y-2.5">
              {trust.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-2.5 text-sm text-white/70">
                  <Icon className="h-4 w-4 shrink-0 text-emerald-300" />
                  {text}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
