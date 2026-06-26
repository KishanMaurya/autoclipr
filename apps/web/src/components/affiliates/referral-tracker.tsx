"use client";

import { useEffect } from "react";
import { apiFetch } from "@/lib/api";

const REF_COOKIE = "autoclipr_ref";
const TRACKED_KEY = "autoclipr_ref_tracked";

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function deleteCookie(name: string) {
  document.cookie = `${name}=;path=/;max-age=0`;
}

export function ReferralTracker({ token }: { token: string }) {
  useEffect(() => {
    const refCode = getCookie(REF_COOKIE);
    const alreadyTracked = sessionStorage.getItem(TRACKED_KEY);
    if (!refCode || alreadyTracked) return;

    // Fire-and-forget — don't block the user
    apiFetch("/api/v1/affiliates/track-signup", {
      method: "POST",
      token,
      body: JSON.stringify({ refCode }),
      skipGlobalLoader: true,
    }).then((res) => {
      if (res.success) {
        sessionStorage.setItem(TRACKED_KEY, "1");
        deleteCookie(REF_COOKIE);
      }
    }).catch(() => {
      // silently ignore — will retry on next login
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
