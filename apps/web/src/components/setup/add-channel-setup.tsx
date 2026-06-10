"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Search, Loader2, Youtube, CheckCircle2 } from "lucide-react";
import { getAccessToken } from "@/lib/auth-token";
import { apiFetch, type YoutubeChannel } from "@/lib/api";
import { notifyChannelsUpdated } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ConnectedChannelRow,
  ConnectedChannelsHeading,
} from "@/components/dashboard/connected-channel-row";

type ResolvedChannel = {
  channel_url: string;
  channel_name: string;
  thumbnail_url?: string;
};

type Phase = "idle" | "resolving" | "connecting";

export function AddChannelSetup({ embedded = false }: { embedded?: boolean }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [channels, setChannels] = useState<YoutubeChannel[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const loadChannels = useCallback(async () => {
    const token = await getAccessToken();
    if (!token) return;

    const res = await apiFetch<YoutubeChannel[]>("/api/v1/channels", { token });
    if (res.success && res.data) setChannels(res.data);
    setLoadingList(false);
  }, []);

  useEffect(() => {
    loadChannels();
  }, [loadChannels]);

  async function connectChannel() {
    const trimmed = query.trim();
    if (!trimmed) return;

    setError(null);
    setSuccess(null);
    setPhase("resolving");

    const token = await getAccessToken();
    if (!token) {
      setPhase("idle");
      router.push("/login?redirect=/channels");
      return;
    }

    const resolveRes = await apiFetch<ResolvedChannel>(
      `/api/v1/channels/resolve?q=${encodeURIComponent(trimmed)}`,
      { token }
    );

    if (!resolveRes.success || !resolveRes.data) {
      setError(resolveRes.error?.message ?? "Could not find that YouTube channel.");
      setPhase("idle");
      return;
    }

    setPhase("connecting");

    const connectRes = await apiFetch<YoutubeChannel>("/api/v1/channels", {
      method: "POST",
      token,
      body: JSON.stringify({
        channel_url: resolveRes.data.channel_url,
        channel_name: resolveRes.data.channel_name,
        thumbnail_url: resolveRes.data.thumbnail_url,
        is_trial_channel: false,
      }),
    });

    if (!connectRes.success) {
      setError(connectRes.error?.message ?? "Failed to connect channel");
      setPhase("idle");
      return;
    }

    setQuery("");
    setSuccess(
      `${resolveRes.data.channel_name} saved as a clip source. Use Create Viral Shorts with a video URL for now — automatic monitoring is coming soon.`,
    );
    await loadChannels();
    notifyChannelsUpdated();
    router.refresh();
    setPhase("idle");

    setTimeout(() => setSuccess(null), 6000);
  }

  async function disconnect(id: string) {
    setRemovingId(id);
    const token = await getAccessToken();
    if (!token) return;

    await apiFetch(`/api/v1/channels/${id}`, { method: "DELETE", token });
    await loadChannels();
    notifyChannelsUpdated();
    router.refresh();
    setRemovingId(null);
  }

  const busy = phase !== "idle";

  return (
    <div className="mx-auto max-w-2xl">
      <div className="text-center">
        <p className="section-label mx-auto mb-4">YouTube</p>
        <h1 className="text-balance text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">
          Add Channels To Clip From
        </h1>
        <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-muted-foreground sm:text-base">
          Save YouTube channels you clip from. This is separate from posting platforms — connect
          those under Settings → Platforms, then use the Post button on each clip.
        </p>
      </div>

      <div className="gradient-border mt-10 shadow-glow">
        <div className="p-6 sm:p-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/15 ring-1 ring-red-500/25">
            <Youtube className="h-5 w-5 text-red-500" />
          </div>
          <span className="text-lg font-semibold">Add YouTube Channel</span>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="channel-url">YouTube Channel URL</Label>
            <div className="relative">
              {phase === "resolving" ? (
                <Loader2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-violet-400" />
              ) : (
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              )}
              <Input
                id="channel-url"
                value={query}
                disabled={busy}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setError(null);
                  setSuccess(null);
                }}
                placeholder="Type channel name e.g. AdamLZ or @AdamLZ..."
                className="pl-10"
                onKeyDown={(e) => e.key === "Enter" && !busy && connectChannel()}
              />
            </div>
            {phase === "resolving" && (
              <p className="text-xs text-violet-400">Fetching channel details…</p>
            )}
          </div>

          {success && (
            <div className="flex items-start gap-2 rounded-xl border border-emerald-500/30 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-300">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              {success}
            </div>
          )}

          {error && <p className="text-sm text-red-400">{error}</p>}

          <Button
            variant="gradient"
            className="h-12 w-full text-base font-bold"
            disabled={busy || !query.trim()}
            onClick={connectChannel}
          >
            {phase === "resolving" ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Fetching channel…
              </>
            ) : phase === "connecting" ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Connecting…
              </>
            ) : (
              <>
                <Plus className="mr-2 h-5 w-5" />
                Connect Channel
              </>
            )}
          </Button>
        </div>

        <div className="mt-10 border-t border-white/[0.06] pt-8">
          {loadingList ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : channels.length === 0 ? (
            <div className="flex flex-col items-center py-4 text-center">
              <Youtube className="mb-4 h-10 w-10 text-muted-foreground/40" />
              <p className="font-medium">No Channels Connected</p>
              <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                Connect your first YouTube channel to start automatically creating
                clips from new videos.
              </p>
            </div>
          ) : (
            <div>
              <ConnectedChannelsHeading count={channels.length} />
              <div className="space-y-3">
                {channels.map((ch) => (
                  <ConnectedChannelRow
                    key={ch.id}
                    channel={ch}
                    onRemove={disconnect}
                    removing={removingId === ch.id}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
        </div>
      </div>

      {!embedded && (
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Button variant="outline" asChild>
            <Link href="/">← Back to Home</Link>
          </Button>
          <Button variant="gradient" asChild>
            <Link href="/login?redirect=/channels">Sign in to manage channels</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
