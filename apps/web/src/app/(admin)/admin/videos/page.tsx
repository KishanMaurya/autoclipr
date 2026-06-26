import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { Video, Scissors, Server, Clock } from "lucide-react";

export const metadata: Metadata = { title: "Videos & Clips" };

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1";

async function fetchStats() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;
  const res = await fetch(`${API}/admin/stats`, {
    headers: { Authorization: `Bearer ${session.access_token}` },
    next: { revalidate: 60 },
  });
  if (!res.ok) return null;
  return (await res.json()).data;
}

function fmtDuration(secs: number) {
  if (!secs) return "—";
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}m ${s}s`;
}

export default async function VideosPage() {
  const stats = await fetchStats();
  if (!stats) return <p className="text-white/40">Failed to load.</p>;

  const { videos, clips } = stats;

  const kpis = [
    { icon: Video,    label: "Total Videos",   value: videos.total.toLocaleString(),  sub: `+${videos.today} today`,          color: "bg-blue-500/10 text-blue-400" },
    { icon: Scissors, label: "Total Clips",    value: clips.total.toLocaleString(),   sub: `+${clips.today} today`,           color: "bg-violet-500/10 text-violet-400" },
    { icon: Server,   label: "Storage Used",   value: videos.storageFormatted,        sub: `${videos.storagePct}% of limit`,  color: "bg-amber-500/10 text-amber-400" },
    { icon: Clock,    label: "Avg Duration",   value: fmtDuration(videos.avgDurationSecs), sub: "per video",                 color: "bg-indigo-500/10 text-indigo-400" },
    { icon: Scissors, label: "Clips/Video",   value: clips.avgPerVideo,              sub: "average",                          color: "bg-emerald-500/10 text-emerald-400" },
  ];

  return (
    <div className="space-y-8 pb-12">
      <div>
        <h1 className="text-2xl font-bold text-white">Videos & Clips Analytics</h1>
        <p className="mt-1 text-sm text-white/35">Content volume and storage metrics</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-4">
            <div className={`mb-3 inline-flex rounded-lg p-2 ${k.color}`}>
              <k.icon className="h-4 w-4" />
            </div>
            <p className="text-2xl font-bold text-white">{k.value}</p>
            <p className="text-xs text-white/45">{k.label}</p>
            {k.sub && <p className="text-[11px] text-white/25 mt-0.5">{k.sub}</p>}
          </div>
        ))}
      </div>

      {/* Storage gauge */}
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-5">
        <h3 className="mb-4 text-sm font-semibold text-white/70">Storage Usage</h3>
        <div className="mb-2 flex justify-between text-xs">
          <span className="text-white/50">{videos.storageFormatted} used</span>
          <span className="text-white/30">{videos.storagePct}% of quota</span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${videos.storagePct}%`,
              background: videos.storagePct > 80 ? "#ef4444" : videos.storagePct > 60 ? "#f59e0b" : "#10b981",
            }}
          />
        </div>
        <p className="mt-3 text-xs text-white/30">
          Clips per video average: <span className="text-white/60 font-semibold">{clips.avgPerVideo}</span>
        </p>
      </div>

      {/* Placeholder for time-series chart */}
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-5">
        <h3 className="mb-4 text-sm font-semibold text-white/70">Upload Activity</h3>
        <div className="flex h-40 items-center justify-center">
          <p className="text-sm text-white/20">Per-day upload tracking coming soon</p>
        </div>
      </div>
    </div>
  );
}
