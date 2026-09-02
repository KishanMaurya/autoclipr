"use client";

import { useEffect, useState } from "react";
import { animate, motion, useMotionValue, useTransform } from "framer-motion";
import { Scissors } from "lucide-react";
import type { CardState } from "./use-workflow";

/**
 * Step 3 — the core claim, so it gets the most detail.
 *
 * The score counts up on a MotionValue rather than React state: a
 * setState-per-frame counter re-renders this subtree ~60 times a second for a
 * number that only needs to reach the DOM. useTransform keeps it off the
 * React render path entirely.
 */
export function AiClipStep({ state }: { state: CardState }) {
  const active = state === "active";
  const on = state !== "inactive";

  const score = useMotionValue(0);
  const rounded = useTransform(score, (v) => Math.round(v));
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    if (!on) {
      score.set(0);
      setSettled(false);
      return;
    }
    setSettled(false);
    const controls = animate(score, 94, {
      duration: 1.4,
      delay: 0.3,
      // Eased rather than linear, so the number decelerates into its final
      // value instead of stopping dead.
      ease: [0.16, 1, 0.3, 1],
      onComplete: () => setSettled(true),
    });
    return () => controls.stop();
  }, [on, score]);

  return (
    <div className="flex w-full max-w-[190px] flex-col items-center gap-3">
      <div className="flex items-center gap-2">
        <motion.div
          animate={active ? { rotate: [0, -18, 0], scale: [1, 1.12, 1] } : { rotate: 0, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.15, ease: "easeInOut" }}
        >
          <Scissors className="h-6 w-6 text-pink-400" strokeWidth={1.5} />
        </motion.div>

        <span className="flex items-center gap-1 rounded-full bg-pink-500/10 px-2 py-0.5 text-[10px] font-bold text-pink-400 ring-1 ring-inset ring-pink-500/20">
          <motion.span>{rounded}</motion.span>
          <motion.span
            initial={false}
            animate={{ opacity: settled ? 1 : 0, scale: settled ? 1 : 0.5 }}
            transition={{ type: "spring", stiffness: 500, damping: 16 }}
          >
            🔥
          </motion.span>
        </span>
      </div>

      {/* Score bar with a playhead that lands on the winning moment. */}
      <div className="relative h-2 w-full overflow-visible rounded-full bg-white/10">
        <motion.div
          initial={false}
          animate={{ scaleX: on ? 0.72 : 0 }}
          transition={{ duration: 1.4, delay: on ? 0.3 : 0, ease: [0.16, 1, 0.3, 1] }}
          style={{ originX: 0 }}
          className="absolute inset-y-0 left-0 w-full rounded-full bg-gradient-to-r from-violet-500 via-pink-500 to-orange-400"
        />
        <motion.div
          initial={false}
          animate={{ left: on ? "68%" : "0%", opacity: on ? 1 : 0 }}
          transition={{ duration: 1.4, delay: on ? 0.3 : 0, ease: [0.16, 1, 0.3, 1] }}
          className="absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full border-2 border-pink-300 bg-pink-500 shadow-md shadow-pink-500/50"
        />
      </div>

      <motion.p
        initial={false}
        animate={{ opacity: settled ? 1 : 0.35 }}
        transition={{ duration: 0.4 }}
        className="text-[10px] text-white/45"
      >
        AI viral score · 0:45 clip
      </motion.p>
    </div>
  );
}
