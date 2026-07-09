"use client";

import { useEffect, useState } from "react";
import { isTikTokBanned } from "@/lib/tiktok-regions";

type TikTokAvailability = "loading" | "available" | "banned";

/**
 * Detects the user's country via ipapi.co (free, no key) and returns
 * whether TikTok is banned in their region.
 */
export function useTikTokAvailability(): TikTokAvailability {
  const [status, setStatus] = useState<TikTokAvailability>("loading");

  useEffect(() => {
    let cancelled = false;

    async function detect() {
      try {
        const res = await fetch("https://ipapi.co/country/", {
          signal: AbortSignal.timeout(4000),
        });
        if (!res.ok) throw new Error("geo failed");
        const code = (await res.text()).trim();
        if (!cancelled) {
          setStatus(isTikTokBanned(code) ? "banned" : "available");
        }
      } catch {
        // On error (network, timeout), default to available so we don't
        // accidentally block users whose country doesn't ban TikTok.
        if (!cancelled) setStatus("available");
      }
    }

    detect();
    return () => { cancelled = true; };
  }, []);

  return status;
}
