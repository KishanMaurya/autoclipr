"use client";

import * as React from "react";
import {
  motion,
  useReducedMotion,
  type HTMLMotionProps,
  type Variants,
} from "framer-motion";
import { cn } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 28 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: EASE },
  },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.6, ease: EASE } },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.94 },
  show: { opacity: 1, scale: 1, transition: { duration: 0.6, ease: EASE } },
};

export const staggerContainer: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.08, delayChildren: 0.05 },
  },
};

type RevealProps = HTMLMotionProps<"div"> & {
  variant?: Variants;
  delay?: number;
  once?: boolean;
  amount?: number;
};

/** Scroll-triggered reveal wrapper. Respects reduced-motion. */
export function Reveal({
  children,
  className,
  variant = fadeUp,
  delay = 0,
  once = true,
  amount = 0.2,
  ...props
}: RevealProps) {
  const reduce = useReducedMotion();

  if (reduce) {
    return (
      <div className={className} {...(props as React.HTMLAttributes<HTMLDivElement>)}>
        {children as React.ReactNode}
      </div>
    );
  }

  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once, amount }}
      variants={variant}
      transition={delay ? { delay } : undefined}
      {...props}
    >
      {children}
    </motion.div>
  );
}

/** Container that staggers its Reveal/MotionItem children on scroll. */
export function Stagger({
  children,
  className,
  once = true,
  amount = 0.2,
  ...props
}: HTMLMotionProps<"div"> & { once?: boolean; amount?: number }) {
  const reduce = useReducedMotion();

  if (reduce) {
    return (
      <div className={className} {...(props as React.HTMLAttributes<HTMLDivElement>)}>
        {children as React.ReactNode}
      </div>
    );
  }

  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once, amount }}
      variants={staggerContainer}
      {...props}
    >
      {children}
    </motion.div>
  );
}

/** Child item for use inside <Stagger>. */
export function MotionItem({
  children,
  className,
  variant = fadeUp,
  ...props
}: HTMLMotionProps<"div"> & { variant?: Variants }) {
  return (
    <motion.div className={className} variants={variant} {...props}>
      {children}
    </motion.div>
  );
}

/** Interactive card with hover lift + tap feedback. */
export function MotionCard({
  children,
  className,
  variant = fadeUp,
  ...props
}: HTMLMotionProps<"div"> & { variant?: Variants }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={cn(className)}
      variants={variant}
      whileHover={reduce ? undefined : { y: -6, transition: { duration: 0.25, ease: EASE } }}
      whileTap={reduce ? undefined : { scale: 0.99 }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export { motion };
