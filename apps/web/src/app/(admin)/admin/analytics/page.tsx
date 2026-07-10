import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { Users, Video, Scissors, Zap, Share2, TrendingUp } from "lucide-react";
import { DailyActivityChart, DistributionBarChart, StatusDonut } from "@/components/admin/charts";

export const metadata: Metadata = { title: "Analytics" };

const API = `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080"}/api/v1`;

type DayPoint = { date: string; value: number };
type NameValue = { name: string; value: number };

type AnalyticsData = {
  days: number;
  signupsByDay: DayPoint[];
  videosByDay: DayPoint[];
  clipsByDay: DayPoint[];
  clipStatus: NameValue[];
  videoStatus: NameValue[];
  jobTypes: NameValue[];
  jobStatus: NameValue[];
  publications: NameValue[];
  pubStatus: NameValue[];
  avgViralScore: number | null;
  totals: { signups: number; videos: number; clips: number; jobs: number; pubs: number };
};

async function fetchAnalytics(days: number): Promise<AnalyticsData | null> {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;
  const res = await fetch(`${API}/admin/analytics?days=${days}`, {
    headers: { Authorization: `Bearer ${session.access_token}` },
    next: { revalidate: 60 },
  });
  if (!res.ok) return null;
  return (await res.json()).data;
}

// Merge parallel day-series into one array keyed by date
function mergeDaily(
  series: { key: string; data: DayPoint[] }[],
): Record<string, unknown>[] {
  const map = new Map<string, Record<string, unknown>>();
  for (const s of series) {
    for (const p of s.data) {
      if (!map.has(p.date)) map.set(p.date, { date: p.date });
      map.get(p.date)![s.key] = p.value;
    }
  }
  return Array.from(map.values());
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const { days: daysParam } = await searchParams;
  const days = Math.min(90, Math.max(7, parseInt(daysParam ?? "30", 10)));
  const data = await fetchAnalytics(days);

  const kpis = data
    ? [
        { icon: Users,    label: "New Signups",   value: data.totals.signups, color: "text-blue-400",    bg: "bg-blue-500/10" },
        { icon: Video,    label: "Videos",         value: data.totals.videos,  color: "text-violet-400",  bg: "bg-violet-500/10" },
        { icon: Scissors, label: "Clips",          value: data.totals.clips,   color: "text-emerald-400", bg: "bg-emerald-500/10" },
        { icon: Zap,      label: "Jobs Run",       value: data.totals.jobs,    color: "text-orange-400",  bg: "bg-orange-500/10" },
        { icon: Share2,   label: "Published",      value: data.totals.pubs,    color: "text-pink-400",    bg: "bg-pink-500/10" },
        {
          icon: TrendingUp,
          label: "Avg Viral Score",
          value: data.avgViralScore != null ? `${data.avgViralScore}` : "—",
          color: "text-amber-400",
          bg: "bg-amber-500/10",
        },
      ]
    : [];

  const activitySeries = [
    { key: "signups", label: "Signups",  color: "#6366f1" },
    { key: "videos",  label: "Videos",   color: "#8b5cf6" },
    { key: "clips",   label: "Clips",    color: "#10b981" },
  ];

  const activityData = data
    ? mergeDaily([
        { key: "signups", data: data.signupsByDay },
        { key: "videos",  data: data.videosByDay },
        { key: "clips",   data: data.clipsByDay },
      ])
    : [];

  return (
    <div className="space-y-8 pb-12">
      {/* Header + day picker */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Analytics</h1>
          <p className="mt-1 text-sm text-white/35">
            Platform activity derived from DB · last {days} days
          </p>
        </div>
        <div className="flex gap-2">
          {[7, 30, 90].map((d) => (
            <a
              key={d}
              href={`?days=${d}`}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                days === d
                  ? "bg-white/10 text-white"
                  : "text-white/40 hover:text-white/70"
              }`}
            >
              {d}d
            </a>
          ))}
        </div>
      </div>

      {!data ? (
        <p className="text-sm text-white/40">Failed to load analytics.</p>
      ) : (
        <>
          {/* KPI row */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {kpis.map(({ icon: Icon, label, value, color, bg }) => (
              <div key={label} className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-4">
                <div className={`mb-2 inline-flex rounded-lg p-1.5 ${bg}`}>
                  <Icon className={`h-3.5 w-3.5 ${color}`} />
                </div>
                <p className="text-xl font-bold text-white">
                  {typeof value === "number" ? value.toLocaleString() : value}
                </p>
                <p className="mt-0.5 text-[11px] text-white/35">{label}</p>
              </div>
            ))}
          </div>

          {/* Daily activity chart */}
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-5">
            <h2 className="mb-4 text-sm font-semibold text-white">
              Daily Activity — last {days} days
            </h2>
            <DailyActivityChart data={activityData} series={activitySeries} />
          </div>

          {/* Row: Clip status + Video status */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-5">
              <h2 className="mb-2 text-sm font-semibold text-white">Clip Status</h2>
              <p className="mb-3 text-[11px] text-white/30">Distribution of clip statuses in this period</p>
              {data.clipStatus.length === 0 ? (
                <p className="py-8 text-center text-xs text-white/30">No clips in this period</p>
              ) : (
                <StatusDonut data={data.clipStatus} />
              )}
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-5">
              <h2 className="mb-2 text-sm font-semibold text-white">Video Status</h2>
              <p className="mb-3 text-[11px] text-white/30">Distribution of video statuses in this period</p>
              {data.videoStatus.length === 0 ? (
                <p className="py-8 text-center text-xs text-white/30">No videos in this period</p>
              ) : (
                <StatusDonut data={data.videoStatus} />
              )}
            </div>
          </div>

          {/* Row: Job types + Publications by platform */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-5">
              <h2 className="mb-4 text-sm font-semibold text-white">Processing Jobs by Type</h2>
              {data.jobTypes.length === 0 ? (
                <p className="py-8 text-center text-xs text-white/30">No jobs in this period</p>
              ) : (
                <DistributionBarChart data={data.jobTypes} />
              )}
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-5">
              <h2 className="mb-4 text-sm font-semibold text-white">Publications by Platform</h2>
              {data.publications.length === 0 ? (
                <p className="py-8 text-center text-xs text-white/30">No publications in this period</p>
              ) : (
                <DistributionBarChart data={data.publications} />
              )}
            </div>
          </div>

          {/* Row: Job status + Pub status */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-5">
              <h2 className="mb-4 text-sm font-semibold text-white">Job Status Breakdown</h2>
              {data.jobStatus.length === 0 ? (
                <p className="py-8 text-center text-xs text-white/30">No jobs in this period</p>
              ) : (
                <DistributionBarChart data={data.jobStatus} />
              )}
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-5">
              <h2 className="mb-4 text-sm font-semibold text-white">Publication Status</h2>
              {data.pubStatus.length === 0 ? (
                <p className="py-8 text-center text-xs text-white/30">No publications in this period</p>
              ) : (
                <DistributionBarChart data={data.pubStatus} />
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
