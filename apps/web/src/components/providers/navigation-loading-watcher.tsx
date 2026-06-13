"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { resetNavigationLoading } from "@/lib/api-loading-store";

/** Clears navigation loader after route change completes. */
export function NavigationLoadingWatcher() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    resetNavigationLoading();
  }, [pathname, searchParams]);

  return null;
}
