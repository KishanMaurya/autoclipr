"use client";

import { useEffect, useState } from "react";
import { getBannedPlatforms } from "@/lib/platform-regions";

type AvailabilityState = {
  loading: boolean;
  banned: ReadonlySet<string>; // platform ids that are banned in user's country
  countryCode: string | null;
};

/**
 * Detects the user's country via ipapi.co (free, no API key) and returns
 * which platforms are banned in their region.
 *
 * Defaults to no bans on timeout/error so users aren't wrongly blocked.
 */
export function usePlatformAvailability(): AvailabilityState {
  const [state, setState] = useState<AvailabilityState>({
    loading: true,
    banned: new Set(),
    countryCode: null,
  });

  useEffect(() => {
    let cancelled = false;

    async function detect() {
      // Cache in sessionStorage to avoid hitting ipapi.co rate limits
      const cached = sessionStorage.getItem("geo_country");
      if (cached) {
        if (!cancelled) {
          setState({ loading: false, banned: new Set(getBannedPlatforms(cached)), countryCode: cached });
        }
        return;
      }

      try {
        const res = await fetch("https://ipapi.co/country/", {
          signal: AbortSignal.timeout(4000),
        });
        if (!res.ok) throw new Error("geo failed");
        const code = (await res.text()).trim();
        sessionStorage.setItem("geo_country", code);
        if (!cancelled) {
          setState({
            loading: false,
            banned: new Set(getBannedPlatforms(code)),
            countryCode: code,
          });
        }
      } catch {
        // Default to no bans on any error so users aren't wrongly blocked
        if (!cancelled) {
          setState({ loading: false, banned: new Set(), countryCode: null });
        }
      }
    }

    detect();
    return () => { cancelled = true; };
  }, []);

  return state;
}
