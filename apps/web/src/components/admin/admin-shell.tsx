"use client";

import { useState } from "react";
import { Sun, Moon, Bell, Menu, Search } from "lucide-react";
import { AdminSidebar } from "./admin-sidebar";

interface AdminShellProps {
  children: React.ReactNode;
  userEmail?: string;
}

function getInitials(email: string) {
  const name = email.split("@")[0];
  return name.slice(0, 2).toUpperCase();
}

export function AdminShell({ children, userEmail = "" }: AdminShellProps) {
  const [dark, setDark] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className={dark ? "" : "[&_*]:![filter:invert(1)_hue-rotate(180deg)]"}>
      <AdminSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="lg:ml-[260px]">
        {/* Top Header */}
        <header
          className="sticky top-0 z-20 flex h-[70px] items-center gap-3 border-b px-4 sm:px-6"
          style={{
            borderColor: dark ? "rgba(255,255,255,0.06)" : "#E2E8F0",
            background: dark ? "#1C2434" : "#ffffff",
          }}
        >
          {/* Hamburger */}
          <button
            className="flex h-9 w-9 items-center justify-center rounded-lg transition-colors hover:bg-white/[0.07] lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5 text-white/60" />
          </button>

          {/* Search */}
          <div className="hidden flex-1 sm:flex">
            <div
              className="flex h-10 w-full max-w-sm items-center gap-2 rounded-lg border px-3"
              style={{
                borderColor: dark ? "rgba(255,255,255,0.08)" : "#E2E8F0",
                background: dark ? "rgba(255,255,255,0.04)" : "#F1F5F9",
              }}
            >
              <Search className="h-4 w-4 shrink-0 text-white/30" />
              <span className="flex-1 text-sm text-white/25">Search or type command...</span>
              <kbd
                className="rounded px-1.5 py-0.5 text-[10px] font-medium text-white/20"
                style={{ background: dark ? "rgba(255,255,255,0.06)" : "#E2E8F0" }}
              >
                ⌘K
              </kbd>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2">
            {/* Theme toggle */}
            <button
              onClick={() => setDark(!dark)}
              className="flex h-9 w-9 items-center justify-center rounded-lg transition-colors"
              style={{ background: dark ? "rgba(255,255,255,0.06)" : "#F1F5F9" }}
              title={dark ? "Light mode" : "Dark mode"}
            >
              {dark
                ? <Sun className="h-4.5 w-4.5 text-white/50" style={{ width: 18, height: 18 }} />
                : <Moon className="h-4.5 w-4.5 text-slate-500" style={{ width: 18, height: 18 }} />
              }
            </button>

            {/* Notifications */}
            <button
              className="relative flex h-9 w-9 items-center justify-center rounded-lg transition-colors"
              style={{ background: dark ? "rgba(255,255,255,0.06)" : "#F1F5F9" }}
            >
              <Bell className="text-white/50" style={{ width: 18, height: 18 }} />
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-orange-500 ring-2 ring-[#1C2434]" />
            </button>

            {/* Divider */}
            <div className="mx-1 h-8 w-px bg-white/[0.08]" />

            {/* User */}
            <button className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-xs font-bold text-white shadow-md">
                {getInitials(userEmail)}
              </div>
              <div className="hidden text-left sm:block">
                <p className="text-[13px] font-semibold text-white leading-none">
                  {userEmail.split("@")[0]}
                </p>
                <p className="mt-0.5 text-[10px] text-white/40">Admin</p>
              </div>
            </button>
          </div>
        </header>

        {/* Page content */}
        <main
          className="min-h-[calc(100vh-70px)] p-4 sm:p-6"
          style={{ background: dark ? "#1A222C" : "#F1F5F9" }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
