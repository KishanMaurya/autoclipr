"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Pause, Play, Ticket } from "lucide-react";

const API = `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080"}/api/v1`;

export type Coupon = {
  id: string;
  code: string;
  type: "percentage" | "free_trial" | "free_credits";
  value: number;
  status: "draft" | "active" | "paused" | "expired" | "exhausted";
  starts_at: string | null;
  expires_at: string | null;
  max_uses: number | null;
  used_count: number;
  max_uses_per_user: number;
  applicable_plans: string[];
  visibility: "public" | "private";
  description: string | null;
  created_at: string;
};

const STATUS_STYLE: Record<Coupon["status"], string> = {
  active: "bg-emerald-500/15 text-emerald-400",
  paused: "bg-amber-500/15 text-amber-400",
  draft: "bg-white/10 text-white/50",
  expired: "bg-white/10 text-white/40",
  exhausted: "bg-red-500/15 text-red-400",
};

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

export function CouponManager({
  initialCoupons,
  token,
}: {
  initialCoupons: Coupon[];
  token: string;
}) {
  const router = useRouter();
  // Read straight from props. Copying these into useState would freeze the
  // first render's value: router.refresh() re-runs the server component and
  // passes fresh coupons down, but useState ignores its argument after mount,
  // so a paused coupon carried on rendering as active.
  const coupons = initialCoupons;
  const [showForm, setShowForm] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function setStatus(id: string, status: "active" | "paused") {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`${API}/coupons/${id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message ?? "Could not update the coupon.");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update the coupon.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setShowForm((s) => !s)}
          className="inline-flex items-center gap-2 rounded-lg bg-[#3C50E0] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#3242c4]"
        >
          <Plus className="h-4 w-4" />
          {showForm ? "Cancel" : "Create coupon"}
        </button>
      </div>

      {showForm && (
        <CreateCouponForm
          token={token}
          onCreated={() => {
            setShowForm(false);
            router.refresh();
          }}
        />
      )}

      <div className="overflow-hidden rounded-xl border border-white/[0.07] bg-[#24303F]">
        {coupons.length === 0 ? (
          <div className="p-10 text-center">
            <Ticket className="mx-auto h-8 w-8 text-white/20" />
            <p className="mt-3 text-sm text-white/50">No coupons yet.</p>
            <p className="mt-1 text-xs text-white/30">
              Create one to run a campaign or give a partner a code.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-white/[0.07] text-left text-xs uppercase tracking-wider text-white/30">
                  <th className="px-5 py-3 font-medium">Code</th>
                  <th className="px-5 py-3 font-medium">Discount</th>
                  <th className="px-5 py-3 font-medium">Uses</th>
                  <th className="px-5 py-3 font-medium">Expires</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {coupons.map((c) => {
                  const pct =
                    c.max_uses && c.max_uses > 0
                      ? Math.min(100, (c.used_count / c.max_uses) * 100)
                      : null;

                  return (
                    <tr
                      key={c.id}
                      className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02]"
                    >
                      <td className="px-5 py-4">
                        <Link
                          href={`/admin/coupons/${c.id}`}
                          className="font-mono font-medium text-white underline-offset-4 hover:text-[#8ba0ff] hover:underline"
                        >
                          {c.code}
                        </Link>
                        {c.applicable_plans.length > 0 && (
                          <span className="ml-2 text-xs text-white/30">
                            {c.applicable_plans.join(", ")}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-white/70">{describe(c)}</td>
                      <td className="px-5 py-4">
                        <div className="text-white/70">
                          {c.used_count}
                          {c.max_uses ? ` / ${c.max_uses}` : " / ∞"}
                        </div>
                        {pct !== null && (
                          <div className="mt-1.5 h-1 w-24 overflow-hidden rounded-full bg-white/10">
                            <div
                              className="h-full rounded-full bg-[#3C50E0]"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-4 text-white/50">{formatDate(c.expires_at)}</td>
                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLE[c.status]}`}
                        >
                          {c.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        {/* Exhausted and expired coupons are terminal — there is
                            nothing left to switch on or off. */}
                        {(c.status === "active" || c.status === "paused" || c.status === "draft") && (
                          <button
                            type="button"
                            disabled={busyId === c.id}
                            onClick={() =>
                              setStatus(c.id, c.status === "active" ? "paused" : "active")
                            }
                            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/70 transition-colors hover:bg-white/[0.06] disabled:opacity-40"
                          >
                            {busyId === c.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : c.status === "active" ? (
                              <>
                                <Pause className="h-3.5 w-3.5" /> Pause
                              </>
                            ) : (
                              <>
                                <Play className="h-3.5 w-3.5" /> Activate
                              </>
                            )}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function CreateCouponForm({
  token,
  onCreated,
}: {
  token: string;
  onCreated: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [type, setType] = useState<Coupon["type"]>("percentage");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const form = new FormData(e.currentTarget);
    const plans = String(form.get("applicable_plans") ?? "")
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);

    const maxUses = String(form.get("max_uses") ?? "").trim();
    const expiresAt = String(form.get("expires_at") ?? "").trim();
    const startsAt = String(form.get("starts_at") ?? "").trim();

    try {
      const res = await fetch(`${API}/coupons`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          code: String(form.get("code") ?? "").trim().toUpperCase(),
          type,
          value: Number(form.get("value")),
          status: form.get("status") || "draft",
          max_uses_per_user: Number(form.get("max_uses_per_user") || 1),
          ...(maxUses ? { max_uses: Number(maxUses) } : {}),
          // datetime-local gives a local wall-clock string; send it as an
          // instant so the server is not guessing a timezone.
          ...(expiresAt ? { expires_at: new Date(expiresAt).toISOString() } : {}),
          ...(startsAt ? { starts_at: new Date(startsAt).toISOString() } : {}),
          visibility: form.get("visibility") || "public",
          ...(plans.length ? { applicable_plans: plans } : {}),
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(
          Array.isArray(body?.message) ? body.message.join(", ") : body?.message ?? "Could not create the coupon.",
        );
      }
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the coupon.");
    } finally {
      setSaving(false);
    }
  }

  const valueLabel =
    type === "percentage" ? "Percent off" : type === "free_trial" ? "Trial days" : "Bonus credits";

  return (
    <form
      onSubmit={submit}
      className="space-y-4 rounded-xl border border-white/[0.07] bg-[#24303F] p-5"
    >
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Code" hint="3–16 characters">
          <input
            name="code"
            required
            minLength={3}
            maxLength={16}
            placeholder="CREATOR20"
            className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 font-mono text-sm uppercase text-white placeholder:text-white/25 focus:border-[#3C50E0] focus:outline-none"
          />
        </Field>

        <Field label="Type">
          <select
            name="type"
            value={type}
            onChange={(e) => setType(e.target.value as Coupon["type"])}
            className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white focus:border-[#3C50E0] focus:outline-none"
          >
            <option value="percentage">Percentage off</option>
            <option value="free_trial">Free trial</option>
            <option value="free_credits">Bonus credits</option>
          </select>
        </Field>

        <Field label={valueLabel}>
          <input
            name="value"
            type="number"
            required
            min={1}
            max={type === "percentage" ? 100 : undefined}
            defaultValue={type === "percentage" ? 20 : undefined}
            className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white focus:border-[#3C50E0] focus:outline-none"
          />
        </Field>

        <Field label="Max uses" hint="Blank for unlimited">
          <input
            name="max_uses"
            type="number"
            min={1}
            placeholder="1000"
            className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white placeholder:text-white/25 focus:border-[#3C50E0] focus:outline-none"
          />
        </Field>

        <Field label="Uses per user">
          <input
            name="max_uses_per_user"
            type="number"
            min={1}
            defaultValue={1}
            className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white focus:border-[#3C50E0] focus:outline-none"
          />
        </Field>

        <Field label="Starts" hint="Blank to start immediately">
          <input
            name="starts_at"
            type="datetime-local"
            className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white focus:border-[#3C50E0] focus:outline-none"
          />
        </Field>

        <Field label="Expires" hint="Blank for no expiry">
          <input
            name="expires_at"
            type="datetime-local"
            className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white focus:border-[#3C50E0] focus:outline-none"
          />
        </Field>

        <Field label="Plans" hint="Comma separated. Blank = all plans">
          <input
            name="applicable_plans"
            placeholder="creator, business"
            className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white placeholder:text-white/25 focus:border-[#3C50E0] focus:outline-none"
          />
        </Field>

        <Field label="Visibility" hint="Private codes are never listed to users">
          <select
            name="visibility"
            defaultValue="public"
            className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white focus:border-[#3C50E0] focus:outline-none"
          >
            <option value="public">Public</option>
            <option value="private">Private</option>
          </select>
        </Field>

        <Field label="Start as" hint="Draft codes cannot be redeemed">
          <select
            name="status"
            defaultValue="draft"
            className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white focus:border-[#3C50E0] focus:outline-none"
          >
            <option value="draft">Draft</option>
            <option value="active">Active</option>
          </select>
        </Field>
      </div>

      {type === "percentage" && (
        <p className="text-xs text-white/40">
          A percentage coupon is registered with the payment provider on save. If that fails, the
          coupon is not created — a code that discounts here but charges full price at checkout
          would be worse than none.
        </p>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg bg-[#3C50E0] px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-[#3242c4] disabled:opacity-50"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {saving ? "Creating…" : "Create coupon"}
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
