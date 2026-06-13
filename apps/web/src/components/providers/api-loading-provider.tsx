"use client";

import { Suspense, useSyncExternalStore } from "react";
import { Loader2 } from "lucide-react";
import {
  getLoadingPending,
  subscribeApiLoading,
} from "@/lib/api-loading-store";
import { NavigationLoadingWatcher } from "./navigation-loading-watcher";

function subscribe(callback: () => void) {
  return subscribeApiLoading(callback);
}

function getSnapshot() {
  return getLoadingPending() > 0;
}

function getServerSnapshot() {
  return false;
}

export function ApiLoadingProvider({ children }: { children: React.ReactNode }) {
  const isLoading = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return (
    <>
      <Suspense fallback={null}>
        <NavigationLoadingWatcher />
      </Suspense>
      {children}
      {isLoading && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-[#030014]/55 backdrop-blur-[2px]"
          role="status"
          aria-live="polite"
          aria-label="Loading"
        >
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/10 bg-black/40 px-8 py-6 shadow-glow">
            <Loader2 className="h-9 w-9 animate-spin text-emerald-400" />
            <p className="text-sm text-muted-foreground">Loading…</p>
          </div>
        </div>
      )}
    </>
  );
}
