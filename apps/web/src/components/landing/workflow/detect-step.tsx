"use client";

import { motion } from "framer-motion";
import { Bell } from "lucide-react";
import type { CardState } from "./use-workflow";

/** Step 2 — the bell rings, the badge pops, then the channel is scanned. */
export function DetectStep({ state }: { state: CardState }) {
  const active = state === "active";
  const on = state !== "inactive";

  return (
    <div className="flex w-full flex-col items-center gap-3">
      <div className="relative">
        <motion.div
          animate={
            active
              ? { rotate: [0, -12, 10, -6, 0] }
              : { rotate: 0 }
          }
          transition={{ duration: 0.7, delay: 0.1, ease: "easeInOut" }}
          className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-500/10 ring-1 ring-inset ring-sky-500/20"
        >
          <Bell className="h-7 w-7 text-sky-400" strokeWidth={1.5} />
        </motion.div>

        <motion.span
          initial={false}
          animate={{ scale: on ? 1 : 0, opacity: on ? 1 : 0 }}
          transition={{ type: "spring", stiffness: 500, damping: 15, delay: on ? 0.35 : 0 }}
          className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white"
        >
          1
        </motion.span>
      </div>

      <motion.p
        initial={false}
        animate={{ opacity: on ? 1 : 0, y: on ? 0 : 8 }}
        transition={{ duration: 0.4, delay: on ? 0.5 : 0 }}
        className="text-[11px] font-medium text-sky-400"
      >
        New upload detected!
      </motion.p>

      {/* Scan bar — the visible evidence of "watches 24/7". */}
      <div className="h-1 w-full max-w-[150px] overflow-hidden rounded-full bg-white/[0.07]">
        <motion.div
          initial={false}
          animate={{ scaleX: on ? 1 : 0 }}
          transition={{ duration: 0.9, delay: on ? 0.6 : 0, ease: [0.4, 0, 0.2, 1] }}
          style={{ originX: 0 }}
          className="h-full rounded-full bg-gradient-to-r from-sky-500 to-blue-500"
        />
      </div>
    </div>
  );
}
