"use client";

import { Sun, Moon } from "lucide-react";
import { useState, useEffect } from "react";

export function AdminThemeToggle() {
  const [dark, setDark] = useState(true);

  useEffect(() => {
    const root = document.documentElement;
    if (dark) {
      root.style.setProperty("--admin-bg", "#06030f");
      root.style.setProperty("--admin-surface", "rgba(255,255,255,0.025)");
      root.style.setProperty("--admin-text", "#ffffff");
      root.style.setProperty("--admin-muted", "rgba(255,255,255,0.4)");
      document.body.classList.remove("admin-light");
      document.body.classList.add("admin-dark");
    } else {
      root.style.setProperty("--admin-bg", "#f1f5f9");
      root.style.setProperty("--admin-surface", "#ffffff");
      root.style.setProperty("--admin-text", "#0f172a");
      root.style.setProperty("--admin-muted", "#64748b");
      document.body.classList.remove("admin-dark");
      document.body.classList.add("admin-light");
    }
  }, [dark]);

  return (
    <button
      onClick={() => setDark(!dark)}
      className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition-all duration-200 ${
        dark
          ? "border-white/10 bg-white/[0.06] text-white/60 hover:bg-white/[0.1] hover:text-white"
          : "border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50"
      }`}
      title={dark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {dark ? (
        <>
          <Sun className="h-3.5 w-3.5 text-amber-400" />
          <span>Light</span>
        </>
      ) : (
        <>
          <Moon className="h-3.5 w-3.5 text-indigo-500" />
          <span>Dark</span>
        </>
      )}
    </button>
  );
}
