"use client";

import { motion } from "framer-motion";
import { InstagramIcon, TikTokIcon, YouTubeIcon } from "./brand-icons";
import type { CardState } from "./use-workflow";

const PLATFORMS = [
  { name: "TikTok", Icon: TikTokIcon },
  { name: "Instagram Reels", Icon: InstagramIcon },
  { name: "YouTube Shorts", Icon: YouTubeIcon },
];

/** Step 4 — the three destinations land one after another, then confirm. */
export function PublishStep({ state }: { state: CardState }) {
  const on = state !== "inactive";

  return (
    <div className="flex w-full flex-col items-center gap-3">
      <div className="flex items-center gap-2.5">
        {PLATFORMS.map(({ name, Icon }, i) => (
          <motion.div
            key={name}
            initial={false}
            animate={{
              scale: on ? 1 : 0.8,
              opacity: on ? 1 : 0.4,
              y: on ? 0 : 4,
            }}
            transition={{
              type: "spring",
              stiffness: 380,
              damping: 18,
              // Staggered so the three read as sequential publishes rather
              // than one simultaneous pop.
              delay: on ? 0.2 + i * 0.22 : 0,
            }}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-black/40 ring-1 ring-inset ring-white/10"
            title={name}
          >
            <Icon />
          </motion.div>
        ))}
      </div>

      <motion.p
        initial={false}
        animate={{ opacity: on ? 1 : 0, y: on ? 0 : 6 }}
        transition={{ duration: 0.4, delay: on ? 0.95 : 0 }}
        className="text-[11px] font-medium text-amber-400"
      >
        Published to 3 platforms
      </motion.p>
    </div>
  );
}
