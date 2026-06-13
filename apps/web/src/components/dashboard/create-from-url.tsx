"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Link2,
  Loader2,
  Sparkles,
  CheckCircle2,
  Circle,
  Flame,
  Download,
  Mic,
  Zap,
  Share2,
} from "lucide-react";
import { getAccessToken } from "@/lib/auth-token";
import { apiFetch, type Profile } from "@/lib/api";
import {
  CAPTION_STYLES,
  DURATIONS,
  EXPORT_QUALITIES,
  LANGUAGES,
  PLATFORMS,
  SUPPORTED_SOURCES,
} from "@/lib/video-sources";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

type PipelineStep = {
  id: string;
  label: string;
  status: "pending" | "active" | "completed" | "failed";
  checks?: string[];
};

type PipelineResponse = {
  video_id: string;
  title: string;
  status: string;
  source_url: string | null;
  current_step: number | null;
  progress_percent: number;
  steps: PipelineStep[];
  clips_created: number;
  analysis?: Record<string, unknown>;
  job?: { status: string; error?: string };
};

const STEP_ICONS: Record<string, typeof Sparkles> = {
  download: Download,
  analyze: Mic,
  clips: Sparkles,
  captions: Zap,
  export: Share2,
};

const PIPELINE_POLL_MS = 3000;

function formatPipelineError(raw?: string | null): string {
  if (!raw?.trim()) {
    return "Processing failed. Please try again in a moment.";
  }

  if (/ThrottlerException|Too Many Requests|TOO_MANY_REQUESTS/i.test(raw)) {
    return "Too many status checks. Please wait a few seconds and click Try again.";
  }

  const withoutBanner = raw
    .replace(/ffmpeg version [\s\S]*?(?=Input #|Error|Invalid|No such|Unable|Could not)/i, "")
    .replace(/configuration:[\s\S]*?(?=Input #|Error|Invalid|No such|Unable|Could not)/i, "")
    .trim();

  const message = withoutBanner || raw;
  if (message.length <= 240) return message;

  return `${message.slice(0, 237).trim()}…`;
}

export function CreateFromUrl() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [clipCount, setClipCount] = useState(5);
  const [credits, setCredits] = useState<number | null>(null);
  const [creditCostPerClip, setCreditCostPerClip] = useState(1);
  const [durations, setDurations] = useState<number[]>([15, 30, 45, 60]);
  const [captionStyle, setCaptionStyle] = useState("viral");
  const [language, setLanguage] = useState("en");
  const [platforms, setPlatforms] = useState<string[]>([
    "tiktok",
    "instagram",
    "youtube",
    "linkedin",
  ]);
  const [exportQuality, setExportQuality] = useState("hd");
  const [processing, setProcessing] = useState(false);
  const [pipeline, setPipeline] = useState<PipelineResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const importCost = clipCount * creditCostPerClip;
  const hasEnoughCredits = credits === null || credits >= importCost;

  useEffect(() => {
    async function loadCredits() {
      const token = await getAccessToken();
      if (!token) return;
      const res = await apiFetch<Profile>("/api/v1/users/me", { token });
      if (res.success && res.data) {
        setCredits(res.data.credits);
        setCreditCostPerClip(res.data.clip_credit_cost ?? 1);
      }
    }
    loadCredits();
  }, []);

  const pollPipeline = useCallback(async (videoId: string) => {
    const token = await getAccessToken();
    if (!token) return null;
    const res = await apiFetch<PipelineResponse>(`/api/v1/videos/${videoId}/pipeline`, {
      token,
    });
    if (res.success && res.data) return res.data;
    return null;
  }, []);

  useEffect(() => {
    if (!pipeline?.video_id) return;

    const failed =
      pipeline.job?.status === "failed" ||
      pipeline.status === "failed";
    const complete =
      pipeline.progress_percent >= 100 ||
      pipeline.status === "ready";

    if (failed) {
      setError(formatPipelineError(pipeline.job?.error));
      setProcessing(false);
      return;
    }

    if (complete) {
      setProcessing(false);
      return;
    }

    const interval = setInterval(async () => {
      const data = await pollPipeline(pipeline.video_id);
      if (!data) return;

      setPipeline(data);

      if (data.job?.status === "failed" || data.status === "failed") {
        setError(formatPipelineError(data.job?.error));
        setProcessing(false);
        clearInterval(interval);
        return;
      }

      if (data.progress_percent >= 100 || data.status === "ready") {
        setProcessing(false);
        clearInterval(interval);
      }
    }, PIPELINE_POLL_MS);

    return () => clearInterval(interval);
  }, [pipeline?.video_id, pollPipeline]);

  function toggleDuration(sec: number) {
    setDurations((prev) =>
      prev.includes(sec) ? prev.filter((d) => d !== sec) : [...prev, sec].sort((a, b) => a - b)
    );
  }

  function togglePlatform(id: string) {
    setPlatforms((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  }

  async function handleCreate() {
    if (!url.trim()) return;
    setError(null);
    setProcessing(true);
    setPipeline(null);

    const token = await getAccessToken();
    if (!token) {
      setError("Please sign in again.");
      setProcessing(false);
      return;
    }

    const res = await apiFetch<{
      video_id: string;
      job_id: string;
      source_label: string;
      title: string;
    }>("/api/v1/videos/import-url", {
      method: "POST",
      token,
      body: JSON.stringify({
        url: url.trim(),
        clip_count: clipCount,
        durations: durations.length ? durations : [15, 30, 45, 60],
        caption_style: captionStyle,
        caption_language: language,
        platforms,
        export_quality: exportQuality,
        auto_publish: true,
      }),
    });

    if (!res.success || !res.data) {
      setError(res.error?.message ?? "Failed to start import");
      setProcessing(false);
      return;
    }

    setCredits((c) => (c !== null ? Math.max(0, c - importCost) : c));

    const initial = await pollPipeline(res.data.video_id);
    if (initial) setPipeline(initial);
    else {
      setPipeline({
        video_id: res.data.video_id,
        title: res.data.title,
        status: "importing",
        source_url: url,
        current_step: 1,
        progress_percent: 5,
        steps: [],
        clips_created: 0,
      });
    }
  }

  const isFailed =
    pipeline?.job?.status === "failed" || pipeline?.status === "failed";
  const isComplete =
    !!pipeline &&
    !isFailed &&
    (pipeline.progress_percent >= 100 || pipeline.status === "ready");
  const isProcessing = processing && !!pipeline && !isFailed && !isComplete;

  return (
    <div className="space-y-8">
      {isComplete ? (
        <div className="gradient-border shadow-glow">
          <div className="p-6 text-center sm:p-8">
            <Flame className="mx-auto mb-4 h-10 w-10 text-orange-400" />
            <h3 className="text-2xl font-bold">{pipeline!.clips_created} clips ready</h3>
            <p className="mt-2 text-muted-foreground">
              Viral scores, captions, and exports are prepared for your platforms.
            </p>
            <Button
              variant="gradient"
              className="mt-6"
              onClick={() => router.push(`/clips?video=${pipeline!.video_id}`)}
            >
              View My Clips
            </Button>
          </div>
        </div>
      ) : isProcessing ? (
        <div className="space-y-6">
          <div className="glass-panel p-6 sm:p-8">
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-emerald-400">Processing</p>
                <h2 className="text-xl font-bold">{pipeline?.title ?? "Your video"}</h2>
              </div>
              <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
            </div>
            <Progress value={pipeline?.progress_percent ?? 0} className="h-2" />
            <p className="mt-2 text-right text-xs text-muted-foreground">
              {pipeline?.progress_percent ?? 0}%
            </p>
          </div>

          <div className="space-y-3">
            {pipeline?.steps.map((step) => {
              const Icon = STEP_ICONS[step.id] ?? Sparkles;
              const done = step.status === "completed";
              const active = step.status === "active";
              return (
                <div
                  key={step.id}
                  className={cn(
                    "glass-panel p-5 transition-colors",
                    active && "border-emerald-500/30 ring-1 ring-emerald-500/20"
                  )}
                >
                  <div className="flex items-start gap-3">
                    {done ? (
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
                    ) : active ? (
                      <Loader2 className="mt-0.5 h-5 w-5 shrink-0 animate-spin text-emerald-400" />
                    ) : (
                      <Circle className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground/40" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <p className="font-medium">{step.label}</p>
                      </div>
                      {step.checks && step.checks.length > 0 && (
                        <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
                          {step.checks.map((check) => (
                            <li
                              key={check}
                              className="flex items-center gap-2 text-xs text-muted-foreground"
                            >
                              <CheckCircle2
                                className={cn(
                                  "h-3 w-3",
                                  active || done ? "text-emerald-400" : "text-white/20"
                                )}
                              />
                              {check}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <>
          <div className="glass-panel p-6 sm:p-8">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 ring-1 ring-emerald-500/25">
                <Link2 className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Paste Video URL</h2>
                <p className="text-sm text-muted-foreground">
                  YouTube, Vimeo, Loom, Google Drive, or direct MP4
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="video-url">Video URL</Label>
              <Input
                id="video-url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://youtube.com/watch?v=..."
                className="font-mono text-sm"
              />
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {SUPPORTED_SOURCES.map((s) => (
                <span
                  key={s.id}
                  className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-xs text-muted-foreground"
                >
                  {s.label}
                </span>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="glass-panel p-5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                Clip count
              </Label>
              <div className="mt-3 flex flex-wrap gap-2">
                {[5, 10, 15, 20].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setClipCount(n)}
                    className={cn(
                      "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                      clipCount === n
                        ? "create-selected"
                        : "border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06]"
                    )}
                  >
                    {n} clips
                  </button>
                ))}
              </div>
            </div>

            <div className="glass-panel p-5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                Duration
              </Label>
              <div className="mt-3 flex flex-wrap gap-2">
                {DURATIONS.map((sec) => (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => toggleDuration(sec)}
                    className={cn(
                      "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                      durations.includes(sec)
                        ? "create-selected"
                        : "border border-white/[0.08] bg-white/[0.03]"
                    )}
                  >
                    {sec}s
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="glass-panel p-5">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">
              Caption style
            </Label>
            <div className="mt-3 flex flex-wrap gap-2">
              {CAPTION_STYLES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setCaptionStyle(s.id)}
                  className={cn(
                    "rounded-lg px-3 py-2 text-sm transition-colors",
                    captionStyle === s.id
                      ? "bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/40"
                      : "border border-white/[0.08] text-muted-foreground"
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {LANGUAGES.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => setLanguage(l.id)}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs",
                    language === l.id ? "bg-white/10 text-foreground" : "text-muted-foreground"
                  )}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>

          <div className="glass-panel p-5">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">
              Publish to
            </Label>
            <div className="mt-3 flex flex-wrap gap-2">
              {PLATFORMS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => togglePlatform(p.id)}
                  className={cn(
                    "rounded-lg px-3 py-2 text-sm transition-colors",
                    platforms.includes(p.id)
                      ? "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30"
                      : "border border-white/[0.08] text-muted-foreground"
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Uses your connected channels — one-click publish when clips are ready
            </p>
          </div>

          <div className="glass-panel p-5">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">
              Export quality
            </Label>
            <div className="mt-3 flex flex-wrap gap-2">
              {EXPORT_QUALITIES.map((q) => (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => setExportQuality(q.id)}
                  className={cn(
                    "rounded-lg px-4 py-2 text-sm",
                    exportQuality === q.id
                      ? "create-selected"
                      : "border border-white/[0.08] text-muted-foreground"
                  )}
                >
                  {q.label}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="space-y-3">
              <p className="rounded-lg border border-red-500/30 bg-red-950/40 px-4 py-3 text-sm text-red-400">
                {error}
              </p>
              {(isFailed || error) && (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full border-red-500/30"
                  onClick={() => {
                    setError(null);
                    setPipeline(null);
                    setProcessing(false);
                  }}
                >
                  Try again
                </Button>
              )}
            </div>
          )}

          {credits !== null && (
            <div
              className={cn(
                "rounded-lg border px-4 py-3 text-sm",
                hasEnoughCredits
                  ? "border-emerald-500/30 bg-emerald-950/30 text-emerald-300"
                  : "border-amber-500/30 bg-amber-950/30 text-amber-200"
              )}
            >
              <p>
                <span className="font-semibold">{importCost} credits</span> for this import (
                {clipCount} clips × {creditCostPerClip} credit
                {creditCostPerClip === 1 ? "" : "s"} each) · You have{" "}
                <span className="font-semibold">{credits}</span> credits
              </p>
              {!hasEnoughCredits && (
                <p className="mt-1 text-xs opacity-90">
                  Lower clip count to {Math.floor(credits / creditCostPerClip) || 1} or fewer, or
                  add credits in Supabase / Billing.
                </p>
              )}
            </div>
          )}

          <Button
            variant="gradient"
            size="lg"
            className="w-full text-base font-bold"
            disabled={!url.trim() || !hasEnoughCredits}
            onClick={handleCreate}
          >
            <Sparkles className="mr-2 h-5 w-5" />
            Create Viral Shorts
          </Button>
        </>
      )}
    </div>
  );
}
