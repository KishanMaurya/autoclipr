"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Loader2, Tag, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const API = `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080"}/api/v1`;

export type AppliedCoupon = { code: string; description: string };

/**
 * "Have a coupon?" input for the pricing page.
 *
 * Dodo's hosted checkout has no discount field, so the code has to be attached
 * when the checkout session is created. That means it must be collected here,
 * before the user leaves for the payment page.
 *
 * Validation is server-side (POST /coupons/validate); this only displays the
 * verdict. The code is re-validated again when the checkout is built, so a
 * stale "applied" badge cannot buy a discount that has since run out.
 */
export function CouponField({
  planId,
  billingPeriod,
  applied,
  onApply,
  onClear,
}: {
  planId: string;
  billingPeriod: "monthly" | "yearly";
  applied: AppliedCoupon | null;
  onApply: (coupon: AppliedCoupon) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const autoApplied = useRef(false);

  // A code arriving from the promo banner (/pricing?coupon=CODE) is applied
  // without the user having to retype what they just clicked.
  useEffect(() => {
    if (autoApplied.current || applied) return;
    const fromUrl = new URLSearchParams(window.location.search).get("coupon");
    if (!fromUrl) return;

    autoApplied.current = true;
    setOpen(true);
    setCode(fromUrl.toUpperCase());
    void validate(fromUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function validate(raw: string) {
    const trimmed = raw.trim().toUpperCase();
    if (!trimmed) return;

    setChecking(true);
    setError(null);
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setError("Sign in to use a coupon.");
        return;
      }

      const res = await fetch(`${API}/coupons/validate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ code: trimmed, planId, billingPeriod }),
      });
      const body = await res.json().catch(() => null);

      if (!res.ok) {
        // The API's messages are already written for the user.
        setError(
          Array.isArray(body?.message)
            ? body.message.join(", ")
            : body?.message ?? "That coupon code is not valid.",
        );
        return;
      }

      onApply({ code: body.data.code, description: body.data.description });
      setError(null);
    } catch {
      setError("Could not check that code. Try again.");
    } finally {
      setChecking(false);
    }
  }

  if (applied) {
    return (
      <div className="mx-auto mb-6 flex max-w-md items-center justify-between gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
        <span className="flex min-w-0 items-center gap-2 text-sm text-emerald-300">
          <Check className="h-4 w-4 shrink-0" />
          <span className="truncate">
            <span className="font-mono font-semibold">{applied.code}</span> applied —{" "}
            {applied.description}
          </span>
        </span>
        <button
          type="button"
          onClick={() => {
            onClear();
            setCode("");
            setOpen(true);
          }}
          aria-label="Remove coupon"
          className="shrink-0 rounded-full p-1 text-emerald-300/70 transition-colors hover:bg-emerald-500/15 hover:text-emerald-200"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  if (!open) {
    return (
      <div className="mb-6 text-center">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 text-sm text-white/40 transition-colors hover:text-white/70"
        >
          <Tag className="h-3.5 w-3.5" />
          Have a coupon code?
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto mb-6 max-w-md">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void validate(code);
        }}
        className="flex gap-2"
      >
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="Enter coupon code"
          maxLength={16}
          autoComplete="off"
          className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 font-mono text-sm uppercase tracking-wider text-white placeholder:font-sans placeholder:tracking-normal placeholder:text-white/25 focus:border-emerald-500/50 focus:outline-none"
        />
        <button
          type="submit"
          disabled={checking || !code.trim()}
          className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/15 disabled:opacity-40"
        >
          {checking && <Loader2 className="h-4 w-4 animate-spin" />}
          Apply
        </button>
      </form>
      {error && <p className="mt-2 text-center text-xs text-red-400">{error}</p>}
    </div>
  );
}
