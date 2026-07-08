"use client";

import { useState } from "react";
import { Download, Flame, Play, Scissors, Share2, Trash2, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Clip } from "@/lib/api";
import { downloadFile, sanitizeFilename } from "@/lib/download";
import { PostClipModal } from "@/components/dashboard/post-clip-modal";

type ClipCardProps = {
  clip: Clip;
  selectable?: boolean;
  selected?: boolean;
  onSelectChange?: (clipId: string, selected: boolean) => void;
  onDelete?: (clipId: string) => void;
};

export function ClipCard({
  clip,
  selectable = false,
  selected = false,
  onSelectChange,
  onDelete,
}: ClipCardProps) {
  const [thumbError, setThumbError] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [postOpen, setPostOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const durationSec =
    clip.duration_seconds ??
    Math.round((clip.end_time_ms - clip.start_time_ms) / 1000);
  const viralScore =
    clip.viral_score ?? (clip.ai_score != null ? Math.round(clip.ai_score * 100) : null);
  const canDownload = clip.status === "completed" && !!clip.download_url;
  const canPost = clip.status === "completed";
  const postedPlatforms =
    clip.publications?.filter((p) => p.status === "posted").map((p) => p.platform) ?? [];
  const failedPlatforms =
    clip.publications?.filter((p) => p.status === "failed").map((p) => p.platform) ?? [];

  async function handleDownload() {
    if (!clip.download_url) return;
    setDownloading(true);
    try {
      await downloadFile(clip.download_url, `${sanitizeFilename(clip.title)}.mp4`);
    } finally {
      setDownloading(false);
    }
  }

  async function handleDelete() {
    if (!onDelete) return;
    setDeleting(true);
    try {
      await onDelete(clip.id);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Card className="glass overflow-hidden">
      <div className="relative aspect-[9/16] w-full overflow-hidden bg-zinc-900">
        {clip.thumbnail_url && !thumbError ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={clip.thumbnail_url}
            alt={clip.title}
            className="absolute inset-0 h-full w-full object-cover object-center"
            onError={() => setThumbError(true)}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Scissors className="h-10 w-10 text-violet-400" />
          </div>
        )}

        {selectable && (
          <label className="absolute right-2 top-2 flex h-6 w-6 cursor-pointer items-center justify-center rounded-md border border-white/30 bg-black/60">
            <input
              type="checkbox"
              className="h-4 w-4 accent-emerald-500"
              checked={selected}
              onChange={(e) => onSelectChange?.(clip.id, e.target.checked)}
            />
          </label>
        )}

        {onDelete && (
          <button
            type="button"
            aria-label={`Delete ${clip.title}`}
            disabled={deleting}
            onClick={handleDelete}
            className="absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center rounded-lg border border-red-500/40 bg-black/70 text-red-400 transition hover:border-red-500/70 hover:bg-red-950/60 hover:text-red-300 disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}

        {viralScore != null && (
          <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-black/70 px-2 py-0.5 text-xs font-semibold text-orange-300">
            <Flame className="h-3 w-3" />
            {viralScore}/100
          </span>
        )}

        {/* Play button — only when clip is ready and has a playable URL */}
        {canDownload && (
          <button
            type="button"
            aria-label={`Play ${clip.title}`}
            onClick={() => setPreviewOpen(true)}
            className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-200 hover:opacity-100"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-black/60 backdrop-blur-sm ring-2 ring-white/30 transition hover:scale-105 hover:bg-black/75">
              <Play className="h-6 w-6 translate-x-0.5 fill-white text-white" />
            </span>
          </button>
        )}
      </div>

      <CardContent className="space-y-3 p-4">
        <h3 className="truncate font-semibold">{clip.title}</h3>
        <div className="flex items-center justify-between">
          <Badge variant={clip.status === "completed" ? "success" : "outline"}>
            {clip.status}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {durationSec}s · {clip.aspect_ratio}
          </span>
        </div>
        {postedPlatforms.length > 0 && (
          <p className="text-xs text-emerald-400">
            Posted to {postedPlatforms.join(", ")}
          </p>
        )}
        {failedPlatforms.length > 0 && (
          <p className="text-xs text-amber-400">
            Failed on {failedPlatforms.join(", ")} — try again
          </p>
        )}
        {(canDownload || canPost) && (
          <div className={canDownload && canPost ? "grid grid-cols-2 gap-2" : ""}>
            {canPost && (
              <Button
                type="button"
                variant="gradient"
                size="sm"
                className="w-full"
                onClick={() => setPostOpen(true)}
              >
                <Share2 className="mr-2 h-4 w-4" />
                Post
              </Button>
            )}
            {canDownload && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full"
                disabled={downloading}
                onClick={handleDownload}
              >
                <Download className="mr-2 h-4 w-4" />
                {downloading ? "…" : "Download"}
              </Button>
            )}
          </div>
        )}
      </CardContent>
      <PostClipModal clip={clip} open={postOpen} onClose={() => setPostOpen(false)} />

      {/* Video preview modal */}
      {previewOpen && clip.download_url && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
          onClick={() => setPreviewOpen(false)}
        >
          <div
            className="relative flex max-h-[90vh] w-full max-w-xs flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              aria-label="Close preview"
              onClick={() => setPreviewOpen(false)}
              className="absolute -right-2 -top-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
            >
              <X className="h-4 w-4" />
            </button>
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <video
              src={clip.download_url}
              controls
              autoPlay
              playsInline
              className="max-h-[85vh] w-full rounded-2xl bg-black"
            />
            <p className="mt-3 truncate text-center text-sm font-medium text-white/80">
              {clip.title}
            </p>
          </div>
        </div>
      )}
    </Card>
  );
}
