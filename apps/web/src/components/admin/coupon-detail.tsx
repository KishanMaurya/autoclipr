"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pause, Play, Pencil, Trash2, Users, IndianRupee, Ticket } from "lucide-react";
import type { Coupon } from "@/components/admin/coupon-manager";

const API = `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080"}/api/v1`;

type Redemption = {
  id: string;
  user_id: string | null;
  plan_id: string | null;
  discount_paise: number;
  redeemed_at: string;
};

export type CouponDetailData = {
  coupon: Coupon;
  redemptionCount: number;
  discountPaise: number;
  redemptions: Redemption[];
};

const STATUS_STYLE: Record<Coupon["status"], string> = {
  active: "bg-emerald-500/15 text-emerald-400",
  paused: "bg-amber-500/15 text-amber-400",
  draft: "bg-white/10 text-white/50",
  expired: "bg-white/10 text-white/40",
  exhausted: "bg-red-500/15 text-red-400",
};

function rupees(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

function describe(c: Coupon): string {
  if (c.type === "percentage") return `${c.value}% off`;
  if (c.type === "free_trial") return `${c.value} day${c.value === 1 ? "" : "s"} free`;
  return `+${c.value} credits`;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function CouponDetail({ data, token }: { data: CouponDetailData; token: string }) {
  const router = useRouter();
  const { coupon, redemptionCount, discountPaise, redemptions } = data;

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  const pct =
    coupon.max_uses && coupon.max_uses > 0
      ? Math.min(100, (coupon.used_count / coupon.max_uses) * 100)
      : null;

  async function call(path: string, init: RequestInit) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`${API}${path}`, {
        ...init,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          ...(init.headers ?? {}),
        },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(
          Array.isArray(body?.message)
            ? body.message.join(", ")
            : body?.message ?? "Request failed.",
        );
      }
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function toggleStatus() {
    const next = coupon.status === "active" ? "paused" : "active";
    if (await call(`/coupons/${coupon.id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status: next }),
    })) {
      router.refresh();
    }
  }

  async function remove() {
    const warning =
      coupon.used_count > 0
        ? `${coupon.code} has been redeemed ${coupon.used_count} times. Deleting is blocked to protect that history — expire it instead.`
        : `Delete ${coupon.code}? This cannot be undone.`;
    if (!window.confirm(warning)) return;

    if (await call(`/coupons/${coupon.id}`, { method: "DELETE" })) {
      router.push("/admin/coupons");
      router.refresh();
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Header */}
      <div className="rounded-xl border border-white/[0.07] bg-[#24303F] p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-mono text-2xl font-semibold text-white">{coupon.code}</h1>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLE[coupon.status]}`}
              >
                {coupon.status}
              </span>
            </div>
            <p className="mt-1 text-sm text-white/50">
              {describe(coupon)}
              {coupon.applicable_plans.length > 0
                ? ` · ${coupon.applicable_plans.join(", ")}`
                : " · all plans"}
              {` · ${coupon.max_uses_per_user} per user`}
            </p>
            {coupon.description && (
              <p className="mt-2 text-sm text-white/40">{coupon.description}</p>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {/* Exhausted and expired are terminal — no toggle to offer. */}
            {["active", "paused", "draft"].includes(coupon.status) && (
              <button
                type="button"
                onClick={toggleStatus}
                disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-sm text-white/70 transition-colors hover:bg-white/[0.06] disabled:opacity-40"
              >
                {busy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : coupon.status === "active" ? (
                  <>
                    <Pause className="h-4 w-4" /> Pause
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" /> Activate
                  </>
                )}
              </button>
            )}

            <button
              type="button"
              onClick={() => setEditing((e) => !e)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-sm text-white/70 transition-colors hover:bg-white/[0.06]"
            >
              <Pencil className="h-4 w-4" />
              {editing ? "Cancel" : "Edit"}
            </button>

            <button
              type="button"
              onClick={remove}
              disabled={busy || coupon.used_count > 0}
              title={
                coupon.used_count > 0
                  ? "Redeemed coupons cannot be deleted — expire it instead"
                  : undefined
              }
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/30 px-3 py-2 text-sm text-red-400 transition-colors hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-30"
            >
              <Trash2 className="h-4 w-4" /> Delete
            </button>
          </div>
        </div>

        {/* Usage */}
        <div className="mt-6">
          <div className="flex items-baseline justify-between text-sm">
            <span className="text-white/40">Redemptions</span>
            <span className="text-white/70">
              {coupon.used_count}
              {coupon.max_uses ? ` / ${coupon.max_uses}` : " / unlimited"}
            </span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className={`h-full rounded-full transition-all ${
                pct !== null && pct >= 100 ? "bg-red-500" : "bg-[#3C50E0]"
              }`}
              // With no cap there is nothing to fill toward, so show a thin
              // bar rather than a full one that would imply exhaustion.
              style={{ width: pct !== null ? `${pct}%` : "4%" }}
            />
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 border-t border-white/[0.07] pt-5 sm:grid-cols-4">
          <Stat label="Starts" value={formatDate(coupon.starts_at)} />
          <Stat label="Expires" value={formatDate(coupon.expires_at)} />
          <Stat label="Created" value={formatDate(coupon.created_at)} />
          <Stat label="Per user" value={String(coupon.max_uses_per_user)} />
        </div>
      </div>

      {editing && (
        <EditCouponForm
          coupon={coupon}
          token={token}
          onSaved={() => {
            setEditing(false);
            router.refresh();
          }}
        />
      )}

      {/* Campaign value */}
      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard icon={Ticket} label="Redemptions" value={redemptionCount.toLocaleString()} tint="#3C50E0" />
        <MetricCard icon={IndianRupee} label="Discount given" value={rupees(discountPaise)} tint="#F59E0B" />
        <MetricCard
          icon={Users}
          label="Unique users"
          value={String(new Set(redemptions.map((r) => r.user_id).filter(Boolean)).size)}
          tint="#8B5CF6"
        />
      </div>

      {/* Redemption history */}
      <div className="overflow-hidden rounded-xl border border-white/[0.07] bg-[#24303F]">
        <div className="border-b border-white/[0.07] px-5 py-4">
          <h2 className="text-sm font-semibold text-white">Redemption history</h2>
          <p className="mt-0.5 text-xs text-white/30">
            {redemptions.length === 0
              ? "Nobody has used this coupon yet."
              : `Showing the ${redemptions.length} most recent.`}
          </p>
        </div>

        {redemptions.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-white/[0.07] text-left text-xs uppercase tracking-wider text-white/30">
                  <th className="px-5 py-3 font-medium">When</th>
                  <th className="px-5 py-3 font-medium">User</th>
                  <th className="px-5 py-3 font-medium">Plan</th>
                  <th className="px-5 py-3 font-medium text-right">Discount</th>
                </tr>
              </thead>
              <tbody>
                {redemptions.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02]"
                  >
                    <td className="px-5 py-3 text-white/60">{formatDateTime(r.redeemed_at)}</td>
                    <td className="px-5 py-3 font-mono text-xs text-white/40">
                      {/* Null once the account is deleted — the redemption
                          survives so campaign totals stay correct. */}
                      {r.user_id ? r.user_id.slice(0, 8) : "deleted user"}
                    </td>
                    <td className="px-5 py-3 text-white/60">{r.plan_id ?? "—"}</td>
                    <td className="px-5 py-3 text-right text-white/70">
                      {r.discount_paise > 0 ? rupees(r.discount_paise) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-white/30">{label}</div>
      <div className="mt-1 text-sm text-white/70">{value}</div>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  tint,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  tint: string;
}) {
  return (
    <div className="rounded-xl border border-white/[0.07] bg-[#24303F] p-5">
      <div className="rounded-xl p-2.5" style={{ background: tint + "22", width: "fit-content" }}>
        <Icon className="h-4 w-4" style={{ color: tint }} />
      </div>
      <div className="mt-3 text-2xl font-semibold text-white">{value}</div>
      <div className="mt-0.5 text-xs text-white/40">{label}</div>
    </div>
  );
}

function EditCouponForm({
  coupon,
  token,
  onSaved,
}: {
  coupon: Coupon;
  token: string;
  onSaved: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const form = new FormData(e.currentTarget);
    const maxUses = String(form.get("max_uses") ?? "").trim();
    const expiresAt = String(form.get("expires_at") ?? "").trim();
    const plans = String(form.get("applicable_plans") ?? "")
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);

    try {
      const res = await fetch(`${API}/coupons/${coupon.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          value: Number(form.get("value")),
          max_uses_per_user: Number(form.get("max_uses_per_user")),
          applicable_plans: plans,
          description: String(form.get("description") ?? ""),
          ...(maxUses ? { max_uses: Number(maxUses) } : {}),
          ...(expiresAt ? { expires_at: new Date(expiresAt).toISOString() } : {}),
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(
          Array.isArray(body?.message)
            ? body.message.join(", ")
            : body?.message ?? "Could not save the coupon.",
        );
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the coupon.");
    } finally {
      setSaving(false);
    }
  }

  // datetime-local wants a local wall-clock string, not an instant.
  const expiresLocal = coupon.expires_at
    ? new Date(new Date(coupon.expires_at).getTime() - new Date().getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16)
    : "";

  const valueLabel =
    coupon.type === "percentage"
      ? "Percent off"
      : coupon.type === "free_trial"
        ? "Trial days"
        : "Bonus credits";

  return (
    <form onSubmit={submit} className="space-y-4 rounded-xl border border-white/[0.07] bg-[#24303F] p-5">
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <p className="text-xs text-white/40">
        The code and type cannot be changed — the code is already in circulation and identifies
        this discount with the payment provider.
      </p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label={valueLabel}>
          <input
            name="value"
            type="number"
            required
            min={1}
            max={coupon.type === "percentage" ? 100 : undefined}
            defaultValue={coupon.value}
            className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white focus:border-[#3C50E0] focus:outline-none"
          />
        </Field>

        <Field label="Max uses" hint={`Cannot go below ${coupon.used_count} already redeemed`}>
          <input
            name="max_uses"
            type="number"
            min={coupon.used_count || 1}
            defaultValue={coupon.max_uses ?? ""}
            placeholder="Unlimited"
            className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white placeholder:text-white/25 focus:border-[#3C50E0] focus:outline-none"
          />
        </Field>

        <Field label="Uses per user">
          <input
            name="max_uses_per_user"
            type="number"
            min={1}
            defaultValue={coupon.max_uses_per_user}
            className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white focus:border-[#3C50E0] focus:outline-none"
          />
        </Field>

        <Field label="Expires" hint="Blank for no expiry">
          <input
            name="expires_at"
            type="datetime-local"
            defaultValue={expiresLocal}
            className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white focus:border-[#3C50E0] focus:outline-none"
          />
        </Field>

        <Field label="Plans" hint="Comma separated. Blank = all plans">
          <input
            name="applicable_plans"
            defaultValue={coupon.applicable_plans.join(", ")}
            placeholder="creator, business"
            className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white placeholder:text-white/25 focus:border-[#3C50E0] focus:outline-none"
          />
        </Field>

        <Field label="Description">
          <input
            name="description"
            defaultValue={coupon.description ?? ""}
            placeholder="Autumn creator campaign"
            className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white placeholder:text-white/25 focus:border-[#3C50E0] focus:outline-none"
          />
        </Field>
      </div>

      {coupon.type === "percentage" && (
        <p className="text-xs text-white/40">
          Changing the value, expiry or usage cap updates the payment provider first. If it
          refuses, nothing changes here either.
        </p>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg bg-[#3C50E0] px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-[#3242c4] disabled:opacity-50"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-white/60">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-white/25">{hint}</span>}
    </label>
  );
}
