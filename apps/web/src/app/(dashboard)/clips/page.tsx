import { createClient } from "@/lib/supabase/server";
import { apiFetch, type Clip, type Video } from "@/lib/api";
import { ClipsList } from "@/components/dashboard/clips-list";
import { VideoCard } from "@/components/dashboard/video-card";
import { GenerateClipsButton } from "@/components/dashboard/generate-clips-button";
import { Card } from "@/components/ui/card";
import { Scissors } from "lucide-react";

export const metadata = { title: "Clips" };

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
  const videos = (videosRes.data ?? []).filter((v) =>
    ["ready", "importing", "processing", "analyzing", "uploading"].includes(v.status)
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">My Clips</h1>
        <p className="text-muted-foreground">
          AI-generated shorts from your uploaded videos
        </p>
      </div>

      {videos.length > 0 && (
        <section>
          <h2 className="mb-4 text-lg font-semibold">Generate from video</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {videos.map((v) => (
              <Card key={v.id} className="glass p-4">
                <VideoCard video={v} />
                <div className="mt-4 flex justify-center">
                  <GenerateClipsButton videoId={v.id} videoStatus={v.status} />
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-4 text-lg font-semibold">All clips</h2>
        {clips.length === 0 ? (
          <Card className="glass flex flex-col items-center p-16 text-center">
            <Scissors className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-lg font-medium">No clips yet</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Upload a video and generate clips to see them here.
            </p>
          </Card>
        ) : (
          <ClipsList clips={clips} />
        )}
      </section>
    </div>
  );
}
