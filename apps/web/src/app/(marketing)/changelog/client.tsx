"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Zap, Bug, Shield, ChevronDown } from "lucide-react";
import { useState } from "react";
import type { Release, ChangeType } from "./data";

const EASE = [0.22, 1, 0.36, 1] as const;

const TYPE_CONFIG: Record<ChangeType, { icon: React.ElementType; label: string; color: string; bg: string }> = {
  feature:     { icon: Sparkles, label: "New",         color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
  improvement: { icon: Zap,      label: "Improved",    color: "text-blue-400",    bg: "bg-blue-500/10 border-blue-500/20" },
  fix:         { icon: Bug,      label: "Fixed",       color: "text-amber-400",   bg: "bg-amber-500/10 border-amber-500/20" },
  security:    { icon: Shield,   label: "Security",    color: "text-violet-400",  bg: "bg-violet-500/10 border-violet-500/20" },
};

function ChangeTag({ type }: { type: ChangeType }) {
  const cfg = TYPE_CONFIG[type];
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${cfg.color} ${cfg.bg}`}>
      <Icon className="h-2.5 w-2.5" />
      {cfg.label}
    </span>
  );
}

function ReleaseCard({ release, index }: { release: Release; index: number }) {
  const [expanded, setExpanded] = useState(index === 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ delay: index * 0.07, duration: 0.55, ease: EASE }}
      className="relative pl-8"
    >
      {/* Timeline dot */}
      <div className={`absolute left-0 top-5 flex h-4 w-4 -translate-x-1/2 items-center justify-center rounded-full border-2 ${release.highlight ? "border-emerald-400 bg-emerald-400/20 shadow-[0_0_12px_rgba(16,185,129,0.4)]" : "border-white/20 bg-[#0a0a16]"}`}>
        {release.highlight && <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />}
      </div>

      {/* Card */}
      <div
        className={`group relative overflow-hidden rounded-2xl border transition-all duration-300 ${release.highlight ? "border-emerald-500/20 bg-[#0a0a16] shadow-[0_0_32px_rgba(16,185,129,0.06)]" : "border-white/[0.07] bg-[#0a0a16] hover:border-white/[0.14]"}`}
      >
        {/* Top gradient line */}
        {release.badgeColor && (
          <div className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r ${release.badgeColor} opacity-70`} />
        )}

        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full p-5 text-left sm:p-6"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="mb-2.5 flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs font-bold text-white/30">{release.version}</span>
                <span className="text-[10px] text-white/20">·</span>
                <span className="text-xs text-white/35">{release.date}</span>
                {release.badge && (
                  <span className={`rounded-full bg-gradient-to-r ${release.badgeColor} px-2 py-0.5 text-[10px] font-bold text-white`}>
                    {release.badge}
                  </span>
                )}
              </div>
              <h3 className="text-base font-bold leading-snug text-white sm:text-lg">{release.headline}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-white/45">{release.description}</p>
            </div>
            <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.04] transition-all duration-200 ${expanded ? "rotate-180 border-emerald-500/30 bg-emerald-500/10" : ""}`}>
              <ChevronDown className={`h-4 w-4 ${expanded ? "text-emerald-400" : "text-white/30"}`} />
            </div>
          </div>
        </button>

        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.28, ease: EASE }}
              className="overflow-hidden"
            >
              <div className="border-t border-white/[0.06] px-5 pb-5 pt-4 sm:px-6 sm:pb-6">
                <ul className="space-y-2.5">
                  {release.changes.map((change, i) => (
                    <motion.li
                      key={i}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04, duration: 0.3 }}
                      className="flex items-start gap-3"
                    >
                      <ChangeTag type={change.type} />
                      <span className="text-sm leading-relaxed text-white/60">{change.text}</span>
                    </motion.li>
                  ))}
                </ul>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

export function ChangelogClient({ releases }: { releases: Release[] }) {
  return (
    <div className="relative">
      {/* Vertical timeline line */}
      <div className="absolute left-0 top-6 bottom-6 w-px bg-gradient-to-b from-emerald-500/40 via-white/10 to-transparent" />

      <div className="space-y-5">
        {releases.map((release, i) => (
          <ReleaseCard key={release.version} release={release} index={i} />
        ))}
      </div>

      {/* End of timeline */}
      <div className="relative mt-6 pl-8">
        <div className="absolute left-0 top-1/2 flex h-3 w-3 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-[#0a0a16]">
          <div className="h-1 w-1 rounded-full bg-white/20" />
        </div>
        <p className="text-xs text-white/20">AutoClipr launched February 2025</p>
      </div>
    </div>
  );
}
