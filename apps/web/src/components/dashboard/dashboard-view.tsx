"use client";

import { useCallback, useEffect, useState, useTransition, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  User,
  Plus,
  RefreshCw,
  Youtube,
  Clock,
  Video,
  Share2,
  Loader2,
  Sparkles,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { apiFetch, type Clip, type PlatformConnection, type Video as VideoType, type YoutubeChannel } from "@/lib/api";
import { setConnectedPlatforms } from "@/lib/platforms-storage";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClipsList } from "@/components/dashboard/clips-list";
import { DashboardPlatformsPanel } from "@/components/dashboard/dashboard-platforms-panel";
import {
  ConnectedChannelRow,
  ConnectedChannelsHeading,
} from "@/components/dashboard/connected-channel-row";

type DashboardViewProps = {
  initialChannels: YoutubeChannel[];
  initialClips: Clip[];
  initialVideos: VideoType[];
  initialPlatforms: PlatformConnection[];
};

function TikTokStatIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6 fill-emerald-400" aria-hidden>
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.77 1.52V6.76a4.85 4.85 0 0 1-1-.07z" />
    </svg>
  );
}

export function DashboardView({
  initialChannels,
  initialClips,
  initialVideos,
  initialPlatforms,
}: DashboardViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activateRef = useRef(false);
  const [isPending, startTransition] = useTransition();
  const [refreshing, setRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [channels, setChannels] = useState(initialChannels);
  const [clips, setClips] = useState(initialClips);
  const [videos, setVideos] = useState(initialVideos);
  const [platformCount, setPlatformCount] = useState(initialPlatforms.length);
  const [activeTab, setActiveTab] = useState("channels");
  const [removingChannelId, setRemovingChannelId] = useState<string | null>(null);

  const activeRuns =
    videos.filter((v) => v.status === "uploading" || v.status === "processing").length +
    clips.filter((c) => c.status === "pending" || c.status === "processing").length;

  const refreshData = useCallback(async () => {
    setRefreshing(true);
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) {
      setRefreshing(false);
      return;
    }
    const token = session.access_token;

    const [chRes, clipsRes, videosRes] = await Promise.all([
      apiFetch<YoutubeChannel[]>("/api/v1/channels", { token }),
      apiFetch<Clip[]>("/api/v1/clips?limit=24", { token }),
      apiFetch<VideoType[]>("/api/v1/videos?limit=24", { token }),
    ]);

    if (chRes.success && chRes.data) setChannels(chRes.data);
    if (clipsRes.success && clipsRes.data) setClips(clipsRes.data);
    if (videosRes.success && videosRes.data) setVideos(videosRes.data);
    setRefreshKey((k) => k + 1);
    setRefreshing(false);
    startTransition(() => router.refresh());
  }, [router]);

  useEffect(() => {
    setPlatformCount(initialPlatforms.length);
    setConnectedPlatforms(initialPlatforms.map((p) => p.platform));
  }, [initialPlatforms]);

  // Activate subscription on payment success redirect (webhook fallback)
  useEffect(() => {
    const payment = searchParams.get("payment");
    const plan = searchParams.get("plan");
    if (payment !== "success" || !plan || activateRef.current) return;
    activateRef.current = true;

    async function activate() {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;
      try {
        // Capture Dodo's transaction/subscription ID from URL if present
        const transactionId =
          searchParams.get("subscription_id") ??
          searchParams.get("payment_id") ??
          searchParams.get("transaction_id") ??
          "";
        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/billing/activate`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ planId: plan, transactionId, billingPeriod: searchParams.get("billing") ?? "yearly" }),
        });
        // Remove query params and refresh to show updated plan
        router.replace("/dashboard");
        router.refresh();
      } catch {
        // silently fail — webhook will handle it
      }
    }
    activate();
  }, [searchParams, router]);

  useEffect(() => {
    const onChannelsUpdated = () => {
      refreshData();
    };
    window.addEventListener("autoclipr:channels-updated", onChannelsUpdated);
    return () => window.removeEventListener("autoclipr:channels-updated", onChannelsUpdated);
  }, [refreshData]);

  async function disconnectChannel(id: string) {
    setRemovingChannelId(id);
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) return;

    await apiFetch(`/api/v1/channels/${id}`, {
      method: "DELETE",
      token: session.access_token,
    });
    await refreshData();
    setRemovingChannelId(null);
  }

  const isLoading = refreshing || isPending;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-brand shadow-glow">
            <User className="h-6 w-6 text-white" />
          </div>
          <div>
            <p className="section-label mb-2 !px-3 !py-1 !text-[10px]">Dashboard</p>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Your Command Center</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Monitor channels, track clips, and manage your content pipeline
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="gradient" size="sm" asChild>
            <Link href="/create">
              <Sparkles className="mr-1.5 h-4 w-4" />
              Create Viral Shorts
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild className="border-white/10">
            <Link href="/channels">
              <Plus className="mr-1.5 h-4 w-4" />
              Connect Channels
            </Link>
          </Button>
          <Button
            asChild
            size="sm"
            variant="outline"
            className="border-violet-500/25 bg-violet-500/5 hover:bg-violet-500/10"
          >
            <Link href="/setup/platforms?from=dashboard">
              <Share2 className="mr-1.5 h-4 w-4" />
              Platforms
            </Link>
          </Button>
          <Button
            asChild
            size="sm"
            variant="outline"
            className="border-amber-500/25 bg-amber-500/5 hover:bg-amber-500/10"
          >
            <Link href="/pricing">
              Upgrade
            </Link>
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={refreshData}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-1.5 h-4 w-4" />
            )}
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="stat-card border-white/[0.08]">
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/15 ring-1 ring-red-500/20">
              <Youtube className="h-7 w-7 text-red-500" />
            </div>
            <div>
              <p className="text-3xl font-bold tracking-tight">{channels.length}</p>
              <p className="text-sm text-muted-foreground">Connected Channels</p>
            </div>
          </CardContent>
        </Card>
        <Card className="stat-card border-white/[0.08]">
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/15 ring-1 ring-emerald-500/20">
              <TikTokStatIcon />
            </div>
            <div>
              <p className="text-3xl font-bold tracking-tight">{platformCount}</p>
              <p className="text-sm text-muted-foreground">Platforms Connected</p>
            </div>
          </CardContent>
        </Card>
        <Card className="stat-card border-white/[0.08]">
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/15 ring-1 ring-amber-500/20">
              <Clock className="h-7 w-7 text-amber-400" />
            </div>
            <div>
              <p className="text-3xl font-bold tracking-tight">{activeRuns}</p>
              <p className="text-sm text-muted-foreground">Active Runs</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
          <TabsTrigger value="channels">Channels</TabsTrigger>
          <TabsTrigger value="platforms">Platforms</TabsTrigger>
          <TabsTrigger value="runs">Agent Runs</TabsTrigger>
          <TabsTrigger value="clips">My Clips</TabsTrigger>
        </TabsList>

        {/* Channels tab */}
        <TabsContent value="channels">
          <TabPanel
            title="Connected Channels"
            onRefresh={refreshData}
            refreshing={isLoading}
          >
            {channels.length === 0 ? (
              <EmptyState
                icon={<Youtube className="h-12 w-12" />}
                title="No Channels Connected"
                description="Connect a YouTube channel to start auto-clipping new uploads."
                action={
                  <Button variant="gradient" size="sm" asChild>
                    <Link href="/channels">Connect Channel</Link>
                  </Button>
                }
              />
            ) : (
              <div>
                <ConnectedChannelsHeading count={channels.length} />
                <ul className="space-y-3">
                  {channels.map((ch) => (
                    <li key={ch.id}>
                      <ConnectedChannelRow
                        channel={ch}
                        onRemove={disconnectChannel}
                        removing={removingChannelId === ch.id}
                      />
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </TabPanel>
        </TabsContent>

        {/* Platforms tab */}
        <TabsContent value="platforms">
          <TabPanel title="Connected Platforms" onRefresh={refreshData} refreshing={isLoading}>
            <DashboardPlatformsPanel
              initialPlatforms={initialPlatforms}
              refreshKey={refreshKey}
              onCountChange={setPlatformCount}
            />
          </TabPanel>
        </TabsContent>

        {/* Agent Runs tab */}
        <TabsContent value="runs">
          <TabPanel title="Agent Runs" onRefresh={refreshData} refreshing={isLoading}>
            {activeRuns === 0 ? (
              <EmptyState
                icon={<Loader2 className="h-12 w-12" />}
                title="No Active Runs"
                description="When AutoClipr processes videos or generates clips, jobs appear here."
              />
            ) : (
              <ul className="space-y-3">
                {videos
                  .filter((v) => v.status !== "ready")
                  .map((v) => (
                    <li
                      key={v.id}
                      className="flex items-center justify-between rounded-xl border border-white/10 bg-black/30 px-4 py-3"
                    >
                      <div>
                        <p className="font-medium">{v.title}</p>
                        <p className="text-xs text-muted-foreground">Video · {v.status}</p>
                      </div>
                      <Loader2 className="h-4 w-4 animate-spin text-amber-400" />
                    </li>
                  ))}
                {clips
                  .filter((c) => c.status === "pending" || c.status === "processing")
                  .map((c) => (
                    <li
                      key={c.id}
                      className="flex items-center justify-between rounded-xl border border-white/10 bg-black/30 px-4 py-3"
                    >
                      <div>
                        <p className="font-medium">{c.title}</p>
                        <p className="text-xs text-muted-foreground">Clip · {c.status}</p>
                      </div>
                      <Loader2 className="h-4 w-4 animate-spin text-amber-400" />
                    </li>
                  ))}
              </ul>
            )}
          </TabPanel>
        </TabsContent>

        {/* My Clips tab */}
        <TabsContent value="clips">
          <TabPanel title="My Clips" onRefresh={refreshData} refreshing={isLoading}>
            <div className="mb-4 rounded-xl border border-violet-500/30 bg-violet-950/30 px-4 py-3 text-sm text-violet-200">
              Clips are not posted automatically yet. Connect platforms below, then use the{" "}
              <span className="font-semibold">Post</span> button on each completed clip.
            </div>
            {clips.length === 0 ? (
              <EmptyState
                icon={<Video className="h-12 w-12" />}
                title="No Clips Yet"
                description="Upload a video or connect a channel to generate your first clips."
                action={
                  <Button variant="gradient" size="sm" asChild>
                    <Link href="/create">Create Viral Shorts</Link>
                  </Button>
                }
              />
            ) : (
              <ClipsList clips={clips} />
            )}
          </TabPanel>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function TabPanel({
  title,
  children,
  onRefresh,
  refreshing,
}: {
  title: string;
  children: React.ReactNode;
  onRefresh: () => void;
  refreshing: boolean;
}) {
  return (
    <Card className="surface border-white/[0.08]">
      <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4">
        <h2 className="font-semibold">{title}</h2>
        <Button
          size="sm"
          variant="ghost"
          className="h-8 text-xs text-muted-foreground"
          onClick={onRefresh}
          disabled={refreshing}
        >
          {refreshing ? (
            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
          ) : (
            <RefreshCw className="mr-1 h-3 w-3" />
          )}
          Refresh
        </Button>
      </div>
      <CardContent className="p-6">{children}</CardContent>
    </Card>
  );
}

function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center py-12 text-center">
      <div className="mb-4 text-muted-foreground/40">{icon}</div>
      <p className="text-lg font-medium">{title}</p>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
