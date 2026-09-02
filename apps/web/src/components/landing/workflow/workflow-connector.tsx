"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * The link between two cards.
 *
 * Horizontal on desktop, vertical on mobile — the same component either way,
 * because the flow logic is identical and only the axis changes. Squeezing
 * four cards into a row on a phone is what the layout switch exists to avoid.
 *
 * The rail is always visible at low opacity so the shape of the whole pipeline
 * reads even before the animation reaches it; only the fill and the travelling
 * particle are stateful.
 */
export function WorkflowConnector({
  flowing,
  completed,
  accent,
}: {
  flowing: boolean;
  completed: boolean;
  /** Tailwind gradient stops, e.g. "from-violet-500 to-sky-500". */
  accent: string;
}) {
  return (
    <div
      aria-hidden
      className="relative flex shrink-0 items-center justify-center lg:h-full lg:w-10 lg:flex-none"
    >
      {/* Rail */}
      <div className="h-8 w-px bg-white/10 lg:h-px lg:w-full" />

      {/* Progressive fill. scaleY/scaleX rather than height/width so the
          browser can composite it without laying the section out again. */}
      <motion.div
        className={cn(
          "absolute h-8 w-px origin-top bg-gradient-to-b lg:h-px lg:w-full lg:origin-left lg:bg-gradient-to-r",
          accent,
        )}
        initial={false}
        animate={{
          scaleY: flowing || completed ? 1 : 0,
          scaleX: flowing || completed ? 1 : 0,
          opacity: completed ? 0.55 : 1,
        }}
        transition={{
          duration: flowing ? 0.65 : 0.3,
          ease: [0.4, 0, 0.2, 1],
        }}
        style={{ scaleY: 0, scaleX: 0 }}
      />

      {/* Travelling packet. Only mounted while the connector is firing, so
          nothing animates off-screen once the flow has moved on. */}
      {flowing && (
        <motion.span
          className={cn(
            "absolute h-1.5 w-1.5 rounded-full bg-gradient-to-r shadow-[0_0_10px_2px_rgba(255,255,255,0.35)]",
            accent,
          )}
          initial={{ offsetDistance: "0%" }}
          animate={{
            y: ["-14px", "14px"],
            x: 0,
            opacity: [0, 1, 1, 0],
          }}
          transition={{ duration: 0.65, ease: "easeInOut", times: [0, 0.15, 0.85, 1] }}
        />
      )}
      {flowing && (
        <motion.span
          className={cn(
            "absolute hidden h-1.5 w-1.5 rounded-full bg-gradient-to-r shadow-[0_0_10px_2px_rgba(255,255,255,0.35)] lg:block",
            accent,
          )}
          animate={{
            x: ["-18px", "18px"],
            opacity: [0, 1, 1, 0],
          }}
          transition={{ duration: 0.65, ease: "easeInOut", times: [0, 0.15, 0.85, 1] }}
        />
      )}
    </div>
  );
}
