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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="section-label mb-2 !px-3 !py-1 !text-[10px]">Analytics</p>
          <h1 className="text-3xl font-bold">Posting Analytics</h1>
          <p className="mt-2 text-muted-foreground">
            Track posted clips, platform connections, and view counts.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          disabled={refreshing}
          onClick={refreshStats}
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
        />
        <StatCard
          icon={<Eye className="h-6 w-6 text-sky-400" />}
          label="Total views"
          value={formatNumber(summary.total_views)}
          hint="YouTube live stats"
        />
        <StatCard
          icon={<Heart className="h-6 w-6 text-pink-400" />}
          label="Total likes"
          value={formatNumber(summary.total_likes)}
        />
        <StatCard
          icon={<BarChart3 className="h-6 w-6 text-violet-400" />}
          label="Connected platforms"
          value={String(summary.connected_platforms_count)}
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
                {Object.entries(by_platform).map(([platform, stats]) => (
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
                    <div className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2">
                      <span className="flex items-center gap-2 text-sm">
                        <Eye className="h-4 w-4 text-sky-400" />
                        {formatNumber(stats.total_views)} views
                      </span>
                      <span className="flex items-center gap-2 text-sm text-muted-foreground">
                        <ThumbsUp className="h-4 w-4" />
                        {formatNumber(stats.total_likes)} likes
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-4 text-xs text-muted-foreground">
              Instagram and Facebook view counts will appear once Meta API integration is added.
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

function StatCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <Card className="stat-card border-white/[0.08]">
      <CardContent className="flex items-center gap-4 p-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 ring-1 ring-white/10">
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
