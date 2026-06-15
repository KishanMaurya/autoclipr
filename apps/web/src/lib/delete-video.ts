import { apiFetch } from "@/lib/api";
import { getAccessToken } from "@/lib/auth-token";

export async function deleteVideo(videoId: string, title?: string): Promise<string | null> {
  const confirmed = window.confirm(
    `Delete "${title ?? "this video"}" and all its clips? This cannot be undone.`,
  );
  if (!confirmed) return null;

  const token = await getAccessToken();
  if (!token) return "Session expired. Please sign in again.";

  const res = await apiFetch<{ deleted: boolean; id: string }>(
    `/api/v1/videos/${videoId}`,
    { method: "DELETE", token },
  );

  if (!res.success) {
    return res.error?.message ?? "Failed to delete video.";
  }

  return null;
}
