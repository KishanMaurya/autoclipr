"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Check, Link2, Loader2, Share2, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { apiFetch, type PlatformConnection } from "@/lib/api";
import { setConnectedPlatforms } from "@/lib/platforms-storage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type PlatformDef = {
  id: string;
  name: string;
  description: string;
  available: boolean;
  icon: React.ReactNode;
};

function YouTubeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn("h-5 w-5", className)} aria-hidden>
      <path
        fill="#FF0000"
        d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .6 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.3.6 9.3.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8z"
      />
      <path fill="#fff" d="M9.75 15.02l6.5-3.52-6.5-3.52v7.04z" />
    </svg>
  );
}

const PLATFORM_DEFS: PlatformDef[] = [
  {
    id: "youtube",
    name: "YouTube",
    description: "Post clips as YouTube Shorts",
    available: true,
    icon: <YouTubeIcon />,
  },
  {
    id: "tiktok",
    name: "TikTok",
    description: "Post clips to TikTok",
    available: false,
    icon: <Share2 className="h-5 w-5 text-emerald-400" />,
  },
  {
    id: "instagram",
    name: "Instagram",
    description: "Post clips as Reels",
    available: true,
    icon: <Share2 className="h-5 w-5 text-pink-400" />,
  },
  {
    id: "facebook",
    name: "Facebook",
    description: "Post clips to Facebook",
    available: true,
    icon: <Share2 className="h-5 w-5 text-blue-400" />,
  },
];

type DashboardPlatformsPanelProps = {
  initialPlatforms: PlatformConnection[];
  refreshKey?: number;
  onCountChange?: (count: number) => void;
};

export function DashboardPlatformsPanel({
  initialPlatforms,
  refreshKey = 0,
  onCountChange,
}: DashboardPlatformsPanelProps) {
  const [rows, setRows] = useState<PlatformConnection[]>(initialPlatforms);
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const syncRows = useCallback(
    (next: PlatformConnection[]) => {
      setRows(next);
      setConnectedPlatforms(next.map((p) => p.platform));
      onCountChange?.(next.length);
    },
    [onCountChange],
  );

  const loadPlatforms = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) return;

    const res = await apiFetch<PlatformConnection[]>("/api/v1/platforms", {
      token: session.access_token,
    });
    if (res.success && res.data) {
      syncRows(res.data);
    }
  }, [syncRows]);

  useEffect(() => {
    syncRows(initialPlatforms);
  }, [initialPlatforms, syncRows]);

  useEffect(() => {
    if (refreshKey > 0) {
      loadPlatforms();
    }
  }, [refreshKey, loadPlatforms]);

  async function confirmConnect(platformId: string) {
    setConnectingId(platformId);
    setPendingId(null);

    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) {
      setConnectingId(null);
      return;
    }

    const res = await apiFetch<PlatformConnection & { oauth_url?: string | null }>(
      "/api/v1/platforms",
      {
        method: "POST",
        token: session.access_token,
        body: JSON.stringify({ platform: platformId }),
      },
    );

    if (res.success && res.data) {
      const next = [...rows.filter((p) => p.platform !== platformId), res.data];
      syncRows(next);

      if (platformId === "youtube" && res.data.oauth_url) {
        window.location.href = res.data.oauth_url;
        return;
      }
    }

    setConnectingId(null);
  }

  async function authorizeYoutube() {
    setConnectingId("youtube");
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) {
      setConnectingId(null);
      return;
    }

    const res = await apiFetch<{ url: string }>("/api/v1/platforms/youtube/oauth-url", {
      token: session.access_token,
    });
    if (res.success && res.data?.url) {
      window.location.href = res.data.url;
      return;
    }
    setConnectingId(null);
  }

  async function removePlatform(platformId: string) {
    setRemovingId(platformId);
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) {
      setRemovingId(null);
      return;
    }

    await apiFetch(`/api/v1/platforms/${platformId}`, {
      method: "DELETE",
      token: session.access_token,
    });

    syncRows(rows.filter((p) => p.platform !== platformId));
    setRemovingId(null);
  }

  const connectedCount = rows.length;
  const pendingPlatform = PLATFORM_DEFS.find((p) => p.id === pendingId);

  return (
    <>
      {connectedCount > 0 && (
        <p className="mb-3 text-sm text-muted-foreground">
          {connectedCount} platform{connectedCount !== 1 ? "s" : ""} connected
        </p>
      )}

      <ul className="space-y-3">
        {PLATFORM_DEFS.map((def) => {
          const row = rows.find((p) => p.platform === def.id);
          const isConnected = !!row;
          const isLoading = connectingId === def.id || removingId === def.id;
          const needsYoutubeAuth =
            def.id === "youtube" && isConnected && row && !row.can_post;

          return (
            <li
              key={def.id}
              className="flex flex-col gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex min-w-0 flex-1 items-center gap-3">
                {def.icon}
                <div className="min-w-0">
                  <p className="font-semibold">{def.name}</p>
                  <p className="text-xs text-muted-foreground">{def.description}</p>
                  {row?.account_name && (
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {row.account_name}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                {isConnected ? (
                  <Badge variant="success" className="border-0">
                    <Check className="mr-1 h-3 w-3" />
                    {row?.can_post ? "Ready" : "Connected"}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="border-white/10 text-muted-foreground">
                    Not connected
                  </Badge>
                )}

                {needsYoutubeAuth && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8 border-emerald-500/30 text-emerald-300"
                    disabled={isLoading}
                    onClick={authorizeYoutube}
                  >
                    {connectingId === "youtube" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Link2 className="mr-1.5 h-3.5 w-3.5" />
                        Connect
                      </>
                    )}
                  </Button>
                )}

                {isConnected ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8 border-red-500/20 text-red-400 hover:bg-red-950/30 hover:text-red-300"
                    disabled={isLoading}
                    onClick={() => removePlatform(def.id)}
                  >
                    {removingId === def.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                        Remove
                      </>
                    )}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    variant={def.available ? "gradient" : "secondary"}
                    className="h-8"
                    disabled={!def.available || isLoading}
                    onClick={() => (def.available ? setPendingId(def.id) : undefined)}
                  >
                    {connectingId === def.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : !def.available ? (
                      "Coming soon"
                    ) : (
                      <>
                        <Link2 className="mr-1.5 h-3.5 w-3.5" />
                        Connect
                      </>
                    )}
                  </Button>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <div className="mt-6">
        <Button variant="outline" size="sm" asChild className="border-white/10">
          <Link href="/setup/platforms?from=dashboard">Manage all platforms</Link>
        </Button>
      </div>

      {pendingPlatform && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-zinc-950 p-6 shadow-2xl">
            <div className="mb-4 flex justify-center">{pendingPlatform.icon}</div>
            <h3 className="text-center text-lg font-bold">Connect {pendingPlatform.name}</h3>
            <p className="mt-3 text-center text-sm text-muted-foreground">
              You&apos;ll authorize AutoClipr to post clips on your behalf.
            </p>
            <div className="mt-6 flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setPendingId(null)}>
                Cancel
              </Button>
              <Button
                variant="gradient"
                className="flex-1 font-semibold"
                onClick={() => confirmConnect(pendingPlatform.id)}
              >
                Authorize
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
