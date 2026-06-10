"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Sparkles,
  Film,
  BarChart3,
  CreditCard,
  Settings,
  Scissors,
  Menu,
  X,
  Youtube,
  Link2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/create", label: "Viral Shorts", icon: Sparkles, highlight: true },
  { href: "/channels", label: "Channels", icon: Youtube },
  { href: "/clips", label: "Clips", icon: Film },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/billing", label: "Billing", icon: CreditCard },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function DashboardSidebar({ credits }: { credits: number }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="fixed left-4 top-20 z-40 rounded-xl border border-white/[0.08] bg-[#0a0618]/90 p-2.5 backdrop-blur-xl lg:hidden"
        onClick={() => setOpen(!open)}
        aria-label="Toggle menu"
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {open && (
        <button
          type="button"
          className="fixed inset-0 z-20 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setOpen(false)}
          aria-label="Close menu"
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 flex w-64 flex-col border-r border-white/[0.06] bg-[#030014]/80 backdrop-blur-2xl transition-transform lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex h-16 items-center gap-2.5 border-b border-white/[0.06] px-6">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-brand shadow-glow">
            <Scissors className="h-4 w-4 text-white" />
          </span>
          <span className="font-bold">AutoClipr</span>
        </div>

        <div className="mx-4 mt-6 overflow-hidden rounded-xl border border-emerald-700/25 bg-gradient-to-br from-emerald-950/40 to-emerald-900/20 p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Credits remaining
          </p>
          <p className="mt-1 text-3xl font-bold gradient-text">{credits}</p>
          <Link
            href="/billing"
            className="mt-3 inline-block text-xs font-medium text-emerald-400 hover:text-emerald-300"
          >
            Upgrade plan →
          </Link>
        </div>

        <div className="mx-4 mt-4">
          <Link
            href="/create"
            onClick={() => setOpen(false)}
            className={cn(
              "flex flex-col gap-2 rounded-xl p-4 create-sidebar-card",
              (pathname === "/create" || pathname === "/upload") && "create-sidebar-card-active"
            )}
          >
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-700">
                <Link2 className="h-4 w-4 text-white" />
              </span>
              <span className="text-sm font-bold leading-tight">Create Viral Shorts</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Paste YouTube, Vimeo, or any video URL
            </p>
          </Link>
        </div>

        <nav className="mt-6 flex-1 space-y-1 px-3">
          {nav.map((item) => {
            const hrefBase = item.href.split("?")[0];
            const active =
              pathname === hrefBase ||
              (hrefBase === "/create" && pathname === "/upload") ||
              (item.href === "/channels" && pathname.startsWith("/channels"));
            const Icon = item.icon;
            const isHighlight = "highlight" in item && item.highlight;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                  active
                    ? hrefBase === "/create"
                      ? "create-nav-active"
                      : "bg-gradient-brand text-white shadow-glow"
                    : isHighlight
                      ? "border border-emerald-500/25 bg-emerald-500/10 text-foreground hover:bg-emerald-500/15"
                      : "text-muted-foreground hover:bg-white/[0.04] hover:text-foreground"
                )}
              >
                <Icon
                  className={cn(
                    "h-4 w-4",
                    !active && (isHighlight ? "group-hover:text-emerald-400" : "group-hover:text-violet-400")
                  )}
                />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-white/[0.06] p-4">
          <p className="text-xs text-muted-foreground">
            Need help?{" "}
            <a href="mailto:hello@autoclipr.ai" className="text-emerald-400 hover:underline">
              Contact support
            </a>
          </p>
        </div>
      </aside>
    </>
  );
}
