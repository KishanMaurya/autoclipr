"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertCircle, Loader2, Sparkles, Trash2 } from "lucide-react";
import { apiFetch, type Video, type VideoPipeline } from "@/lib/api";
import { getAccessToken } from "@/lib/auth-token";
import { formatPipelineError } from "@/lib/pipeline-errors";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { deleteVideo } from "@/lib/delete-video";

const PIPELINE_POLL_MS = 3000;

const STATUS_LABELS: Record<string, string> = {
  importing: "Importing",
  uploading: "Uploading",
  processing: "Processing",
  analyzing: "Analyzing",
  failed: "Failed",
};

function activeStepLabel(pipeline: VideoPipeline): string {
  const active = pipeline.steps.find((s) => s.status === "active");
  if (active) return active.label;
  if (pipeline.clips_created > 0) {
    return `${pipeline.clips_created} clip${pipeline.clips_created === 1 ? "" : "s"} ready`;
  }
  return "Preparing your video…";
}

type ProcessingVideosPanelProps = {
  videos: Video[];
};

export function ProcessingVideosPanel({ videos: initialVideos }: ProcessingVideosPanelProps) {
  const router = useRouter();
  const [videos, setVideos] = useState(initialVideos);
  const [pipelines, setPipelines] = useState<Record<string, VideoPipeline>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const pollAll = useCallback(async () => {
    const token = await getAccessToken();
    if (!token) return;

    let shouldRefresh = false;

    for (const video of videos) {
      const res = await apiFetch<VideoPipeline>(`/api/v1/videos/${video.id}/pipeline`, {
        token,
        skipGlobalLoader: true,
      });

      if (!res.success || !res.data) continue;

      const data = res.data;
      const failed = data.job?.status === "failed" || data.status === "failed";

      if (failed) {
        setErrors((prev) => ({
          ...prev,
          [video.id]: formatPipelineError(data.job?.error),
        }));
        continue;
      }

      setErrors((prev) => {
        if (!prev[video.id]) return prev;
        const next = { ...prev };
        delete next[video.id];
        return next;
      });

      setPipelines((prev) => ({ ...prev, [video.id]: data }));

      if (data.status === "ready" || data.progress_percent >= 100 || data.clips_created > 0) {
        shouldRefresh = true;
      }
    }

    if (shouldRefresh) {
      router.refresh();
    }
  }, [videos, router]);

  async function handleDelete(video: Video) {
    setActionError(null);
    setDeletingId(video.id);
    try {
      const error = await deleteVideo(video.id, video.title);
      if (error) {
        setActionError(error);
        return;
      }
      setVideos((prev) => prev.filter((v) => v.id !== video.id));
      router.refresh();
    } finally {
      setDeletingId(null);
    }
  }

  useEffect(() => {
    if (!videos.length) return;

    void pollAll();
    const interval = setInterval(() => void pollAll(), PIPELINE_POLL_MS);
    return () => clearInterval(interval);
  }, [videos, pollAll]);

  if (!videos.length) return null;

  return (
    <section>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Videos in progress</h2>
          <p className="text-sm text-muted-foreground">
            Clips appear automatically when processing finishes — no action needed.
          </p>
        </div>
        <Badge variant="outline" className="shrink-0">
          {videos.length} active
        </Badge>
      </div>

      {actionError && (
        <p className="mb-3 rounded-lg border border-red-500/30 bg-red-950/40 px-3 py-2 text-sm text-red-400">
          {actionError}
        </p>
      )}

      <Card className="glass border-white/10">
        <CardContent className="divide-y divide-white/10 p-0">
          {videos.map((video) => {
            const pipeline = pipelines[video.id];
            const error = errors[video.id];
            const progress = pipeline?.progress_percent ?? 8;
            const statusLabel = STATUS_LABELS[video.status] ?? video.status;

            return (
              <div key={video.id} className="space-y-3 p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{video.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {pipeline ? activeStepLabel(pipeline) : `${statusLabel}…`}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {!error && (
                      <Loader2 className="h-5 w-5 animate-spin text-emerald-400" />
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 border-red-500/40 text-red-400 hover:border-red-500/60 hover:bg-red-950/40 hover:text-red-300"
                      disabled={deletingId === video.id}
                      onClick={() => void handleDelete(video)}
                      aria-label={`Delete ${video.title}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {error ? (
                  <div className="flex flex-wrap items-start gap-3 rounded-lg border border-red-500/30 bg-red-950/30 px-3 py-2">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                    <div className="min-w-0 flex-1 space-y-2">
                      <p className="text-sm text-red-300">{error}</p>
                      <div className="flex flex-wrap gap-2">
                        <Button asChild size="sm" variant="outline" className="h-8">
                          <Link href="/create">Try again</Link>
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-8 border-red-500/40 text-red-400 hover:border-red-500/60 hover:bg-red-950/40 hover:text-red-300"
                          disabled={deletingId === video.id}
                          onClick={() => void handleDelete(video)}
                        >
                          <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <Progress value={progress} className="h-2" />
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <Sparkles className="h-3 w-3 text-violet-400" />
                        {statusLabel}
                      </span>
                      <span>{progress}%</span>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </section>
  );
}
