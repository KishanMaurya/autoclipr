import { createClient } from "@/lib/supabase/server";
import { apiFetch, type Clip, type Video, type YoutubeChannel } from "@/lib/api";
import { DashboardView } from "@/components/dashboard/dashboard-view";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session!.access_token;

  const [channelsRes, clipsRes, videosRes] = await Promise.all([
    apiFetch<YoutubeChannel[]>("/api/v1/channels", { token }),
    apiFetch<Clip[]>("/api/v1/clips?limit=24", { token }),
    apiFetch<Video[]>("/api/v1/videos?limit=24", { token }),
  ]);

  return (
    <DashboardView
      initialChannels={channelsRes.data ?? []}
      initialClips={clipsRes.data ?? []}
      initialVideos={videosRes.data ?? []}
      initialPlatformCount={0}
    />
  );
}
