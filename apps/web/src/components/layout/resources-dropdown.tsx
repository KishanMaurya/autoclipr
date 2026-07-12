"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { ChevronDown, BookOpen, HelpCircle, Star, MessageSquare, Lightbulb, Youtube, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

const RESOURCES = [
  {
    icon: BookOpen,
    label: "Blog",
    desc: "Tips, tutorials & creator growth strategies",
    href: "/blog",
  },
  {
    icon: HelpCircle,
    label: "FAQ",
    desc: "Common questions answered",
    href: "/faq",
  },
  {
    icon: Youtube,
    label: "Video Tutorials",
    desc: "Step-by-step guides to get the most out of AutoClipr",
    href: "/tutorials",
    badge: "New",
  },
  {
    icon: TrendingUp,
    label: "Creator Success Stories",
    desc: "Real results from real creators",
    href: "/success-stories",
  },
  {
    icon: Lightbulb,
    label: "How it Works",
    desc: "See how AutoClipr clips, captions & exports",
    href: "/#how-it-works",
  },
  {
    icon: MessageSquare,
    label: "Changelog",
    desc: "What's new — latest features & fixes",
    href: "/changelog",
  },
  {
    icon: Star,
    label: "Affiliate Program",
    desc: "Earn 30% recurring commission",
    href: "/affiliate",
    badge: "Earn",
  },
];

export function ResourcesDropdown() {
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleMouseEnter() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpen(true);
  }

  function handleMouseLeave() {
    closeTimer.current = setTimeout(() => setOpen(false), 120);
  }

  return (
    <div className="relative" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      <button
        className={cn(
          "flex items-center gap-1 rounded-full px-4 py-1.5 text-sm transition-colors",
          open
            ? "bg-white/[0.06] text-white"
            : "text-muted-foreground hover:bg-white/[0.04] hover:text-foreground"
        )}
      >
        Resources
        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform duration-200", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-[520px] rounded-2xl border border-white/[0.12] bg-[#0d0d1f] p-5 shadow-2xl">
          {/* Top accent line */}
          <div className="absolute inset-x-0 top-0 h-px rounded-t-2xl bg-gradient-to-r from-transparent via-violet-500/40 to-transparent" />

          <div className="grid grid-cols-2 gap-1">
            {RESOURCES.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="group flex items-start gap-3 rounded-xl p-3 transition-colors hover:bg-white/[0.05]"
                >
                  <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-violet-400 transition-colors group-hover:bg-violet-500/20">
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium text-white/80 group-hover:text-white">
                        {item.label}
                      </p>
                      {item.badge && (
                        <span className="rounded-full bg-violet-500/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-violet-300">
                          {item.badge}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-white/35">{item.desc}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
