"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Users, DollarSign, Video, Scissors, Bot, CreditCard,
  Trophy, Globe, BarChart2, Link2, Bell, Activity, XCircle, ClipboardList,
  ShieldCheck, Menu, X, Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

const NAV = [
  { label: "OVERVIEW",   items: [
    { href: "/admin",                icon: LayoutDashboard, label: "Dashboard" },
  ]},
  { label: "USERS & CONTENT", items: [
    { href: "/admin/users",          icon: Users,       label: "Users" },
    { href: "/admin/videos",         icon: Video,       label: "Videos & Clips" },
    { href: "/admin/top-creators",   icon: Trophy,      label: "Top Creators" },
  ]},
  { label: "BUSINESS",  items: [
    { href: "/admin/revenue",        icon: DollarSign,  label: "Revenue" },
    { href: "/admin/subscriptions",  icon: CreditCard,  label: "Subscriptions" },
    { href: "/admin/affiliates",     icon: Link2,       label: "Affiliates" },
  ]},
  { label: "PRODUCT",   items: [
    { href: "/admin/ai-usage",       icon: Bot,         label: "AI Usage" },
    { href: "/admin/analytics",      icon: BarChart2,   label: "Analytics" },
    { href: "/admin/countries",      icon: Globe,       label: "Countries" },
  ]},
  { label: "OPS",       items: [
    { href: "/admin/system",         icon: Activity,    label: "System Health" },
    { href: "/admin/errors",         icon: XCircle,     label: "Errors" },
    { href: "/admin/notifications",  icon: Bell,        label: "Notifications" },
    { href: "/admin/audit-logs",     icon: ClipboardList, label: "Audit Logs" },
  ]},
  { label: "ADMIN",     items: [
    { href: "/admin/settings",       icon: Settings,    label: "Settings" },
    { href: "/admin/team",           icon: ShieldCheck, label: "Admin Team" },
  ]},
];

export function AdminSidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        className="fixed left-4 top-4 z-50 rounded-lg border border-white/10 bg-[#0a0614]/90 p-2 backdrop-blur-xl lg:hidden"
        onClick={() => setOpen(!open)}
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {open && (
        <button
          className="fixed inset-0 z-30 bg-black/60 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <aside className={cn(
        "fixed inset-y-0 left-0 z-40 flex w-56 flex-col border-r border-white/[0.06] bg-[#06030f] transition-transform lg:translate-x-0",
        open ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
      )}>
        {/* Header */}
        <div className="flex h-14 items-center gap-2 border-b border-white/[0.06] px-4">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-red-600">
            <ShieldCheck className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold leading-none text-white">AutoClipr</p>
            <p className="text-[10px] text-red-400 font-semibold tracking-wider">ADMIN</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
          {NAV.map((group) => (
            <div key={group.label}>
              <p className="mb-1 px-2 text-[9px] font-bold uppercase tracking-[0.15em] text-white/25">
                {group.label}
              </p>
              {group.items.map((item) => {
                const active = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-all",
                      active
                        ? "bg-red-600/20 text-red-400 font-semibold"
                        : "text-white/45 hover:bg-white/[0.04] hover:text-white/80"
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="border-t border-white/[0.06] p-3">
          <Link
            href="/dashboard"
            className="block rounded-lg px-2.5 py-2 text-xs text-white/30 hover:text-white/60 transition-colors"
          >
            ← Back to app
          </Link>
        </div>
      </aside>
    </>
  );
}
