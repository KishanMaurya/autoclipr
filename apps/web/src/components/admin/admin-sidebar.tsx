"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Users, Video, Trophy, DollarSign, CreditCard,
  Link2, Bot, BarChart2, Globe, Activity, XCircle, Bell,
  ClipboardList, Settings, ShieldCheck, ChevronDown, Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

const SECTIONS = [
  {
    label: "MENU",
    items: [
      { href: "/admin",               icon: LayoutDashboard, label: "Dashboard" },
      { href: "/admin/users",         icon: Users,           label: "Users" },
      { href: "/admin/videos",        icon: Video,           label: "Videos & Clips" },
      { href: "/admin/top-creators",  icon: Trophy,          label: "Top Creators",  badge: "NEW" },
      { href: "/admin/revenue",       icon: DollarSign,      label: "Revenue" },
      { href: "/admin/subscriptions", icon: CreditCard,      label: "Subscriptions" },
      { href: "/admin/affiliates",    icon: Link2,           label: "Affiliates" },
      { href: "/admin/ai-usage",      icon: Bot,             label: "AI Usage",      badge: "NEW" },
      { href: "/admin/analytics",     icon: BarChart2,       label: "Analytics" },
      { href: "/admin/countries",     icon: Globe,           label: "Countries" },
    ],
  },
  {
    label: "OPS",
    items: [
      { href: "/admin/system",        icon: Activity,        label: "System Health" },
      { href: "/admin/errors",        icon: XCircle,         label: "Errors" },
      { href: "/admin/notifications", icon: Bell,            label: "Notifications",  badge: "NEW" },
      { href: "/admin/audit-logs",    icon: ClipboardList,   label: "Audit Logs" },
    ],
  },
  {
    label: "ADMIN",
    items: [
      { href: "/admin/settings",      icon: Settings,        label: "Settings" },
      { href: "/admin/team",          icon: ShieldCheck,     label: "Admin Team" },
    ],
  },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function AdminSidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Backdrop (mobile) */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-[260px] flex-col bg-[#1C2434] transition-transform duration-300 ease-out lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        {/* Logo */}
        <div className="flex h-[70px] shrink-0 items-center gap-2.5 border-b border-white/[0.08] px-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-red-500 to-violet-600 shadow-lg shadow-violet-900/30">
            <Zap className="h-5 w-5 text-white" fill="white" />
          </div>
          <div>
            <p className="text-[15px] font-bold leading-none text-white">AutoClipr</p>
            <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-white/40">Admin Panel</p>
          </div>
        </div>

        {/* Nav */}
        <nav
          className="flex-1 overflow-y-auto px-4 py-4"
          style={{ scrollbarWidth: "none" }}
        >
          {SECTIONS.map((section) => (
            <div key={section.label} className="mb-6">
              <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/30">
                {section.label}
              </p>
              <ul className="space-y-0.5">
                {section.items.map((item) => {
                  const active =
                    pathname === item.href ||
                    (item.href !== "/admin" && pathname.startsWith(item.href));
                  const Icon = item.icon;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={onClose}
                        className={cn(
                          "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13.5px] font-medium transition-colors",
                          active
                            ? "bg-[#3C50E0] text-white"
                            : "text-[#8A99AF] hover:bg-white/[0.05] hover:text-white"
                        )}
                      >
                        <Icon className={cn("h-4.5 w-4.5 shrink-0", active ? "text-white" : "text-[#8A99AF] group-hover:text-white")} style={{ width: 18, height: 18 }} />
                        <span className="flex-1">{item.label}</span>
                        {item.badge && (
                          <span className="rounded-full bg-emerald-500 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="shrink-0 border-t border-white/[0.08] p-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-[#8A99AF] hover:bg-white/[0.05] hover:text-white transition-colors"
          >
            <ChevronDown className="h-4 w-4 rotate-90" />
            Back to App
          </Link>
        </div>
      </aside>
    </>
  );
}
