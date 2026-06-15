"use client";

import { apiFetch } from "@/lib/api";
import { getAccessToken } from "@/lib/auth-token";
import { toast } from "sonner";

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

/** Delete with loading + success/error toasts. Returns true when deleted. */
export async function deleteVideoWithToast(videoId: string): Promise<boolean> {
  const toastId = toast.loading("Deleting video…");

  const error = await deleteVideoRequest(videoId);
  if (error) {
    toast.error(error, { id: toastId });
    return false;
  }

  toast.success("Successfully deleted", { id: toastId });
  return true;
}
