"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CardState } from "./use-workflow";

/**
 * Shell for one pipeline stage.
 *
 * Inactive cards stay at 0.55 opacity rather than hiding: the point of the
 * section is that a viewer understands the whole four-step pipeline at a
 * glance, which they cannot do if three quarters of it is invisible.
 */
export function WorkflowCard({
  index,
  state,
  title,
  description,
  icon: Icon,
  iconBg,
  accent,
  glow,
  badge,
  children,
}: {
  index: number;
  state: CardState;
  title: string;
  description: string;
  icon: LucideIcon;
  iconBg: string;
  accent: string;
  glow: string;
  badge?: string;
  children: React.ReactNode;
}) {
  const isActive = state === "active";
  const isDone = state === "completed";

  return (
    <motion.div
      initial={false}
      animate={{
        opacity: isActive ? 1 : isDone ? 0.8 : 0.55,
        scale: isActive ? 1.015 : 1,
      }}
      transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
      className={cn(
        "relative flex flex-1 flex-col rounded-2xl border p-6 backdrop-blur-sm transition-colors duration-500",
        isActive
          ? "border-white/[0.14] bg-white/[0.04]"
          : "border-white/[0.06] bg-white/[0.02]",
      )}
    >
      {/* Accent bloom, only while active. blur + opacity keeps it on the
          compositor rather than triggering paint on every frame. */}
      <motion.div
        aria-hidden
        initial={false}
        animate={{ opacity: isActive ? 0.16 : 0 }}
        transition={{ duration: 0.6 }}
        className={cn(
          "pointer-events-none absolute -inset-px rounded-2xl bg-gradient-to-br blur-xl",
          accent,
        )}
      />

      <div className="relative">
        <div className="flex items-start justify-between">
          <div className="relative">
            <motion.div
              initial={false}
              animate={{
                scale: isActive ? 1 : 0.92,
                y: isActive ? [0, -3, 0] : 0,
              }}
              transition={{
                scale: { type: "spring", stiffness: 260, damping: 18 },
                // Gentle float while active; hierarchy comes from only the
                // live card moving.
                y: { duration: 3.2, repeat: isActive ? Infinity : 0, ease: "easeInOut" },
              }}
              className={cn(
                "flex h-14 w-14 items-center justify-center rounded-full ring-1 ring-inset ring-white/10",
                iconBg,
              )}
            >
              <Icon className="h-6 w-6" strokeWidth={1.5} />
            </motion.div>

            <motion.div
              aria-hidden
              initial={false}
              animate={{ opacity: isActive ? [0.35, 0.7, 0.35] : 0, scale: isActive ? [1, 1.25, 1] : 1 }}
              transition={{ duration: 2.4, repeat: isActive ? Infinity : 0, ease: "easeInOut" }}
              className={cn(
                "pointer-events-none absolute inset-0 rounded-full bg-gradient-to-br opacity-20 blur-md",
                accent,
                glow,
              )}
            />

            <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#0d0d18] text-[10px] font-semibold text-white/60 ring-1 ring-white/10">
              {isDone ? <Check className="h-3 w-3 text-emerald-400" /> : index + 1}
            </span>
          </div>

          {badge && (
            <span className="rounded-full bg-white/[0.06] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white/45 ring-1 ring-inset ring-white/10">
              {badge}
            </span>
          )}
        </div>

        {/* Fixed height so the four cards stay aligned as their contents
            animate through different sizes. */}
        <div className="mt-6 flex min-h-[104px] items-center justify-center">{children}</div>

        <h3 className="mt-5 text-center text-lg font-semibold text-white">{title}</h3>
        <p className="mt-2 text-center text-sm leading-relaxed text-white/45">{description}</p>
      </div>
    </motion.div>
  );
}
