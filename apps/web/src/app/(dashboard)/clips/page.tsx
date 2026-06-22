import { createClient } from "@/lib/supabase/server";
import { apiFetch, type Clip, type Video } from "@/lib/api";
import { ClipsList } from "@/components/dashboard/clips-list";
import { ProcessingVideosPanel } from "@/components/dashboard/processing-videos-panel";
import { ReadyVideosGrid } from "@/components/dashboard/ready-videos-grid";
import { Card } from "@/components/ui/card";
import { Scissors } from "lucide-react";

export const metadata = { title: "Clips" };

const IN_PROGRESS_STATUSES = new Set([
  "importing",
  "uploading",
  "processing",
  "analyzing",
  "failed",
]);

export default async function ClipsPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session!.access_token;

  const [clipsRes, videosRes] = await Promise.all([
    apiFetch<Clip[]>("/api/v1/clips?limit=24", { token }),
    apiFetch<Video[]>("/api/v1/videos?limit=12", { token }),
  ]);

  const clips = clipsRes.data ?? [];
  const allVideos = videosRes.data ?? [];
  const processingVideos = allVideos.filter((v) => IN_PROGRESS_STATUSES.has(v.status));
  const readyVideos = allVideos.filter((v) => v.status === "ready");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">My Clips</h1>
        <p className="text-muted-foreground">
          AI-generated shorts from your uploaded videos
        </p>
      </div>

      {processingVideos.length > 0 && (
        <ProcessingVideosPanel videos={processingVideos} />
      )}

      {readyVideos.length > 0 && <ReadyVideosGrid videos={readyVideos} />}

      <section>
        <h2 className="mb-4 text-lg font-semibold">All clips</h2>
        {clips.length === 0 ? (
          <Card className="glass flex flex-col items-center p-8 text-center sm:p-16">
            <Scissors className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-lg font-medium">
              {processingVideos.length > 0 ? "Clips are on the way" : "No clips yet"}
            </p>
            <p className="mt-2 max-w-sm text-sm text-muted-foreground">
              {processingVideos.length > 0
                ? "Your videos are still processing. Finished clips will show up here automatically."
                : "Upload a video or import from YouTube to generate clips."}
            </p>
          </Card>
        ) : (
          <ClipsList clips={clips} />
        )}
      </section>
    </div>
  );
}
