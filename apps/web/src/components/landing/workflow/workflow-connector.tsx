"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * The link between two cards.
 *
 * Rail, fill and particle all live inside one relatively-positioned track,
 * and that track is what gets centred. Absolutely positioning them against
 * the outer flex box instead put them at its top-left corner, which is why
 * the line sat against the top edge of the cards rather than running through
 * their middle.
 *
 * Horizontal from lg, vertical below it — the same component either way,
 * since only the axis changes.
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
  const lit = flowing || completed;

  return (
    <div
      aria-hidden
      className="flex shrink-0 items-center justify-center py-1 lg:w-14 lg:flex-none lg:self-center lg:py-0"
    >
      {/* The track. Everything else is positioned against this, so the whole
          assembly stays centred on both axes. */}
      <div className="relative h-10 w-[3px] lg:h-[3px] lg:w-full">
        {/* Rail — always visible, so the shape of the pipeline reads before
            the animation ever reaches this connector. */}
        <div className="absolute inset-0 rounded-full bg-white/[0.13]" />

        {/* Progressive fill. scaleX/scaleY rather than width/height keeps it
            on the compositor instead of relaying out the row each frame. */}
        <motion.div
          className={cn(
            "absolute inset-0 origin-top rounded-full bg-gradient-to-b lg:origin-left lg:bg-gradient-to-r",
            accent,
          )}
          initial={false}
          animate={{
            scaleY: lit ? 1 : 0,
            scaleX: lit ? 1 : 0,
            opacity: completed && !flowing ? 0.6 : 1,
          }}
          transition={{ duration: flowing ? 0.6 : 0.3, ease: [0.4, 0, 0.2, 1] }}
        />

        {/* Soft bloom under the lit segment. */}
        <motion.div
          className={cn("absolute -inset-y-1 inset-x-0 rounded-full bg-gradient-to-r blur-[6px]", accent)}
          initial={false}
          animate={{ opacity: flowing ? 0.55 : 0 }}
          transition={{ duration: 0.35 }}
        />

        {/* Travelling packet — mounted only while this connector is firing. */}
        {flowing && (
          <>
            {/* Vertical track, below lg. */}
            <motion.span
              className="absolute left-1/2 h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-white shadow-[0_0_12px_3px_rgba(255,255,255,0.55)] lg:hidden"
              initial={{ top: "-6%", opacity: 0 }}
              animate={{ top: ["-6%", "106%"], opacity: [0, 1, 1, 0] }}
              transition={{ duration: 0.6, ease: "easeInOut", times: [0, 0.18, 0.82, 1] }}
            />
            {/* Horizontal track, lg and up. */}
            <motion.span
              className="absolute top-1/2 hidden h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-white shadow-[0_0_12px_3px_rgba(255,255,255,0.55)] lg:block"
              initial={{ left: "-6%", opacity: 0 }}
              animate={{ left: ["-6%", "106%"], opacity: [0, 1, 1, 0] }}
              transition={{ duration: 0.6, ease: "easeInOut", times: [0, 0.18, 0.82, 1] }}
            />
          </>
        )}
      </div>
    </div>
  );
}
