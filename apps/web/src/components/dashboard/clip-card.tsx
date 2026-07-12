"use client";

import { useState } from "react";
import { Download, Flame, Play, Scissors, Share2, Trash2, X, ExternalLink, AlertCircle } from "lucide-react";
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

const PLATFORM_META: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  youtube: {
    label: "YouTube",
    color: "#FF0000",
    icon: (
      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current">
        <path d="M23.5 6.19a3.02 3.02 0 0 0-2.12-2.14C19.54 3.5 12 3.5 12 3.5s-7.54 0-9.38.55A3.02 3.02 0 0 0 .5 6.19C0 8.04 0 12 0 12s0 3.96.5 5.81a3.02 3.02 0 0 0 2.12 2.14C4.46 20.5 12 20.5 12 20.5s7.54 0 9.38-.55a3.02 3.02 0 0 0 2.12-2.14C24 15.96 24 12 24 12s0-3.96-.5-5.81zM9.75 15.5v-7l6.5 3.5-6.5 3.5z" />
      </svg>
    ),
  },
  instagram: {
    label: "Instagram",
    color: "#E1306C",
    icon: (
      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
      </svg>
    ),
  },
  tiktok: {
    label: "TikTok",
    color: "#010101",
    icon: (
      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current">
        <path d="M12.53.02C13.84 0 15.14.01 16.44 0c.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
      </svg>
    ),
  },
  facebook: {
    label: "Facebook",
    color: "#1877F2",
    icon: (
      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
  },
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
  const [scoreTooltip, setScoreTooltip] = useState(false);

  const durationSec =
    clip.duration_seconds ??
    Math.round((clip.end_time_ms - clip.start_time_ms) / 1000);
  const viralScore =
    clip.viral_score ?? (clip.ai_score != null ? Math.round(clip.ai_score * 100) : null);
  const canDownload = clip.status === "completed" && !!clip.download_url;
  const canPost = clip.status === "completed";

  const postedPubs =
    clip.publications?.filter((p) => p.status === "posted") ?? [];
  const failedPubs =
    clip.publications?.filter((p) => p.status === "failed") ?? [];
  const pendingPubs =
    clip.publications?.filter((p) => p.status === "pending" || p.status === "processing") ?? [];

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
          <label className="group/sel absolute right-2 top-2 z-10 cursor-pointer">
            <input
              type="checkbox"
              className="sr-only"
              checked={selected}
              onChange={(e) => onSelectChange?.(clip.id, e.target.checked)}
            />
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-full border-2 shadow-lg transition-all duration-200
                ${selected
                  ? "scale-100 border-emerald-400 bg-emerald-500 shadow-emerald-500/40"
                  : "scale-90 border-white/40 bg-black/50 opacity-70 group-hover/sel:scale-100 group-hover/sel:border-white/70 group-hover/sel:opacity-100"
                }`}
            >
              {selected && (
                <svg viewBox="0 0 12 10" className="h-3.5 w-3.5 fill-none stroke-white stroke-2">
                  <polyline points="1,5 4.5,8.5 11,1" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </span>
          </label>
        )}

        {onDelete && (
          <button
            type="button"
            aria-label={`Delete ${clip.title}`}
            disabled={deleting}
            onClick={handleDelete}
            className="absolute bottom-2 right-2 z-10 flex h-8 w-8 items-center justify-center rounded-lg border border-red-500/40 bg-black/70 text-red-400 transition hover:border-red-500/70 hover:bg-red-950/60 hover:text-red-300 disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}

        {/* Viral score badge with tooltip */}
        {viralScore != null && (
          <div className="absolute left-2 top-2">
            <button
              type="button"
              className="flex items-center gap-1 rounded-full bg-black/70 px-2 py-0.5 text-xs font-semibold text-orange-300"
              onMouseEnter={() => setScoreTooltip(true)}
              onMouseLeave={() => setScoreTooltip(false)}
              onClick={() => setScoreTooltip((v) => !v)}
            >
              <Flame className="h-3 w-3" />
              {viralScore}/100
            </button>
            {scoreTooltip && (
              <div className="absolute left-0 top-7 z-10 w-48 rounded-lg bg-zinc-900 px-3 py-2 text-xs text-zinc-300 shadow-xl ring-1 ring-white/10">
                <p className="font-semibold text-white">Viral Score</p>
                <p className="mt-0.5">AI-predicted chance this clip goes viral. Higher = stronger hook, pacing & engagement.</p>
              </div>
            )}
          </div>
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
        <h3 className="line-clamp-2 font-semibold leading-snug" title={clip.title}>
          {clip.title}
        </h3>
        <div className="flex items-center justify-between">
          <Badge variant={clip.status === "completed" ? "success" : "outline"}>
            {clip.status}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {durationSec}s · Vertical
          </span>
        </div>

        {/* Posted platforms — icons + Live link */}
        {postedPubs.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {postedPubs.map((pub) => {
              const meta = PLATFORM_META[pub.platform];
              return (
                <a
                  key={pub.platform}
                  href={pub.platform_post_url ?? undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium transition hover:opacity-80"
                  style={{
                    backgroundColor: `${meta?.color ?? "#666"}22`,
                    color: meta?.color ?? "#aaa",
                    border: `1px solid ${meta?.color ?? "#666"}44`,
                  }}
                  title={pub.platform_post_url ? `View on ${meta?.label}` : meta?.label}
                >
                  {meta?.icon}
                  <span>{meta?.label ?? pub.platform}</span>
                  {pub.platform_post_url && <ExternalLink className="h-2.5 w-2.5 opacity-70" />}
                  <span className="ml-0.5 text-[10px] opacity-70">✓ Live</span>
                </a>
              );
            })}
          </div>
        )}

        {/* Pending platforms */}
        {pendingPubs.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {pendingPubs.map((pub) => {
              const meta = PLATFORM_META[pub.platform];
              return (
                <span
                  key={pub.platform}
                  className="flex items-center gap-1 rounded-full border border-yellow-500/30 bg-yellow-500/10 px-2 py-0.5 text-xs font-medium text-yellow-400"
                >
                  {meta?.icon}
                  <span>{meta?.label ?? pub.platform}</span>
                  <span className="ml-0.5 animate-pulse text-[10px]">Posting…</span>
                </span>
              );
            })}
          </div>
        )}

        {/* Failed platforms */}
        {failedPubs.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {failedPubs.map((pub) => {
              const meta = PLATFORM_META[pub.platform];
              return (
                <span
                  key={pub.platform}
                  className="flex items-center gap-1 rounded-full border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-400"
                  title={pub.error_message ?? "Failed"}
                >
                  <AlertCircle className="h-3 w-3" />
                  {meta?.icon}
                  <span>{meta?.label ?? pub.platform} failed — retry</span>
                </span>
              );
            })}
          </div>
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
