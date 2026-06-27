"use client";

import { useEffect } from "react";

const API = `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080"}/api/v1`;

export function Heartbeat({ token }: { token: string }) {
  useEffect(() => {
    const ping = () =>
      fetch(`${API}/users/me/heartbeat`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});

    ping(); // immediate on mount
    const id = setInterval(ping, 60_000); // every 60s
    return () => clearInterval(id);
  }, [token]);

  return null;
}
