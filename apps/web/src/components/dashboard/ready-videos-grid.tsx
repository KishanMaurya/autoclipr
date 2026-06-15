"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import type { Video } from "@/lib/api";
import { deleteVideoRequest } from "@/lib/delete-video";
import { VideoCard } from "@/components/dashboard/video-card";
import { GenerateClipsButton } from "@/components/dashboard/generate-clips-button";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/hooks/use-confirm";

type ReadyVideosGridProps = {
  videos: Video[];
};

export function ReadyVideosGrid({ videos: initialVideos }: ReadyVideosGridProps) {
  const router = useRouter();
  const { confirm, dialog } = useConfirm();
  const [videos, setVideos] = useState(initialVideos);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete(video: Video) {
    const ok = await confirm({
      title: "Delete video?",
      description: `Delete "${video.title}" and all its clips? This cannot be undone.`,
      confirmLabel: "Delete",
    });
    if (!ok) return;

    setError(null);
    setDeletingId(video.id);
    try {
      const message = await deleteVideoRequest(video.id);
      if (message) {
        setError(message);
        return;
      }
      setVideos((prev) => prev.filter((v) => v.id !== video.id));
      router.refresh();
    } finally {
      setDeletingId(null);
    }
  }

  if (!videos.length) return null;

  return (
    <>
      {dialog}
      <section>
      <h2 className="mb-4 text-lg font-semibold">Generate more clips</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        These videos are ready — generate additional shorts anytime.
      </p>

      {error && (
        <p className="mb-4 rounded-lg border border-red-500/30 bg-red-950/40 px-3 py-2 text-sm text-red-400">
          {error}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {videos.map((video) => (
          <div key={video.id} className="space-y-4">
            <div className="relative">
              <VideoCard video={video} />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="absolute right-3 top-3 h-8 w-8 border-red-500/40 bg-black/70 text-red-400 hover:border-red-500/60 hover:bg-red-950/60 hover:text-red-300"
                disabled={deletingId === video.id}
                onClick={() => void handleDelete(video)}
                aria-label={`Delete ${video.title}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex justify-center px-1">
              <GenerateClipsButton videoId={video.id} videoStatus={video.status} />
            </div>
          </div>
        ))}
      </div>
    </section>
    </>
  );
}
