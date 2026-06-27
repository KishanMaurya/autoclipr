"use client";

import { useEffect, useState, useCallback } from "react";
import { Radio } from "lucide-react";

interface Props {
  token: string;
  apiBase: string;
  initialCount: number;
}

export function OnlineUsersCard({ token, apiBase, initialCount }: Props) {
  const [count, setCount] = useState(initialCount);
  const [updated, setUpdated] = useState<Date>(new Date());

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`${apiBase}/admin/stats`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (!res.ok) return;
      const json = await res.json();
      setCount(json.data?.users?.online ?? 0);
      setUpdated(new Date());
    } catch {}
  }, [token, apiBase]);

  useEffect(() => {
    const id = setInterval(refresh, 30_000);
    return () => clearInterval(id);
  }, [refresh]);

  const secs = Math.round((Date.now() - updated.getTime()) / 1000);

  return (
    <div className="rounded-xl border border-emerald-500/20 bg-[#24303F] p-5">
      <div className="flex items-center justify-between">
        <div className="rounded-xl p-3" style={{ background: "#10B98122" }}>
          <Radio className="h-5 w-5 text-emerald-400" />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[10px] font-semibold uppercase tracking-widest text-emerald-400">Live</span>
        </div>
      </div>
      <p className="mt-4 text-2xl font-bold text-white">{count}</p>
      <p className="mt-1 text-[13px] font-medium text-white/50">Online Now</p>
      <p className="mt-1 text-[10px] text-white/20">
        active in last 5 min &middot; refreshes every 30s
        {secs > 5 && ` · ${secs}s ago`}
      </p>
    </div>
  );
}
