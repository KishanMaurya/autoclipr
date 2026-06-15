"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Wand2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";

export function GenerateClipsButton({
  videoId,
  videoStatus,
}: {
  videoId: string;
  videoStatus: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canGenerate = videoStatus === "ready";

  async function generate() {
    if (!canGenerate) return;
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      setLoading(false);
      return;
    }

    const res = await apiFetch("/api/v1/clips/generate", {
      method: "POST",
      token: session.access_token,
      body: JSON.stringify({
        video_id: videoId,
        clip_count: 3,
        aspect_ratio: "9:16",
        with_subtitles: true,
      }),
    });

    setLoading(false);

    if (!res.success) {
      setError(res.error?.message ?? "Failed to generate clips");
      return;
    }

    router.refresh();
  }

  if (!canGenerate) {
    return null;
  }

  return (
    <div className="space-y-2">
      <Button size="sm" variant="gradient" onClick={generate} disabled={loading}>
        <Wand2 className="mr-1 h-3 w-3" />
        {loading ? "Generating…" : "Generate more clips"}
      </Button>
      {error && <p className="text-center text-xs text-red-400">{error}</p>}
    </div>
  );
}
