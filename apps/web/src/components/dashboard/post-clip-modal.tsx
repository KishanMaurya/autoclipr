"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Loader2, Share2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiFetch, type Clip, type PlatformConnection } from "@/lib/api";
import { getAccessToken } from "@/lib/auth-token";

type PostClipModalProps = {
  clip: Clip;
  open: boolean;
  onClose: () => void;
  onPosted?: () => void;
};

const PLATFORM_LABELS: Record<string, string> = {
  youtube: "YouTube Shorts",
  instagram: "Instagram Reels",
  facebook: "Facebook",
  tiktok: "TikTok",
};

export function PostClipModal({ clip, open, onClose, onPosted }: PostClipModalProps) {
  const [platforms, setPlatforms] = useState<PlatformConnection[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    async function load() {
      setLoading(true);
      setError(null);
      const token = await getAccessToken();
      if (!token) return;

      const res = await apiFetch<PlatformConnection[]>("/api/v1/platforms", { token });
      if (res.success && res.data) {
        setPlatforms(res.data);
        const defaults = res.data
          .filter((p) => p.platform !== "tiktok")
          .map((p) => p.platform);
        setSelected(defaults);
      }
      setLoading(false);
    }

    load();
  }, [open]);

  if (!open) return null;

  async function authorizeYoutube() {
    const token = await getAccessToken();
    if (!token) return;
    const res = await apiFetch<{ url: string }>("/api/v1/platforms/youtube/oauth-url", { token });
    if (res.success && res.data?.url) {
      window.location.href = res.data.url;
    } else {
      setError(res.error?.message ?? "YouTube OAuth is not configured on the server.");
    }
  }

  async function handlePost() {
    if (!selected.length) return;
    setPosting(true);
    setError(null);
    try {
      const token = await getAccessToken();
      if (!token) return;

      const res = await apiFetch<{ job: { id: string }; publications: unknown[] }>(
        `/api/v1/clips/${clip.id}/publish`,
        {
          method: "POST",
          token,
          body: JSON.stringify({ platforms: selected }),
        },
      );

      if (!res.success) {
        setError(res.error?.message ?? "Failed to queue publish job");
        return;
      }

      onPosted?.();
      onClose();
    } finally {
      setPosting(false);
    }
  }

  const youtubeConn = platforms.find((p) => p.platform === "youtube");
  const needsYoutubeAuth =
    selected.includes("youtube") &&
    youtubeConn &&
    !youtubeConn.can_post;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="glass w-full max-w-md rounded-2xl border border-white/10 p-6 shadow-xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Post clip</h2>
            <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{clip.title}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-muted-foreground hover:bg-white/10"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-emerald-400" />
          </div>
        ) : platforms.length === 0 ? (
          <div className="space-y-4 py-4 text-center">
            <p className="text-sm text-muted-foreground">
              No posting platforms connected yet. Connect YouTube, Instagram, or Facebook in Settings → Platforms.
            </p>
            <Button variant="gradient" size="sm" asChild>
              <Link href="/setup/platforms?from=clips">Connect platforms</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Choose where to publish this clip. YouTube requires Google authorization once.
            </p>

            <ul className="space-y-2">
              {platforms.map((platform) => {
                const checked = selected.includes(platform.platform);
                const disabled = platform.platform === "tiktok";
                return (
                  <li
                    key={platform.platform}
                    className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 px-3 py-3"
                  >
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-emerald-500"
                      checked={checked}
                      disabled={disabled}
                      onChange={(e) => {
                        setSelected((prev) =>
                          e.target.checked
                            ? [...prev, platform.platform]
                            : prev.filter((p) => p !== platform.platform),
                        );
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">
                        {PLATFORM_LABELS[platform.platform] ?? platform.platform_label}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {platform.account_name ?? "Connected"}
                      </p>
                    </div>
                    {platform.platform === "youtube" && platform.can_post && (
                      <Badge variant="success">Ready</Badge>
                    )}
                    {platform.platform === "youtube" && !platform.can_post && (
                      <Badge variant="outline">Needs auth</Badge>
                    )}
                    {platform.platform === "tiktok" && (
                      <Badge variant="outline">Soon</Badge>
                    )}
                  </li>
                );
              })}
            </ul>

            {needsYoutubeAuth && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-950/30 px-3 py-3 text-sm text-amber-200">
                Authorize YouTube before posting Shorts.
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-2 w-full"
                  onClick={authorizeYoutube}
                >
                  Authorize YouTube
                </Button>
              </div>
            )}

            {error && (
              <p className="rounded-lg border border-red-500/30 bg-red-950/30 px-3 py-2 text-sm text-red-300">
                {error}
              </p>
            )}

            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="gradient"
                className="flex-1"
                disabled={posting || !selected.length || needsYoutubeAuth}
                onClick={handlePost}
              >
                {posting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Share2 className="mr-2 h-4 w-4" />
                )}
                {posting ? "Posting…" : "Post now"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
