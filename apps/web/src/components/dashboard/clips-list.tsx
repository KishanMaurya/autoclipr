"use client";

import { useMemo, useState } from "react";
import { Download, CheckSquare, Square } from "lucide-react";
import type { Clip } from "@/lib/api";
import { apiFetch } from "@/lib/api";
import { getAccessToken } from "@/lib/auth-token";
import { downloadFile, sanitizeFilename, sleep } from "@/lib/download";
import { ClipCard } from "@/components/dashboard/clip-card";
import { Button } from "@/components/ui/button";

type ClipsListProps = {
  clips: Clip[];
};

export function ClipsList({ clips }: ClipsListProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);

  const downloadable = useMemo(
    () => clips.filter((c) => c.status === "completed" && c.download_url),
    [clips],
  );

  const allSelected =
    downloadable.length > 0 && downloadable.every((c) => selected.has(c.id));

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set());
      return;
    }
    setSelected(new Set(downloadable.map((c) => c.id)));
  }

  function toggleOne(clipId: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(clipId);
      else next.delete(clipId);
      return next;
    });
  }

  async function bulkDownload() {
    const ids = [...selected];
    if (!ids.length) return;

    setBulkLoading(true);
    try {
      const token = await getAccessToken();
      if (!token) return;

      const res = await apiFetch<{
        items: Array<{ id: string; title: string; download_url?: string | null }>;
      }>("/api/v1/clips/bulk-download", {
        method: "POST",
        token,
        body: JSON.stringify({ clip_ids: ids }),
      });

      if (!res.success || !res.data?.items?.length) return;

      for (const item of res.data.items) {
        if (!item.download_url) continue;
        await downloadFile(item.download_url, `${sanitizeFilename(item.title)}.mp4`);
        await sleep(400);
      }
    } finally {
      setBulkLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {downloadable.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-black/20 px-4 py-3">
          <Button type="button" variant="outline" size="sm" onClick={toggleAll}>
            {allSelected ? (
              <CheckSquare className="mr-2 h-4 w-4" />
            ) : (
              <Square className="mr-2 h-4 w-4" />
            )}
            {allSelected ? "Deselect all" : "Select all"}
          </Button>
          <Button
            type="button"
            variant="gradient"
            size="sm"
            disabled={selected.size === 0 || bulkLoading}
            onClick={bulkDownload}
          >
            <Download className="mr-2 h-4 w-4" />
            {bulkLoading
              ? "Downloading…"
              : `Download selected (${selected.size})`}
          </Button>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {clips.map((clip) => (
          <ClipCard
            key={clip.id}
            clip={clip}
            selectable={clip.status === "completed" && !!clip.download_url}
            selected={selected.has(clip.id)}
            onSelectChange={toggleOne}
          />
        ))}
      </div>
    </div>
  );
}
