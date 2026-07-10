"use client";

import { cn } from "@/lib/utils";

type LogoIconProps = {
  className?: string;
  size?: number;
};

/** Play-button brand icon — drop-in replacement for the Scissors logo. */
export function LogoIcon({ className, size = 16 }: LogoIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      className={cn(className)}
      aria-hidden="true"
    >
      <polygon
        points="24,14 24,86 86,50"
        fill="white"
        stroke="black"
        strokeWidth="10"
        strokeLinejoin="round"
      />
    </svg>
  );
}
