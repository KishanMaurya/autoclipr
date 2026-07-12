"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Link2, CheckCircle2, Ban } from "lucide-react";
import { usePlatformAvailability } from "@/hooks/use-platform-availability";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { apiFetch, type PlatformConnection } from "@/lib/api";
import { getConnectedPlatforms, setConnectedPlatforms } from "@/lib/platforms-storage";
import { markOnboardingComplete } from "@/lib/onboarding";
import { cn } from "@/lib/utils";

type Platform = {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  available: boolean;
};

function YouTubeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn("h-7 w-7", className)} aria-hidden>
      <path
        fill="#FF0000"
        d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .6 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.3.6 9.3.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8z"
      />
      <path fill="#fff" d="M9.75 15.02l6.5-3.52-6.5-3.52v7.04z" />
    </svg>
  );
}

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn("h-7 w-7 fill-white", className)} aria-hidden>
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.77 1.52V6.76a4.85 4.85 0 0 1-1-.07z" />
    </svg>
  );
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn("h-7 w-7", className)} aria-hidden>
      <defs>
        <linearGradient id="ig-platform" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#feda75" />
          <stop offset="50%" stopColor="#d62976" />
          <stop offset="100%" stopColor="#4f5bd5" />
        </linearGradient>
      </defs>
      <rect width="24" height="24" rx="6" fill="url(#ig-platform)" />
      <circle cx="12" cy="12" r="4.5" fill="none" stroke="#fff" strokeWidth="1.5" />
    </svg>
  );
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn("h-7 w-7 fill-[#1877F2]", className)} aria-hidden>
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

const platforms: Platform[] = [
  {
    id: "youtube",
    name: "YouTube",
    description: "Post clips as YouTube Shorts",
    icon: <YouTubeIcon />,
    available: true,
  },
  {
    id: "tiktok",
    name: "TikTok",
    description: "Post clips to your TikTok account",
    icon: <TikTokIcon />,
    available: false,
  },
  {
    id: "instagram",
    name: "Instagram",
    description: "Post clips as Instagram Reels",
    icon: <InstagramIcon />,
    available: true,
  },
  {
    id: "facebook",
    name: "Facebook",
    description: "Post clips to your Facebook account",
    icon: <FacebookIcon />,
    available: true,
  },
];

export function PlatformConnectionSetup({ mode = "dashboard" }: { mode?: "trial" | "dashboard" }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { loading: regionLoading, banned: bannedPlatforms } = usePlatformAvailability();
  const [connected, setConnected] = useState<string[]>([]);
  const [platformRows, setPlatformRows] = useState<PlatformConnection[]>([]);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [pendingPlatform, setPendingPlatform] = useState<Platform | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.access_token) {
        const res = await apiFetch<PlatformConnection[]>("/api/v1/platforms", {
          token: session.access_token,
        });
        if (res.success && res.data) {
          setPlatformRows(res.data);
          setConnected(res.data.map((p) => p.platform));
          setConnectedPlatforms(res.data.map((p) => p.platform));
          return;
        }
      }
      setConnected(getConnectedPlatforms());
    }
    load();
  }, []);

  useEffect(() => {
    async function handleOAuthReturn() {
      const oauthStatus = searchParams.get("status");
      const platform = searchParams.get("platform");
      if (oauthStatus === "success" && platform) {
        const label = platform === "youtube" ? "YouTube Shorts" : platform === "instagram" ? "Instagram Reels" : platform;
        setStatusMessage(`${label} authorized. You can now post clips directly.`);
        const supabase = createClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session?.access_token) {
          const res = await apiFetch<PlatformConnection[]>("/api/v1/platforms", {
            token: session.access_token,
          });
          if (res.success && res.data) {
            setPlatformRows(res.data);
            setConnected(res.data.map((p) => p.platform));
          }
        }
      } else if (oauthStatus === "error") {
        setStatusMessage(
          "Authorization failed. Check your app credentials in .env, then try again.",
        );
      }
    }
    handleOAuthReturn();
  }, [searchParams]);

  function handleConnectClick(platform: Platform) {
    if (!platform.available) return;
    if (connected.includes(platform.id)) {
      disconnect(platform.id);
      return;
    }
    setPendingPlatform(platform);
  }

  async function confirmConnect() {
    if (!pendingPlatform) return;
    setConnecting(pendingPlatform.id);

    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session?.access_token) {
      const res = await apiFetch<PlatformConnection & { oauth_url?: string | null }>(
        "/api/v1/platforms",
        {
          method: "POST",
          token: session.access_token,
          body: JSON.stringify({ platform: pendingPlatform.id }),
        },
      );

      if (res.success && res.data) {
        setConnected((prev) => [...prev, pendingPlatform.id]);
        setConnectedPlatforms([...connected, pendingPlatform.id]);
        setPlatformRows((prev) => [...prev.filter((p) => p.platform !== pendingPlatform.id), res.data!]);

        if ((pendingPlatform.id === "youtube" || pendingPlatform.id === "instagram") && res.data.oauth_url) {
          window.location.href = res.data.oauth_url;
          return;
        }
      }
    } else {
      setConnected((prev) => {
        const next = [...prev, pendingPlatform.id];
        setConnectedPlatforms(next);
        return next;
      });
    }

    setConnecting(null);
    setPendingPlatform(null);
  }

  async function disconnect(id: string) {
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session?.access_token) {
      await apiFetch(`/api/v1/platforms/${id}`, {
        method: "DELETE",
        token: session.access_token,
      });
    }

    setConnected((prev) => {
      const next = prev.filter((p) => p !== id);
      setConnectedPlatforms(next);
      return next;
    });
    setPlatformRows((prev) => prev.filter((p) => p.platform !== id));
  }

  async function authorizeInstagram() {
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) return;

    const res = await apiFetch<{ url: string }>("/api/v1/platforms/instagram/oauth-url", {
      token: session.access_token,
    });
    if (res.success && res.data?.url) {
      window.location.href = res.data.url;
    }
  }

  async function authorizeYoutube() {
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) return;

    const res = await apiFetch<{ url: string }>("/api/v1/platforms/youtube/oauth-url", {
      token: session.access_token,
    });
    if (res.success && res.data?.url) {
      window.location.href = res.data.url;
    }
  }

  function goToDashboard() {
    markOnboardingComplete();
    router.push("/dashboard");
    router.refresh();
  }

  const isTrial = mode === "trial";

  return (
    <div className="relative mx-auto max-w-4xl">
      <div className="pointer-events-none absolute -top-16 left-1/2 h-56 w-[520px] -translate-x-1/2 rounded-full bg-violet-500/[0.07] blur-3xl" aria-hidden />
      <div className="relative text-center">
        {isTrial && (
          <Badge
            variant="outline"
            className="mb-4 border-violet-500/40 bg-violet-500/10 text-violet-300"
          >
            FREE TRIAL
          </Badge>
        )}
        <p className="section-label mx-auto mb-4">Platforms</p>
        <h1 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">
          Connect Your{" "}
          <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent">
            Platforms
          </span>
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
          {isTrial
            ? "Link a platform where you want clips posted. YouTube requires one-time Google authorization."
            : "Connect posting destinations (YouTube Shorts, Instagram, Facebook). This is separate from connecting a YouTube source channel for clipping."}
        </p>
      </div>

      {statusMessage && (
        <div className="mt-6 rounded-xl border border-emerald-500/30 bg-emerald-950/40 px-4 py-3 text-center text-sm text-emerald-300">
          {statusMessage}
        </div>
      )}

      <div className="mt-8 rounded-xl border border-emerald-500/30 bg-emerald-950/40 px-4 py-3 text-center text-sm text-emerald-300">
        Make sure your accounts are set up to be{" "}
        <span className="font-semibold text-emerald-200">business accounts</span> for
        greatest success connecting.
      </div>

      <div className="mt-8 grid gap-5 sm:grid-cols-2">
        {platforms.map((platform) => {
          const isConnected = connected.includes(platform.id);
          const isLoading = connecting === platform.id;

          return (
            <article
              key={platform.id}
              className={cn(
                "surface-hover group relative flex flex-col overflow-hidden p-6 transition-all duration-300 hover:-translate-y-0.5",
                isConnected ? "border-emerald-500/30" : ""
              )}
            >
              {isConnected && (
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-emerald-500/0 via-emerald-500/60 to-emerald-500/0" />
              )}
              <div className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-white/[0.04] blur-3xl opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              <div className="relative mb-5 flex items-start justify-between">
                <span className="transition-transform duration-300 group-hover:scale-110">{platform.icon}</span>
                {isConnected && (
                  <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                    <CheckCircle2 className="h-3 w-3" />
                    Connected
                  </span>
                )}
              </div>
              <h2 className="text-xl font-semibold">{platform.name}</h2>
              <p className="mt-2 flex-1 text-sm text-muted-foreground">
                {platform.description}
              </p>
              {isConnected && platform.id === "youtube" && !platformRows.find((p) => p.platform === "youtube")?.can_post && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-3 w-full"
                  onClick={authorizeYoutube}
                >
                  Authorize YouTube posting
                </Button>
              )}
              {isConnected && platform.id === "instagram" && !platformRows.find((p) => p.platform === "instagram")?.can_post && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-3 w-full"
                  onClick={authorizeInstagram}
                >
                  Authorize Instagram posting
                </Button>
              )}
              {bannedPlatforms.has(platform.id) ? (
                <div className="mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-full border border-red-500/30 bg-red-950/30 text-sm font-medium text-red-400">
                  <Ban className="h-4 w-4" />
                  Unavailable in your region
                </div>
              ) : (
                <Button
                  className={cn(
                    "mt-6 h-11 w-full rounded-full font-semibold",
                    platform.available && !isConnected && "bg-gradient-brand text-white hover:opacity-90",
                    !platform.available &&
                      "cursor-not-allowed bg-zinc-800 text-muted-foreground opacity-70 hover:opacity-70"
                  )}
                  variant={isConnected ? "outline" : platform.available ? "default" : "secondary"}
                  disabled={!platform.available || isLoading || regionLoading}
                  onClick={() => handleConnectClick(platform)}
                >
                  {isLoading ? (
                    "Connecting…"
                  ) : !platform.available ? (
                    "Coming Soon"
                  ) : isConnected ? (
                    "Disconnect"
                  ) : (
                    <>
                      <Link2 className="mr-2 h-4 w-4" />
                      Connect
                    </>
                  )}
                </Button>
              )}
            </article>
          );
        })}
      </div>

      {connected.length === 0 ? (
        <p className="mt-10 text-center text-sm text-muted-foreground">
          Connect at least one platform to continue.
        </p>
      ) : (
        <p className="mt-10 text-center text-sm text-emerald-400">
          {connected.length} platform{connected.length !== 1 ? "s" : ""} connected — use the{" "}
          <span className="font-semibold">Post</span> button on each clip when ready.
        </p>
      )}

      <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
        {!isTrial && (
          <Button variant="outline" asChild>
            <Link href="/channels">← Channel Setup</Link>
          </Button>
        )}
        {isTrial && (
          <Button variant="outline" asChild>
            <Link href="/pricing">View Plans</Link>
          </Button>
        )}
        <Button variant="gradient" onClick={goToDashboard}>
          {connected.length > 0
            ? "Continue to Dashboard"
            : isTrial
              ? "Skip → Dashboard"
              : "Go to Dashboard"}
        </Button>
      </div>

      {/* OAuth confirm modal */}
      {pendingPlatform && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-zinc-950 p-6 shadow-2xl">
            <div className="mb-4 flex justify-center">{pendingPlatform.icon}</div>
            <h3 className="text-center text-lg font-bold">
              Connect {pendingPlatform.name}
            </h3>
            <p className="mt-3 text-center text-sm text-muted-foreground">
              You&apos;ll be redirected to {pendingPlatform.name} to authorize AutoClipr
              to post clips on your behalf. Use a business/creator account for best
              results.
            </p>
            <div className="mt-6 flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setPendingPlatform(null)}
              >
                Cancel
              </Button>
              <Button
                variant="gradient"
                className="flex-1 font-semibold"
                onClick={confirmConnect}
              >
                Authorize
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
