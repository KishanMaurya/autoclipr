"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Search, Trash2, Youtube } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { apiFetch, type YoutubeChannel } from "@/lib/api";
import {
  filterTrialChannels,
  resolveChannelFromInput,
  type TrialChannel,
} from "@/lib/trial-channels";
import { markOnboardingComplete } from "@/lib/onboarding";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function TrialChannelSetup() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [channels, setChannels] = useState<YoutubeChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<TrialChannel | null>(null);

  const suggestions = useMemo(() => filterTrialChannels(query), [query]);

  const loadChannels = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) return;

    const res = await apiFetch<YoutubeChannel[]>("/api/v1/channels", {
      token: session.access_token,
    });
    if (res.success && res.data) {
      setChannels(res.data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadChannels();
  }, [loadChannels]);

  function pickChannel(channel: TrialChannel) {
    setSelected(channel);
    setQuery(channel.name);
    setError(null);
  }

  async function connectChannel() {
    setError(null);
    const channel = selected ?? resolveChannelFromInput(query);
    if (!channel) {
      setError(
        "Trial accounts can only connect curated channels. Pick one from the list below."
      );
      return;
    }

    setConnecting(true);
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) {
      setConnecting(false);
      return;
    }

    const res = await apiFetch<YoutubeChannel>("/api/v1/channels", {
      method: "POST",
      token: session.access_token,
      body: JSON.stringify({
        channel_url: channel.url,
        channel_name: channel.name,
        is_trial_channel: true,
      }),
    });

    if (!res.success) {
      setError(res.error?.message ?? "Failed to connect channel");
      setConnecting(false);
      return;
    }

    setQuery("");
    setSelected(null);
    await loadChannels();
    setConnecting(false);
  }

  async function disconnect(id: string) {
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) return;

    await apiFetch(`/api/v1/channels/${id}`, {
      method: "DELETE",
      token: session.access_token,
    });
    await loadChannels();
  }

  function goToDashboard() {
    markOnboardingComplete();
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="text-center">
        <Badge
          variant="outline"
          className="mb-4 border-violet-500/40 bg-violet-950/30 text-violet-300"
        >
          FREE TRIAL
        </Badge>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          TRIAL: choose from our selected channels
        </h1>
        <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-muted-foreground sm:text-base">
          You can add and clip <span className="text-foreground">any channel</span> once
          subscribed. AutoClipr will automatically detect when a new video is uploaded
          and create clips for you.
        </p>
      </div>

      <div className="mt-10 rounded-2xl border border-white/10 bg-zinc-900/60 p-6 sm:p-8">
        <div className="mb-6 flex items-center gap-2">
          <Youtube className="h-5 w-5 text-red-500" />
          <span className="font-semibold">Add YouTube Channel</span>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="channel-search">YouTube Channel URL</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="channel-search"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSelected(null);
                  setError(null);
                }}
                placeholder="Search for a YouTube channel..."
                className="pl-10"
                autoComplete="off"
              />
            </div>
          </div>

          {query && suggestions.length > 0 && !selected && (
            <ul className="max-h-40 overflow-y-auto rounded-xl border border-white/10 bg-black/40">
              {suggestions.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => pickChannel(c)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition-colors hover:bg-white/5"
                  >
                    <Youtube className="h-4 w-4 shrink-0 text-red-500" />
                    <span className="font-medium">{c.name}</span>
                    <span className="text-muted-foreground">{c.handle}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {error && <p className="text-sm text-red-400">{error}</p>}

          <Button
            variant="gradient"
            className="h-12 w-full text-base font-bold"
            disabled={connecting || (!query && !selected)}
            onClick={connectChannel}
          >
            <Plus className="mr-2 h-5 w-5" />
            {connecting ? "Connecting…" : "Connect Channel"}
          </Button>
        </div>

        {/* Curated trial picks */}
        <div className="mt-8">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Trial channels
          </p>
          <div className="flex flex-wrap gap-2">
            {filterTrialChannels("").map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => pickChannel(c)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs transition-colors",
                  selected?.id === c.id
                    ? "border-violet-500 bg-violet-500/20 text-violet-200"
                    : "border-white/10 bg-white/5 text-muted-foreground hover:border-white/20 hover:text-foreground"
                )}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>

        {/* Connected / empty state */}
        <div className="mt-10 border-t border-white/10 pt-8">
          {loading ? (
            <p className="text-center text-sm text-muted-foreground">Loading…</p>
          ) : channels.length === 0 ? (
            <div className="flex flex-col items-center py-6 text-center">
              <Youtube className="mb-4 h-10 w-10 text-muted-foreground/50" />
              <p className="font-medium">No Channels Connected</p>
              <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                Connect your first YouTube channel to start automatically creating
                clips from new videos.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm font-medium text-muted-foreground">
                Connected channels
              </p>
              {channels.map((ch) => (
                <div
                  key={ch.id}
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-black/30 px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <Youtube className="h-5 w-5 text-red-500" />
                    <div>
                      <p className="font-medium">{ch.channel_name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {ch.channel_url}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => disconnect(ch.id)}
                    className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-white/5 hover:text-red-400"
                    aria-label="Remove channel"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <Button
          variant={channels.length > 0 ? "gradient" : "outline"}
          onClick={goToDashboard}
        >
          {channels.length > 0 ? "Continue to Dashboard" : "Skip for now → Dashboard"}
        </Button>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/pricing">Upgrade to connect any channel</Link>
        </Button>
      </div>
    </div>
  );
}
