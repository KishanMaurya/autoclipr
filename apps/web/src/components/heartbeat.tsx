"use client";

import { useEffect } from "react";
import { getAccessToken } from "@/lib/auth-token";

const API = `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080"}/api/v1`;
const INTERVAL_MS = 60_000;

/**
 * Marks the user as online for the admin "online now" figure.
 *
 * Reads the token per ping rather than taking one as a prop. The token used to
 * be captured server-side when the shell rendered and reused forever, so once
 * that access token expired — an hour later — every ping 401'd, once a minute,
 * for as long as the tab stayed open. getAccessToken refreshes the session
 * when needed.
 */
export function Heartbeat() {
  useEffect(() => {
    let stopped = false;
    let timer: number | undefined;

    async function ping() {
      if (stopped) return;

      // Signed out, or the refresh failed: nothing useful to report.
      const token = await getAccessToken();
      if (!token || stopped) return;

      try {
        const res = await fetch(`${API}/users/me/heartbeat`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });

        // A rejection with a token this fresh means the session is genuinely
        // gone. Stop rather than retrying every minute until the tab closes.
        if (res.status === 401 || res.status === 403) {
          stopped = true;
          if (timer) window.clearInterval(timer);
        }
      } catch {
        // Offline or the API is down — the next tick tries again.
      }
    }

    void ping();
    timer = window.setInterval(ping, INTERVAL_MS);

    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, []);

  return null;
}
