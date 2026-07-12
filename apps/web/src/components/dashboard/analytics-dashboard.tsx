"use client";

import { useState } from "react";
import Link from "next/link";
import {
  BarChart3,
  ExternalLink,
  Eye,
  Heart,
  Loader2,
  RefreshCw,
  Share2,
  ThumbsUp,
  Youtube,
} from "lucide-react";
import { apiFetch, type AnalyticsOverview } from "@/lib/api";
import { getAccessToken } from "@/lib/auth-token";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type AnalyticsDashboardProps = {
  initialData: AnalyticsOverview;
};

function formatNumber(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function platformIcon(platform: string) {
  if (platform === "youtube") return <Youtube className="h-4 w-4 text-red-500" />;
  return <Share2 className="h-4 w-4 text-violet-400" />;
}

export function AnalyticsDashboard({ initialData }: AnalyticsDashboardProps) {
  const [data, setData] = useState(initialData);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refreshStats() {
    setRefreshing(true);
    setError(null);
    try {
      const token = await getAccessToken();
      if (!token) return;

      const res = await apiFetch<AnalyticsOverview>("/api/v1/analytics/refresh", {
        method: "POST",
        token,
      });

      if (res.success && res.data) {
        setData({
          summary: res.data.summary,
          connected_platforms: res.data.connected_platforms,
          by_platform: res.data.by_platform,
          publications: res.data.publications,
        });
      } else {
        setError(res.error?.message ?? "Failed to refresh stats");
      }
    } finally {
      setRefreshing(false);
    }
  }

  const { summary, connected_platforms, by_platform, publications } = data;

  return (
    <div className="space-y-8">
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="pointer-events-none absolute -left-10 -top-12 h-44 w-72 rounded-full bg-sky-500/[0.07] blur-3xl" aria-hidden />
        <div className="relative">
          <p className="section-label mb-2 !px-3 !py-1 !text-[10px]">Analytics</p>
          <h1 className="text-3xl font-bold">
            Posting{" "}
            <span className="bg-gradient-to-r from-sky-400 to-violet-400 bg-clip-text text-transparent">
              Analytics
            </span>
          </h1>
          <p className="mt-2 text-muted-foreground">
            Track posted clips, platform connections, and view counts.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          disabled={refreshing}
          onClick={refreshStats}
          className="border-white/10 bg-white/[0.03] backdrop-blur hover:bg-white/[0.07]"
        >
          {refreshing ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Refresh stats
        </Button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-950/30 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<Share2 className="h-6 w-6 text-emerald-400" />}
          label="Posted clips"
          value={String(summary.posted_count)}
          accent="emerald"
        />
        <StatCard
          icon={<Eye className="h-6 w-6 text-sky-400" />}
          label="Total views"
          value={formatNumber(summary.total_views)}
          hint="YouTube live stats"
          accent="sky"
        />
        <StatCard
          icon={<Heart className="h-6 w-6 text-pink-400" />}
          label="Total likes"
          value={formatNumber(summary.total_likes)}
          accent="pink"
        />
        <StatCard
          icon={<BarChart3 className="h-6 w-6 text-violet-400" />}
          label="Connected platforms"
          value={String(summary.connected_platforms_count)}
          accent="violet"
        />
      </div>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card className="glass border-white/10">
          <CardContent className="p-6">
            <h2 className="mb-4 text-lg font-semibold">Connected platforms</h2>
            {connected_platforms.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                <p>No posting platforms connected.</p>
                <Button variant="gradient" size="sm" className="mt-4" asChild>
                  <Link href="/setup/platforms?from=dashboard">Connect platforms</Link>
                </Button>
              </div>
            ) : (
              <ul className="space-y-3">
                {connected_platforms.map((p) => (
                  <li
                    key={p.platform}
                    className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      {platformIcon(p.platform)}
                      <div>
                        <p className="font-medium">{p.platform_label}</p>
                        <p className="text-xs text-muted-foreground">
                          {p.account_name ?? "Connected"}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      {p.can_post ? (
                        <Badge variant="success">Ready</Badge>
                      ) : (
                        <Badge variant="outline">Setup</Badge>
                      )}
                      {p.metrics_supported && (
                        <p className="mt-1 text-[10px] text-muted-foreground">Views tracked</p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="glass border-white/10">
          <CardContent className="p-6">
            <h2 className="mb-4 text-lg font-semibold">Views by platform</h2>
            {Object.keys(by_platform).length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Post clips to see platform breakdown.
              </p>
            ) : (
              <ul className="space-y-4">
                {(() => {
                  const maxViews = Math.max(
                    1,
                    ...Object.values(by_platform).map((s) => s.total_views),
                  );
                  return Object.entries(by_platform).map(([platform, stats]) => (
                    <li key={platform}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2 capitalize">
                          {platformIcon(platform)}
                          {platform.replace("_", " ")}
                        </span>
                        <span className="text-muted-foreground">
                          {stats.posted_count} clip{stats.posted_count !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <div className="rounded-lg bg-white/5 px-3 py-2">
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-2 text-sm">
                            <Eye className="h-4 w-4 text-sky-400" />
                            {formatNumber(stats.total_views)} views
                          </span>
                          <span className="flex items-center gap-2 text-sm text-muted-foreground">
                            <ThumbsUp className="h-4 w-4" />
                            {formatNumber(stats.total_likes)} likes
                          </span>
                        </div>
                        {/* Proportional view bar */}
                        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-sky-500 to-violet-500 transition-all duration-500"
                            style={{ width: `${Math.max(4, (stats.total_views / maxViews) * 100)}%` }}
                          />
                        </div>
                      </div>
                    </li>
                  ));
                })()}
              </ul>
            )}
            <p className="mt-4 text-xs text-muted-foreground">
              Facebook view counts will appear once Meta API integration is added for that platform.
            </p>
          </CardContent>
        </Card>
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Posted videos</h2>
          <span className="text-sm text-muted-foreground">
            {publications.length} published
          </span>
        </div>

        {publications.length === 0 ? (
          <Card className="glass flex flex-col items-center border-white/10 p-12 text-center">
            <BarChart3 className="mb-4 h-12 w-12 text-muted-foreground/40" />
            <p className="text-lg font-medium">No posted clips yet</p>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              Generate clips and use the Post button to publish. URLs and view counts will show here.
            </p>
            <Button variant="gradient" size="sm" className="mt-6" asChild>
              <Link href="/clips">Go to clips</Link>
            </Button>
          </Card>
        ) : (
          <div className="overflow-hidden rounded-xl border border-white/10">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="border-b border-white/10 bg-black/30 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Clip</th>
                    <th className="px-4 py-3">Platform</th>
                    <th className="px-4 py-3">Views</th>
                    <th className="px-4 py-3">Likes</th>
                    <th className="px-4 py-3">Posted</th>
                    <th className="px-4 py-3">Link</th>
                  </tr>
                </thead>
                <tbody>
                  {publications.map((pub) => (
                    <tr
                      key={pub.id}
                      className="border-b border-white/5 hover:bg-white/[0.02]"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {pub.thumbnail_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={pub.thumbnail_url}
                              alt=""
                              className="h-12 w-8 rounded object-cover"
                            />
                          ) : (
                            <div className="flex h-12 w-8 items-center justify-center rounded bg-zinc-800">
                              <Share2 className="h-4 w-4 text-muted-foreground" />
                            </div>
                          )}
                          <span className="max-w-[180px] truncate font-medium">
                            {pub.clip_title}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-2">
                          {platformIcon(pub.platform)}
                          {pub.platform_label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {pub.metrics_supported ? (
                          formatNumber(pub.view_count)
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {pub.metrics_supported ? (
                          formatNumber(pub.like_count)
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {pub.posted_at
                          ? new Date(pub.posted_at).toLocaleDateString()
                          : "—"}
                      </td>
                      <td className="px-4 py-3">
                        {pub.platform_post_url ? (
                          <a
                            href={pub.platform_post_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-emerald-400 hover:underline"
                          >
                            Open
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

const STAT_ACCENTS: Record<string, { glow: string; bar: string; ring: string }> = {
  emerald: { glow: "from-emerald-500/15", bar: "from-emerald-500/70 to-emerald-500/0", ring: "bg-emerald-500/10 ring-emerald-500/25" },
  sky: { glow: "from-sky-500/15", bar: "from-sky-500/70 to-sky-500/0", ring: "bg-sky-500/10 ring-sky-500/25" },
  pink: { glow: "from-pink-500/15", bar: "from-pink-500/70 to-pink-500/0", ring: "bg-pink-500/10 ring-pink-500/25" },
  violet: { glow: "from-violet-500/15", bar: "from-violet-500/70 to-violet-500/0", ring: "bg-violet-500/10 ring-violet-500/25" },
};

function StatCard({
  icon,
  label,
  value,
  hint,
  accent = "emerald",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  accent?: string;
}) {
  const a = STAT_ACCENTS[accent] ?? STAT_ACCENTS.emerald;
  return (
    <Card className="stat-card group relative overflow-hidden border-white/[0.08] transition-all duration-300 hover:-translate-y-0.5 hover:border-white/[0.14]">
      <div
        className={`pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-gradient-to-br ${a.glow} to-transparent opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-100`}
      />
      <div className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r ${a.bar}`} />
      <CardContent className="relative flex items-center gap-4 p-6">
        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ring-1 ${a.ring}`}>
          {icon}
        </div>
        <div>
          <p className="text-2xl font-bold tracking-tight">{value}</p>
          <p className="text-sm text-muted-foreground">{label}</p>
          {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
