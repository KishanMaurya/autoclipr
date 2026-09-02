"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";

/**
 * Phases of the pipeline loop.
 *
 * Every visual in the section derives from this one number, so the four cards
 * and three connectors can never disagree about where the flow is — which is
 * what happens when each piece runs its own timer.
 */
export const PHASES = [
  "connect", // card 1 active
  "flow-1", // particle 1 -> 2
  "detect", // card 2 active
  "flow-2",
  "clip", // card 3 active
  "flow-3",
  "publish", // card 4 active
  "settle", // all complete, held
] as const;

export type Phase = (typeof PHASES)[number];

/** How long each phase runs, in ms. */
const DURATIONS: Record<Phase, number> = {
  connect: 1900,
  "flow-1": 750,
  detect: 2000,
  "flow-2": 750,
  // The clip step is the product's core claim, so it gets the longest hold.
  clip: 2900,
  "flow-3": 750,
  publish: 2200,
  settle: 2200,
};

export type CardState = "inactive" | "active" | "completed";

export interface WorkflowState {
  phase: Phase;
  /** Index of the card the flow is currently on, 0-3. */
  activeIndex: number;
  /** Which connector is firing, 0-2, or null. */
  flowingConnector: number | null;
  cardState: (index: number) => CardState;
  /** True on the first pass, so entrance animations only play once. */
  hasLooped: boolean;
}

const CARD_FOR_PHASE: Record<Phase, number> = {
  connect: 0,
  "flow-1": 0,
  detect: 1,
  "flow-2": 1,
  clip: 2,
  "flow-3": 2,
  publish: 3,
  settle: 3,
};

const CONNECTOR_FOR_PHASE: Partial<Record<Phase, number>> = {
  "flow-1": 0,
  "flow-2": 1,
  "flow-3": 2,
};

/**
 * Drives the pipeline.
 *
 * `active` gates the whole thing on visibility: an animation looping in a
 * section nobody has scrolled to burns battery and, on a long landing page,
 * has usually finished several laps before it is ever seen.
 *
 * Under prefers-reduced-motion the loop never starts and every card is
 * reported completed, so the section still tells the whole story — just
 * without movement.
 */
export function useWorkflow(active: boolean): WorkflowState {
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [hasLooped, setHasLooped] = useState(false);

  useEffect(() => {
    if (!active || reduce) return;

    const phase = PHASES[index];
    const timer = window.setTimeout(() => {
      setIndex((i) => {
        const next = (i + 1) % PHASES.length;
        if (next === 0) setHasLooped(true);
        return next;
      });
    }, DURATIONS[phase]);

    return () => window.clearTimeout(timer);
  }, [index, active, reduce]);

  if (reduce) {
    return {
      phase: "settle",
      activeIndex: 3,
      flowingConnector: null,
      cardState: () => "completed",
      hasLooped: true,
    };
  }

  const phase = PHASES[index];
  const activeIndex = CARD_FOR_PHASE[phase];

  return {
    phase,
    activeIndex,
    flowingConnector: CONNECTOR_FOR_PHASE[phase] ?? null,
    hasLooped,
    cardState: (i: number) => {
      if (phase === "settle") return i === 3 ? "active" : "completed";
      if (i < activeIndex) return "completed";
      if (i === activeIndex) return "active";
      return "inactive";
    },
  };
}
