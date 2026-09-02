"use client";

import { motion } from "framer-motion";
import { YouTubeIcon } from "./brand-icons";
import type { CardState } from "./use-workflow";

/** Step 1 — the channel URL lands, then the connection confirms. */
export function ConnectStep({ state }: { state: CardState }) {
  const on = state !== "inactive";

  return (
    <div className="flex w-full flex-col items-center gap-3">
      <motion.div
        initial={false}
        animate={{ opacity: on ? 1 : 0.4, y: on ? 0 : 6 }}
        transition={{ duration: 0.4, delay: on ? 0.15 : 0 }}
        className="flex w-full max-w-[190px] items-center gap-2 rounded-xl border border-white/10 bg-black/40 px-3 py-2.5"
      >
        <YouTubeIcon />
        <span className="truncate text-xs text-white/45">youtube.com/channel/…</span>
      </motion.div>

      <motion.div
        initial={false}
        animate={{
          opacity: on ? 1 : 0,
          scale: on ? 1 : 0.85,
        }}
        transition={{ type: "spring", stiffness: 320, damping: 20, delay: on ? 0.45 : 0 }}
        className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold text-emerald-400 ring-1 ring-inset ring-emerald-500/20"
      >
        <motion.span
          animate={state === "active" ? { opacity: [1, 0.35, 1] } : { opacity: 1 }}
          transition={{ duration: 1.8, repeat: state === "active" ? Infinity : 0 }}
          className="h-1.5 w-1.5 rounded-full bg-emerald-400"
        />
        Connected
      </motion.div>
    </div>
  );
}
