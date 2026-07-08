"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Check, Loader2, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { apiFetch, type Clip, type PlatformConnection } from "@/lib/api";
import { getAccessToken } from "@/lib/auth-token";

type PostClipModalProps = {
  clip: Clip;
  open: boolean;
  onClose: () => void;
  onPosted?: () => void;
};

const PLATFORM_META: Record<string, { label: string; sublabel: string; icon: React.ReactNode; color: string }> = {
  youtube: {
    label: "YouTube Shorts",
    sublabel: "Publish as a Short",
    color: "bg-red-600",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4 fill-white">
        <path d="M23.5 6.19a3.02 3.02 0 0 0-2.12-2.14C19.54 3.5 12 3.5 12 3.5s-7.54 0-9.38.55A3.02 3.02 0 0 0 .5 6.19C0 8.04 0 12 0 12s0 3.96.5 5.81a3.02 3.02 0 0 0 2.12 2.14C4.46 20.5 12 20.5 12 20.5s7.54 0 9.38-.55a3.02 3.02 0 0 0 2.12-2.14C24 15.96 24 12 24 12s0-3.96-.5-5.81zM9.75 15.02V8.98L15.5 12l-5.75 3.02z" />
      </svg>
    ),
  },
  instagram: {
    label: "Instagram Reels",
    sublabel: "Post as a Reel",
    color: "bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4 fill-white">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
      </svg>
    ),
  },
  tiktok: {
    label: "TikTok",
    sublabel: "Coming soon",
    color: "bg-zinc-900 border border-white/20",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4 fill-white">
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.19 8.19 0 0 0 4.78 1.52V6.76a4.85 4.85 0 0 1-1.01-.07z" />
      </svg>
    ),
  },
  facebook: {
    label: "Facebook",
    sublabel: "Share to your page",
    color: "bg-blue-600",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4 fill-white">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
  },
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

  function toggle(platform: string, disabled: boolean) {
    if (disabled) return;
    setSelected((prev) =>
      prev.includes(platform) ? prev.filter((p) => p !== platform) : [...prev, platform],
    );
  }

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
  const needsYoutubeAuth = selected.includes("youtube") && youtubeConn && !youtubeConn.can_post;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="glass w-full max-w-sm rounded-2xl border border-white/10 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/8 px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-base font-semibold">Publish clip</h2>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{clip.title}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ml-3 flex-shrink-0 rounded-lg p-1.5 text-muted-foreground transition hover:bg-white/10 hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-emerald-400" />
            </div>
          ) : platforms.length === 0 ? (
            <div className="space-y-4 py-4 text-center">
              <p className="text-sm text-muted-foreground">
                No platforms connected yet. Connect YouTube or Instagram in Settings.
              </p>
              <Button variant="gradient" size="sm" asChild>
                <Link href="/setup/platforms?from=clips">Connect platforms</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">Select where to publish</p>

              <ul className="space-y-2">
                {platforms.map((platform) => {
                  const meta = PLATFORM_META[platform.platform];
                  const checked = selected.includes(platform.platform);
                  const disabled = platform.platform === "tiktok";
                  const needsAuth = platform.platform === "youtube" && !platform.can_post;

                  return (
                    <li key={platform.platform}>
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => toggle(platform.platform, disabled)}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition",
                          checked && !disabled
                            ? "border-emerald-500/50 bg-emerald-500/10"
                            : "border-white/8 bg-white/4 hover:border-white/15 hover:bg-white/8",
                          disabled && "cursor-not-allowed opacity-50",
                        )}
                      >
                        {/* Platform icon */}
                        <span
                          className={cn(
                            "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg",
                            meta?.color ?? "bg-zinc-700",
                          )}
                        >
                          {meta?.icon}
                        </span>

                        {/* Labels */}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium leading-none">
                            {meta?.label ?? platform.platform_label}
                          </p>
                          <p className="mt-0.5 truncate text-xs text-muted-foreground">
                            {disabled
                              ? "Coming soon"
                              : needsAuth
                                ? "Needs authorization"
                                : (platform.account_name ?? "Connected")}
                          </p>
                        </div>

                        {/* Status badge / check */}
                        {disabled ? (
                          <span className="rounded-full bg-white/8 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                            Soon
                          </span>
                        ) : needsAuth ? (
                          <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-300">
                            Auth needed
                          </span>
                        ) : checked ? (
                          <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500">
                            <Check className="h-3 w-3 text-white" strokeWidth={3} />
                          </span>
                        ) : (
                          <span className="h-5 w-5 flex-shrink-0 rounded-full border border-white/20" />
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>

              {needsYoutubeAuth && (
                <div className="rounded-xl border border-amber-500/25 bg-amber-950/25 px-3 py-3">
                  <p className="text-xs text-amber-200">
                    Authorize your YouTube account before posting Shorts.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-2 w-full border-amber-500/40 text-amber-200 hover:border-amber-500/60 hover:bg-amber-950/40"
                    onClick={authorizeYoutube}
                  >
                    Authorize YouTube
                  </Button>
                </div>
              )}

              {error && (
                <p className="rounded-lg border border-red-500/25 bg-red-950/25 px-3 py-2 text-xs text-red-300">
                  {error}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {!loading && platforms.length > 0 && (
          <div className="flex gap-2 border-t border-white/8 px-5 py-4">
            <Button type="button" variant="outline" className="flex-1" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="gradient"
              className="flex-1"
              size="sm"
              disabled={posting || !selected.length || !!needsYoutubeAuth}
              onClick={handlePost}
            >
              {posting ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="mr-1.5 h-3.5 w-3.5" />
              )}
              {posting ? "Publishing…" : `Publish${selected.length > 1 ? ` (${selected.length})` : ""}`}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
