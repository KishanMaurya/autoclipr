"use client";

import { useState } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { ExternalLink } from "lucide-react";
import type { YTVideo } from "@/lib/youtube-api";
import { formatCount } from "@/lib/youtube-api";

type Props = {
  channelName: string;
  subscribers: string;
  totalViews: string;
  topVideos: YTVideo[];
};

function generateMockGrowth(baseViews: string, months = 12) {
  const base = parseInt(baseViews, 10) || 1_000_000_000;
  const perMonth = base / 12;
  return Array.from({ length: months }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (months - 1 - i));
    const variance = 0.7 + Math.random() * 0.6;
    return {
      month: date.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
      views: Math.round(perMonth * variance),
      shorts: Math.round(perMonth * variance * 0.7),
      longform: Math.round(perMonth * variance * 0.3),
    };
  });
}

const CHART_TABS = ["Views", "Subscribers", "Estimated Earnings"] as const;
const RANGES = ["7D", "28D", "3M", "1Y", "Max"] as const;

export function ChannelCharts({ channelName, subscribers, totalViews, topVideos }: Props) {
  const [chartTab, setChartTab] = useState<typeof CHART_TABS[number]>("Views");
  const [range, setRange] = useState<typeof RANGES[number]>("1Y");
  const [videoTab, setVideoTab] = useState<"top" | "latest">("top");

  const data = generateMockGrowth(totalViews);
  const totalForPeriod = formatCount(data.reduce((s, d) => s + d.views, 0));
  const longformTotal = formatCount(data.reduce((s, d) => s + d.longform, 0));
  const shortsTotal = formatCount(data.reduce((s, d) => s + d.shorts, 0));

  return (
    <div className="space-y-6">
      {/* Chart card */}
      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5">
        {/* Tab + Range row */}
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-1 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-1">
            {CHART_TABS.map((t) => (
              <button
                key={t}
                onClick={() => setChartTab(t)}
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                  chartTab === t ? "bg-emerald-500 text-white shadow" : "text-white/40 hover:text-white/70"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1">
            {RANGES.map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                  range === r ? "bg-white/10 text-white" : "text-white/30 hover:text-white/60"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Summary stats */}
        <div className="mb-4 flex gap-8">
          <div>
            <p className="text-2xl font-extrabold text-white">{totalForPeriod}</p>
            <p className="text-xs text-white/30">All views</p>
          </div>
          <div>
            <p className="text-2xl font-extrabold text-white">{longformTotal}</p>
            <p className="text-xs text-white/30">Long-form</p>
          </div>
          <div>
            <p className="text-2xl font-extrabold text-emerald-400">{shortsTotal}</p>
            <p className="text-xs text-white/30">Shorts</p>
          </div>
        </div>

        {/* Chart */}
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
              <defs>
                <linearGradient id="gViews" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gShorts" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="month" tick={{ fill: "rgba(255,255,255,0.25)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip
                contentStyle={{ background: "#0d0d1f", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, fontSize: 12 }}
                labelStyle={{ color: "rgba(255,255,255,0.5)" }}
                itemStyle={{ color: "#10b981" }}
                formatter={(v: unknown) => [formatCount(v as number), ""]}
              />
              <Area type="monotone" dataKey="views" stroke="#10b981" strokeWidth={2} fill="url(#gViews)" dot={false} />
              <Area type="monotone" dataKey="shorts" stroke="#06b6d4" strokeWidth={1.5} fill="url(#gShorts)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-2 flex items-center gap-4 text-xs text-white/30">
          <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-emerald-400" /> All views</span>
          <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-cyan-400" /> Shorts</span>
        </div>
      </div>

      {/* Top videos */}
      {topVideos.length > 0 && (
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5">
          <div className="mb-4 flex items-center gap-2">
            {(["top", "latest"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setVideoTab(t)}
                className={`rounded-xl px-4 py-2 text-sm font-semibold capitalize transition-all ${
                  videoTab === t ? "bg-emerald-500 text-white" : "border border-white/[0.08] text-white/40 hover:text-white/70"
                }`}
              >
                {t} videos
              </button>
            ))}
          </div>
          <p className="mb-4 text-sm font-semibold text-white/60">
            {channelName}&apos;s {videoTab} videos
          </p>

          {/* Header */}
          <div className="mb-2 grid grid-cols-[1fr_120px_80px] gap-3 px-2 text-[10px] font-bold uppercase tracking-widest text-white/20">
            <div>Video</div>
            <div className="text-right">Total Views</div>
            <div className="text-right">Likes</div>
          </div>

          <div className="space-y-1">
            {topVideos.slice(0, 8).map((v) => (
              <a
                key={v.id}
                href={`https://www.youtube.com/watch?v=${v.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="group grid grid-cols-[1fr_120px_80px] items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-white/[0.04]"
              >
                <div className="flex min-w-0 items-center gap-3">
                  {v.thumbnail && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={v.thumbnail} alt={v.title} className="h-10 w-16 shrink-0 rounded-lg object-cover" />
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-white/80 group-hover:text-white">{v.title}</p>
                    <p className="text-xs text-white/30">{new Date(v.publishedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
                  </div>
                </div>
                <div className="text-right text-sm font-semibold text-white/70">{formatCount(v.views)}</div>
                <div className="flex items-center justify-end gap-1 text-right text-sm text-white/40">
                  {formatCount(v.likes)}
                  <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-60" />
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Daily growth table (mock) */}
      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5">
        <h3 className="mb-4 font-semibold text-white">Daily Subscriber Growth &amp; View History for {channelName}</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06] text-left text-xs uppercase tracking-widest text-white/25">
                <th className="pb-3 pr-6">Date</th>
                <th className="pb-3 pr-6">Subscribers</th>
                <th className="pb-3 pr-6">Views</th>
                <th className="pb-3 pr-6">Views Change</th>
                <th className="pb-3">Est. Earnings</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 10 }, (_, i) => {
                const date = new Date();
                date.setDate(date.getDate() - i);
                const baseSubs = parseInt(subscribers, 10) || 500_000_000;
                const baseViews = parseInt(totalViews, 10) || 130_000_000_000;
                const subOffset = Math.round(i * (baseSubs * 0.001));
                const viewOffset = Math.round(i * (baseViews * 0.0008));
                const daily = Math.round(baseViews * 0.001 * (0.5 + Math.random()));
                const earning = (daily / 1000) * 3;
                return (
                  <tr key={i} className="border-b border-white/[0.04]">
                    <td className="py-3 pr-6 text-white/60">{date.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })}</td>
                    <td className="py-3 pr-6 text-white/80">{formatCount(baseSubs - subOffset)}</td>
                    <td className="py-3 pr-6 text-white/80">{formatCount(baseViews - viewOffset)}</td>
                    <td className={`py-3 pr-6 font-medium ${daily > 0 ? "text-emerald-400" : "text-red-400"}`}>+{formatCount(daily)}</td>
                    <td className="py-3 text-white/60">${earning.toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
