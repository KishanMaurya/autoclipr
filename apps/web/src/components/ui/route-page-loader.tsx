"use client";

import { usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";
import { isCreateFlowRoute } from "@/lib/api-loading";

export function RoutePageLoader() {
  const pathname = usePathname();

  if (isCreateFlowRoute(pathname)) {
    return null;
  }

  return (
    <div
      className="flex min-h-[50vh] flex-col items-center justify-center gap-3 py-16"
      role="status"
      aria-live="polite"
      aria-label="Loading page"
    >
      <Loader2 className="h-9 w-9 animate-spin text-emerald-400" />
      <p className="text-sm text-muted-foreground">Loading…</p>
    </div>
  );
}
