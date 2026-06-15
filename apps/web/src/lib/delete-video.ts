import { apiFetch } from "@/lib/api";
import { getAccessToken } from "@/lib/auth-token";

export async function deleteVideoRequest(videoId: string): Promise<string | null> {
  const token = await getAccessToken();
  if (!token) return "Session expired. Please sign in again.";

  const res = await apiFetch<{ deleted: boolean; id: string }>(
    "/api/v1/videos/delete",
    {
      method: "POST",
      token,
      body: JSON.stringify({ video_id: videoId }),
    },
  );

  if (!res.success) {
    return res.error?.message ?? "Failed to delete video.";
  }

  return null;
}
