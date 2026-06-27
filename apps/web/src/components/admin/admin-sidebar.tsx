"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Users, DollarSign, Video, Scissors, Bot, CreditCard,
  Trophy, Globe, BarChart2, Link2, Bell, Activity, XCircle, ClipboardList,
  ShieldCheck, Menu, X, Settings, ChevronRight, Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

const NAV = [
  { label: "OVERVIEW", items: [
    { href: "/admin",               icon: LayoutDashboard, label: "Dashboard",      color: "text-violet-400" },
  ]},
  { label: "USERS & CONTENT", items: [
    { href: "/admin/users",         icon: Users,           label: "Users",           color: "text-sky-400" },
    { href: "/admin/videos",        icon: Video,           label: "Videos & Clips",  color: "text-blue-400" },
    { href: "/admin/top-creators",  icon: Trophy,          label: "Top Creators",    color: "text-amber-400" },
  ]},
  { label: "BUSINESS", items: [
    { href: "/admin/revenue",       icon: DollarSign,      label: "Revenue",         color: "text-emerald-400" },
    { href: "/admin/subscriptions", icon: CreditCard,      label: "Subscriptions",   color: "text-green-400" },
    { href: "/admin/affiliates",    icon: Link2,           label: "Affiliates",      color: "text-teal-400" },
  ]},
  { label: "PRODUCT", items: [
    { href: "/admin/ai-usage",      icon: Bot,             label: "AI Usage",        color: "text-fuchsia-400" },
    { href: "/admin/analytics",     icon: BarChart2,       label: "Analytics",       color: "text-indigo-400" },
    { href: "/admin/countries",     icon: Globe,           label: "Countries",       color: "text-cyan-400" },
  ]},
  { label: "OPS", items: [
    { href: "/admin/system",        icon: Activity,        label: "System Health",   color: "text-lime-400" },
    { href: "/admin/errors",        icon: XCircle,         label: "Errors",          color: "text-rose-400" },
    { href: "/admin/notifications", icon: Bell,            label: "Notifications",   color: "text-orange-400" },
    { href: "/admin/audit-logs",    icon: ClipboardList,   label: "Audit Logs",      color: "text-slate-400" },
  ]},
  { label: "ADMIN", items: [
    { href: "/admin/settings",      icon: Settings,        label: "Settings",        color: "text-white/50" },
    { href: "/admin/team",          icon: ShieldCheck,     label: "Admin Team",      color: "text-red-400" },
  ]},
];

export function AdminSidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Mobile toggle */}
      <button
        className="fixed left-4 top-4 z-50 flex items-center justify-center rounded-xl border border-white/10 bg-black/80 p-2.5 backdrop-blur-xl lg:hidden"
        onClick={() => setOpen(!open)}
      >
        {open ? <X className="h-4 w-4 text-white" /> : <Menu className="h-4 w-4 text-white" />}
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/70 backdrop-blur-sm lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <aside className={cn(
        "fixed inset-y-0 left-0 z-40 flex w-60 flex-col transition-transform duration-300 ease-out lg:translate-x-0",
        open ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
      )}
        style={{
          background: "linear-gradient(180deg, #0d0518 0%, #08030f 60%, #06020c 100%)",
          borderRight: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        {/* Subtle top glow */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-40 opacity-30"
          style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(139,92,246,0.25) 0%, transparent 70%)" }}
        />

        {/* Logo */}
        <div className="relative flex h-16 items-center gap-3 px-5">
          <div className="relative flex h-8 w-8 items-center justify-center rounded-xl"
            style={{ background: "linear-gradient(135deg, #dc2626, #7c3aed)" }}
          >
            <Zap className="h-4 w-4 text-white" fill="white" />
            <div className="absolute inset-0 rounded-xl opacity-60 blur-md"
              style={{ background: "linear-gradient(135deg, #dc2626, #7c3aed)" }}
            />
          </div>
          <div>
            <p className="text-[13px] font-bold tracking-tight text-white">AutoClipr</p>
            <div className="flex items-center gap-1">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-red-400">Admin Panel</p>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="mx-4 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5 scrollbar-none">
          {NAV.map((group) => (
            <div key={group.label}>
              <p className="mb-1.5 px-2 text-[9px] font-bold uppercase tracking-[0.18em] text-white/20">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const active = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all duration-150",
                        active
                          ? "text-white"
                          : "text-white/35 hover:text-white/75"
                      )}
                    >
                      {/* Active background */}
                      {active && (
                        <div className="absolute inset-0 rounded-xl"
                          style={{
                            background: "linear-gradient(90deg, rgba(139,92,246,0.18) 0%, rgba(139,92,246,0.06) 100%)",
                            border: "1px solid rgba(139,92,246,0.2)",
                          }}
                        />
                      )}
                      {/* Hover background */}
                      {!active && (
                        <div className="absolute inset-0 rounded-xl bg-white/0 group-hover:bg-white/[0.04] transition-colors" />
                      )}

                      {/* Icon */}
                      <div className={cn(
                        "relative flex h-6 w-6 shrink-0 items-center justify-center rounded-lg transition-all",
                        active ? "bg-white/10" : "bg-white/[0.04] group-hover:bg-white/[0.07]"
                      )}>
                        <Icon className={cn("h-3.5 w-3.5 transition-colors", active ? item.color : "text-white/30 group-hover:text-white/55")} />
                      </div>

                      <span className="relative flex-1">{item.label}</span>

                      {active && (
                        <ChevronRight className={cn("relative h-3.5 w-3.5 shrink-0", item.color)} />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Bottom */}
        <div className="mx-4 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />
        <div className="p-3">
          <Link
            href="/dashboard"
            className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs text-white/25 hover:bg-white/[0.04] hover:text-white/50 transition-all"
          >
            <div className="flex h-5 w-5 items-center justify-center rounded-md bg-white/[0.04]">
              <ChevronRight className="h-3 w-3 rotate-180" />
            </div>
            Back to App
          </Link>
        </div>
      </aside>
    </>
  );
}
