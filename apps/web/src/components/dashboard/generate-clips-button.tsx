"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Wand2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";

export function GenerateClipsButton({ videoId }: { videoId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function generate() {
    setLoading(true);
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return;

    await apiFetch("/api/v1/clips/generate", {
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
    router.refresh();
  }

  return (
    <Button size="sm" variant="gradient" onClick={generate} disabled={loading}>
      <Wand2 className="mr-1 h-3 w-3" />
      {loading ? "Generating…" : "Generate clips"}
    </Button>
  );
}
