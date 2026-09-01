"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Sparkles, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { apiFetch, type Profile } from "@/lib/api";

type FeaturedCoupon = {
  code: string;
  type: "percentage" | "free_trial" | "free_credits";
  value: number;
  description: string;
  applicablePlans: string[];
};

/** Tiers that are not paying — legacy rows still say 'free'. */
const FREE_TIERS = ["starter", "free"];

/**
 * Keyed by code, not a single flag: dismissing WELCOME20 must not also hide
 * next month's SUMMER30. A new campaign gets a fresh chance to be seen.
 */
const dismissKey = (code: string) => `autoclipr_coupon_dismissed_${code}`;

function headline(coupon: FeaturedCoupon): string {
  if (coupon.type === "percentage") return `Get ${coupon.value}% OFF`;
  if (coupon.type === "free_trial") return `${coupon.value} days free`;
  return `${coupon.value} bonus credits`;
}

/**
 * Promo bar above the navigation, shown only to signed-in users on a free
 * plan. Paid users and signed-out visitors never see it.
 *
 * The coupon comes from the coupons system rather than being hardcoded, so
 * pausing a campaign in the admin panel takes the banner down with it — and a
 * code that is exhausted or out of its window is never advertised.
 */
export function CouponBanner() {
  const [coupon, setCoupon] = useState<FeaturedCoupon | null>(null);
  const [dismissed, setDismissed] = useState(false);
  // Drives the entrance/exit transition. Kept separate from `coupon` so the
  // bar can animate out before it stops being rendered.
  const [shown, setShown] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      // Signed out: nothing to offer, and no way to know their plan.
      if (!session?.access_token) return;

      try {
        // apiFetch returns the { success, data } envelope, not the payload.
        const [profileRes, featuredRes] = await Promise.all([
          apiFetch<Profile>("/api/v1/users/me", { token: session.access_token }),
          apiFetch<FeaturedCoupon | null>("/api/v1/coupons/featured", {
            token: session.access_token,
          }),
        ]);

        if (cancelled) return;

        const featured = featuredRes.data;
        if (!featured) return;

        // Paying already — never advertise a discount to someone who converted.
        if (!FREE_TIERS.includes(profileRes.data?.subscription_tier ?? "starter")) return;

        // localStorage throws in some privacy modes; a banner is not worth
        // breaking the page over.
        try {
          if (window.localStorage.getItem(dismissKey(featured.code)) === "1") return;
        } catch {
          /* treat as not dismissed */
        }

        setCoupon(featured);
        // A tick later, so the element mounts closed and transitions open.
        // Deliberately setTimeout rather than requestAnimationFrame: rAF is
        // suspended while a tab is hidden, so a page opened in a background
        // tab would mount the bar collapsed and never open it, even once the
        // user switched to it. setTimeout is throttled there, but it fires.
        window.setTimeout(() => !cancelled && setShown(true), 20);
      } catch {
        // A failed lookup just means no banner.
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  function dismiss() {
    if (!coupon) return;
    setShown(false);
    try {
      window.localStorage.setItem(dismissKey(coupon.code), "1");
    } catch {
      /* dismissal is then per-session only */
    }
    // Matches the collapse duration below.
    window.setTimeout(() => setDismissed(true), 300);
  }

  if (!coupon || dismissed) return null;

  return (
    <div
      className={`relative z-[110] overflow-hidden transition-all duration-300 ease-out ${
        shown ? "max-h-24 opacity-100" : "max-h-0 opacity-0"
      }`}
    >
      <div className="relative bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500">
        {/* Soft highlight so the bar reads as a designed surface rather than a
            flat notification strip. */}
        <div
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            background:
              "radial-gradient(ellipse at 20% 0%, rgba(255,255,255,0.28) 0%, transparent 55%)",
          }}
        />

        <div className="relative mx-auto flex max-w-7xl items-center gap-3 px-4 py-2.5 sm:px-6">
          <Sparkles className="hidden h-4 w-4 shrink-0 text-white/90 sm:block" />

          <p className="min-w-0 flex-1 text-[13px] leading-tight text-white sm:text-sm">
            <span className="font-semibold">{headline(coupon)}</span>
            <span className="hidden sm:inline"> — use code </span>
            <span className="sm:hidden"> · </span>
            <span className="mx-0.5 rounded-md bg-black/25 px-1.5 py-0.5 font-mono text-xs font-semibold tracking-wider text-white ring-1 ring-inset ring-white/25">
              {coupon.code}
            </span>
            <span className="hidden text-white/85 md:inline"> and unlock more with AutoClipr.</span>
          </p>

          <Link
            href={`/pricing?coupon=${encodeURIComponent(coupon.code)}`}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-xs font-semibold text-emerald-700 shadow-sm transition-transform hover:scale-[1.03] active:scale-100 sm:text-[13px]"
          >
            Claim offer
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>

          <button
            type="button"
            onClick={dismiss}
            aria-label="Dismiss offer"
            className="shrink-0 rounded-full p-1.5 text-white/80 transition-colors hover:bg-black/15 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
