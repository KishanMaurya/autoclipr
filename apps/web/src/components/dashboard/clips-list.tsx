"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Trash2, CheckSquare, Square } from "lucide-react";
import type { Clip } from "@/lib/api";
import { apiFetch } from "@/lib/api";
import { getAccessToken } from "@/lib/auth-token";
import { downloadFile, sanitizeFilename, sleep } from "@/lib/download";
import { ClipCard } from "@/components/dashboard/clip-card";
import { Button } from "@/components/ui/button";

type ClipsListProps = {
  clips: Clip[];
};

export function ClipsList({ clips: initialClips }: ClipsListProps) {
  const router = useRouter();
  const [clips, setClips] = useState(initialClips);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const downloadable = useMemo(
    () => clips.filter((c) => c.status === "completed" && c.download_url),
    [clips],
  );

  const allSelected = clips.length > 0 && clips.every((c) => selected.has(c.id));

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set());
      return;
    }
    setSelected(new Set(clips.map((c) => c.id)));
  }

  function toggleOne(clipId: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(clipId);
      else next.delete(clipId);
      return next;
    });
  }

  function removeFromList(ids: string[]) {
    const idSet = new Set(ids);
    setClips((prev) => prev.filter((c) => !idSet.has(c.id)));
    setSelected((prev) => {
      const next = new Set(prev);
      for (const id of ids) next.delete(id);
      return next;
    });
  }

  async function bulkDownload() {
    const ids = [...selected].filter((id) =>
      downloadable.some((c) => c.id === id),
    );
    if (!ids.length) return;

    setBulkLoading(true);
    setError(null);
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

      if (!res.success || !res.data?.items?.length) {
        setError(res.error?.message ?? "Download failed.");
        return;
      }

      for (const item of res.data.items) {
        if (!item.download_url) continue;
        await downloadFile(item.download_url, `${sanitizeFilename(item.title)}.mp4`);
        await sleep(400);
      }
    } finally {
      setBulkLoading(false);
    }
  }

  async function bulkDelete() {
    const ids = [...selected];
    if (!ids.length) return;

    const confirmed = window.confirm(
      `Delete ${ids.length} clip${ids.length === 1 ? "" : "s"}? This cannot be undone.`,
    );
    if (!confirmed) return;

    setDeleteLoading(true);
    setError(null);
    try {
      const token = await getAccessToken();
      if (!token) return;

      const res = await apiFetch<{ deleted_ids: string[] }>("/api/v1/clips/bulk-delete", {
        method: "POST",
        token,
        body: JSON.stringify({ clip_ids: ids }),
      });

      if (!res.success || !res.data?.deleted_ids?.length) {
        setError(res.error?.message ?? "Failed to delete clips.");
        return;
      }

      removeFromList(res.data.deleted_ids);
      router.refresh();
    } finally {
      setDeleteLoading(false);
    }
  }

  async function deleteOne(clipId: string) {
    const clip = clips.find((c) => c.id === clipId);
    const confirmed = window.confirm(
      `Delete "${clip?.title ?? "this clip"}"? This cannot be undone.`,
    );
    if (!confirmed) return;

    setError(null);
    const token = await getAccessToken();
    if (!token) return;

    const res = await apiFetch<{ deleted: boolean; id: string }>(
      `/api/v1/clips/${clipId}`,
      { method: "DELETE", token },
    );

    if (!res.success) {
      setError(res.error?.message ?? "Failed to delete clip.");
      return;
    }

    removeFromList([clipId]);
    router.refresh();
  }

  const selectedDownloadable = [...selected].filter((id) =>
    downloadable.some((c) => c.id === id),
  ).length;

  return (
    <div className="space-y-4">
      {clips.length > 0 && (
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
            disabled={selectedDownloadable === 0 || bulkLoading || deleteLoading}
            onClick={bulkDownload}
          >
            <Download className="mr-2 h-4 w-4" />
            {bulkLoading
              ? "Downloading…"
              : `Download selected (${selectedDownloadable})`}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={selected.size === 0 || bulkLoading || deleteLoading}
            onClick={bulkDelete}
            className="border-red-500/40 text-red-400 hover:border-red-500/60 hover:bg-red-950/40 hover:text-red-300"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {deleteLoading ? "Deleting…" : `Delete selected (${selected.size})`}
          </Button>
        </div>
      )}

      {error && (
        <p className="rounded-lg border border-red-500/30 bg-red-950/40 px-3 py-2 text-sm text-red-400">
          {error}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {clips.map((clip) => (
          <ClipCard
            key={clip.id}
            clip={clip}
            selectable
            selected={selected.has(clip.id)}
            onSelectChange={toggleOne}
            onDelete={deleteOne}
          />
        ))}
      </div>
    </div>
  );
}
