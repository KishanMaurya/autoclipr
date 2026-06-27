"use client";

import { useState } from "react";
import { Sun, Moon } from "lucide-react";

export function AdminShell({ children }: { children: React.ReactNode }) {
  const [light, setLight] = useState(false);

  return (
    <>
      {/* Sticky top bar */}
      <div
        className="sticky top-0 z-20 flex h-12 items-center justify-end px-6 backdrop-blur-xl"
        style={{
          borderBottom: light ? "1px solid #e2e8f0" : "1px solid rgba(255,255,255,0.05)",
          background: light ? "rgba(248,250,252,0.95)" : "rgba(6,3,15,0.85)",
        }}
      >
        <button
          onClick={() => setLight(!light)}
          title={light ? "Switch to dark mode" : "Switch to light mode"}
          className="flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-200"
          style={{
            background: light ? "#e2e8f0" : "rgba(255,255,255,0.07)",
            color: light ? "#475569" : "rgba(255,255,255,0.55)",
          }}
        >
          {light ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4 text-amber-400" />}
        </button>
      </div>

      {/* Page content — bg-[#06030f] gets inverted to near-white in light mode */}
      <div
        className="min-h-screen bg-[#06030f] px-4 py-6 sm:px-6 lg:px-8"
        style={light ? { filter: "invert(1) hue-rotate(180deg)" } : {}}
      >
        {children}
      </div>
    </>
  );
}
