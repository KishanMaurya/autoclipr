"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Copy, Check, Users, DollarSign, TrendingUp, Clock, ExternalLink, MousePointer } from "lucide-react";
import { apiFetch } from "@/lib/api";
import type { AffiliateData } from "./page";

const EASE = [0.22, 1, 0.36, 1] as const;

function fmt(paise: number) {
  return `₹${(paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending:   "bg-amber-500/10 text-amber-400 border-amber-500/20",
    active:    "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    suspended: "bg-red-500/10 text-red-400 border-red-500/20",
    signed_up: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    converted: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    churned:   "bg-white/5 text-white/30 border-white/10",
    approved:  "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    paid:      "bg-violet-500/10 text-violet-400 border-violet-500/20",
  };
  const cls = map[status] ?? "bg-white/5 text-white/30 border-white/10";
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${cls}`}>
      {status.replace("_", " ")}
    </span>
  );
}

function StatCard({
  label, value, icon: Icon, sub, color = "emerald",
}: {
  label: string; value: string; icon: React.ElementType; sub?: string; color?: "emerald" | "violet" | "blue" | "amber";
}) {
  const colorMap = {
    emerald: "from-emerald-500 to-teal-400 shadow-[0_0_20px_rgba(16,185,129,0.15)]",
    violet:  "from-violet-500 to-purple-400 shadow-[0_0_20px_rgba(139,92,246,0.15)]",
    blue:    "from-blue-500 to-cyan-400 shadow-[0_0_20px_rgba(59,130,246,0.15)]",
    amber:   "from-amber-500 to-orange-400 shadow-[0_0_20px_rgba(245,158,11,0.15)]",
  };
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0a0a16] p-5">
      <div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${colorMap[color]}`}>
        <Icon className="h-5 w-5 text-white" />
      </div>
      <p className="text-2xl font-black text-white">{value}</p>
      <p className="mt-1 text-sm font-semibold text-white/50">{label}</p>
      {sub && <p className="mt-0.5 text-xs text-white/30">{sub}</p>}
    </div>
  );
}

function CopyRefLink({ refCode }: { refCode: string }) {
  const [copied, setCopied] = useState(false);
  const link = `https://autoclipr.com/?ref=${refCode}`;

  function copy() {
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
      <span className="flex-1 truncate font-mono text-sm text-white/60">{link}</span>
      <button
        onClick={copy}
        className="flex shrink-0 items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.06] px-3 py-1.5 text-xs font-semibold text-white/70 transition-all hover:border-emerald-500/40 hover:bg-emerald-500/10 hover:text-emerald-400"
      >
        {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
        {copied ? "Copied!" : "Copy"}
      </button>
    </div>
  );
}

export function AffiliateDashboard({ data, token }: { data: AffiliateData; token: string }) {
  const { affiliate, stats, referrals, commissions, payouts } = data;
  const [tab, setTab] = useState<"overview" | "referrals" | "commissions" | "payouts">("overview");
  const [payoutForm, setPayoutForm] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState("");
  const [payoutMethod, setPayoutMethod] = useState("paypal");
  const [payoutDetails, setPayoutDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [payoutSuccess, setPayoutSuccess] = useState(false);

  const tierLabel = stats.commission_rate >= 40 ? "Elite" : stats.commission_rate >= 35 ? "Growth" : "Starter";
  const nextTierAt = stats.commission_rate >= 40 ? null : stats.commission_rate >= 35 ? 21 : 6;
  const conversionsLeft = nextTierAt ? nextTierAt - stats.total_conversions : null;

  async function submitPayout(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const amountPaise = Math.round(parseFloat(payoutAmount) * 100);
    const res = await apiFetch("/api/v1/affiliates/payouts/request", {
      method: "POST",
      token,
      body: JSON.stringify({ amountPaise, method: payoutMethod, details: payoutDetails }),
    });
    setSubmitting(false);
    if (res.success) {
      setPayoutSuccess(true);
      setPayoutForm(false);
    }
  }

  const tabs = [
    { id: "overview",     label: "Overview" },
    { id: "referrals",    label: `Referrals (${referrals.length})` },
    { id: "commissions",  label: `Commissions (${commissions.length})` },
    { id: "payouts",      label: `Payouts (${payouts.length})` },
  ] as const;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Affiliate Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your referral link earns you <span className="font-semibold text-emerald-400">{stats.commission_rate}% recurring</span> on every active subscriber.
          </p>
        </div>
        <StatusBadge status={affiliate.status} />
      </div>

      {/* Referral link */}
      <div className="rounded-2xl border border-white/[0.07] bg-[#0a0a16] p-5">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-semibold text-white/60">Your referral link</p>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
            tierLabel === "Elite" ? "bg-violet-500/10 text-violet-400" :
            tierLabel === "Growth" ? "bg-blue-500/10 text-blue-400" :
            "bg-emerald-500/10 text-emerald-400"
          }`}>
            {tierLabel} tier · {stats.commission_rate}%
          </span>
        </div>
        <CopyRefLink refCode={affiliate.ref_code} />
        {conversionsLeft && (
          <p className="mt-2 text-xs text-white/30">
            {conversionsLeft} more conversion{conversionsLeft !== 1 ? "s" : ""} to unlock {nextTierAt && nextTierAt >= 21 ? "Elite (40%)" : "Growth (35%)"}
          </p>
        )}
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total clicks"      value={stats.total_clicks.toString()}         icon={MousePointer} color="blue"    />
        <StatCard label="Referrals"         value={stats.total_referrals.toString()}       icon={Users}        color="violet"  />
        <StatCard label="Conversions"       value={stats.total_conversions.toString()}     icon={TrendingUp}   color="emerald" />
        <StatCard label="Total earned"      value={fmt(stats.total_earnings_paise)}        icon={DollarSign}   color="amber"   />
      </div>

      {/* Earnings summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400/70">Available to withdraw</p>
          <p className="mt-2 text-3xl font-black text-emerald-400">{fmt(stats.available_paise)}</p>
          {stats.available_paise >= 100000 && !payoutForm && (
            <button
              onClick={() => setPayoutForm(true)}
              className="mt-3 rounded-lg bg-emerald-500/20 px-3 py-1.5 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/30 transition-colors"
            >
              Request payout →
            </button>
          )}
          {stats.available_paise < 100000 && (
            <p className="mt-2 text-xs text-emerald-400/40">Min. ₹1,000 to withdraw</p>
          )}
        </div>
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-400/70">Pending approval</p>
          <p className="mt-2 text-3xl font-black text-amber-400">{fmt(stats.pending_earnings_paise)}</p>
          <p className="mt-2 text-xs text-amber-400/40">Approved within 30 days</p>
        </div>
        <div className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-violet-400/70">Total paid out</p>
          <p className="mt-2 text-3xl font-black text-violet-400">{fmt(stats.paid_out_paise)}</p>
          <p className="mt-2 text-xs text-violet-400/40">Via PayPal or bank transfer</p>
        </div>
      </div>

      {/* Payout form */}
      {payoutForm && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-emerald-500/20 bg-[#0a0a16] p-6"
        >
          <h3 className="mb-4 text-base font-bold">Request payout</h3>
          <form onSubmit={submitPayout} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-white/60">Amount (₹)</label>
              <input
                type="number"
                min={1000}
                max={(stats.available_paise / 100).toFixed(0)}
                value={payoutAmount}
                onChange={(e) => setPayoutAmount(e.target.value)}
                placeholder="1000"
                required
                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-white placeholder-white/25 outline-none focus:border-emerald-500/40"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-white/60">Payment method</label>
              <select
                value={payoutMethod}
                onChange={(e) => setPayoutMethod(e.target.value)}
                className="w-full rounded-xl border border-white/[0.08] bg-[#0a0a16] px-4 py-3 text-sm text-white outline-none focus:border-emerald-500/40"
              >
                <option value="paypal">PayPal</option>
                <option value="bank_transfer">Bank Transfer (IMPS/NEFT)</option>
                <option value="upi">UPI</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-white/60">
                {payoutMethod === "paypal" ? "PayPal email" : payoutMethod === "upi" ? "UPI ID" : "Account details"}
              </label>
              <input
                type="text"
                value={payoutDetails}
                onChange={(e) => setPayoutDetails(e.target.value)}
                placeholder={payoutMethod === "paypal" ? "you@paypal.com" : payoutMethod === "upi" ? "name@upi" : "Account no · IFSC"}
                required
                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-white placeholder-white/25 outline-none focus:border-emerald-500/40"
              />
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
              >
                {submitting ? "Submitting…" : "Submit request"}
              </button>
              <button
                type="button"
                onClick={() => setPayoutForm(false)}
                className="rounded-xl border border-white/[0.08] px-4 py-2.5 text-sm font-semibold text-white/50 hover:text-white"
              >
                Cancel
              </button>
            </div>
          </form>
        </motion.div>
      )}

      {payoutSuccess && (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm text-emerald-400">
          Payout request submitted. We&apos;ll process it within 5–7 business days.
        </div>
      )}

      {/* Tabs */}
      <div className="rounded-2xl border border-white/[0.07] bg-[#0a0a16] overflow-hidden">
        <div className="flex border-b border-white/[0.06]">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-3 text-sm font-semibold transition-colors ${
                tab === t.id
                  ? "border-b-2 border-emerald-500 text-emerald-400"
                  : "text-white/40 hover:text-white/70"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="p-5">
          {tab === "overview" && (
            <div className="space-y-3">
              <p className="text-xs text-white/30">Commission tiers unlock automatically as your conversions grow.</p>
              <div className="space-y-2">
                {[
                  { label: "Starter", range: "1–5 conversions", rate: "30%", min: 0, max: 5 },
                  { label: "Growth",  range: "6–20 conversions", rate: "35%", min: 6, max: 20 },
                  { label: "Elite",   range: "21+ conversions",  rate: "40%", min: 21, max: null },
                ].map((tier) => {
                  const active = stats.commission_rate === parseInt(tier.rate);
                  return (
                    <div key={tier.label} className={`flex items-center justify-between rounded-xl border p-4 ${active ? "border-emerald-500/25 bg-emerald-500/5" : "border-white/[0.05] bg-white/[0.02]"}`}>
                      <div>
                        <p className={`text-sm font-bold ${active ? "text-emerald-400" : "text-white/40"}`}>{tier.label}</p>
                        <p className="text-xs text-white/25">{tier.range}</p>
                      </div>
                      <p className={`text-xl font-black ${active ? "text-emerald-400" : "text-white/25"}`}>{tier.rate}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {tab === "referrals" && (
            <div className="space-y-2">
              {referrals.length === 0 ? (
                <p className="py-8 text-center text-sm text-white/30">No referrals yet. Share your link to get started.</p>
              ) : referrals.map((r) => (
                <div key={r.id} className="flex items-center justify-between rounded-xl border border-white/[0.05] bg-white/[0.02] p-4">
                  <div>
                    <p className="text-sm font-semibold text-white">New referral</p>
                    <p className="text-xs text-white/30">{new Date(r.created_at).toLocaleDateString("en-IN")}</p>
                  </div>
                  <StatusBadge status={r.status} />
                </div>
              ))}
            </div>
          )}

          {tab === "commissions" && (
            <div className="space-y-2">
              {commissions.length === 0 ? (
                <p className="py-8 text-center text-sm text-white/30">No commissions yet — they appear when referrals upgrade.</p>
              ) : commissions.map((c) => (
                <div key={c.id} className="flex items-center justify-between rounded-xl border border-white/[0.05] bg-white/[0.02] p-4">
                  <div>
                    <p className="text-sm font-semibold text-white capitalize">{c.plan_id} · {c.billing_period}</p>
                    <p className="text-xs text-white/30">{new Date(c.created_at).toLocaleDateString("en-IN")} · {c.commission_rate}% commission</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-emerald-400">{fmt(c.amount_paise)}</p>
                    <StatusBadge status={c.status} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === "payouts" && (
            <div className="space-y-2">
              {payouts.length === 0 ? (
                <p className="py-8 text-center text-sm text-white/30">No payouts yet.</p>
              ) : payouts.map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded-xl border border-white/[0.05] bg-white/[0.02] p-4">
                  <div>
                    <p className="text-sm font-semibold text-white capitalize">{p.payment_method.replace("_", " ")}</p>
                    <p className="text-xs text-white/30">{new Date(p.created_at).toLocaleDateString("en-IN")}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-violet-400">{fmt(p.amount_paise)}</p>
                    <StatusBadge status={p.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Marketing page link */}
      <a
        href="/affiliate"
        target="_blank"
        className="flex items-center gap-2 text-xs text-white/30 hover:text-white/60 transition-colors"
      >
        <ExternalLink className="h-3.5 w-3.5" />
        View public affiliate page
      </a>
    </div>
  );
}

export function AffiliateApply({ token }: { token: string }) {
  const [email, setEmail] = useState("");
  const [channelUrl, setChannelUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    const res = await apiFetch("/api/v1/affiliates/apply", {
      method: "POST",
      token,
      body: JSON.stringify({ email, channelUrl }),
    });
    setSubmitting(false);
    if (res.success) {
      setSuccess(true);
    } else {
      setError(res.error?.message ?? "Something went wrong. Please try again.");
    }
  }

  if (success) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-8 text-center"
      >
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-400">
          <Check className="h-7 w-7 text-white" />
        </div>
        <h2 className="text-xl font-bold text-white">Application submitted!</h2>
        <p className="mt-2 text-sm text-white/50">
          We review applications within 48 hours. Once approved, you&apos;ll receive your unique referral link and dashboard access.
        </p>
      </motion.div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/[0.07] bg-[#0a0a16] p-6">
      <h2 className="mb-1 text-xl font-bold text-white">Apply to become an affiliate</h2>
      <p className="mb-6 text-sm text-white/50">Earn 30–40% recurring commission. Free to join, no hidden costs.</p>

      <div className="mb-6 grid grid-cols-3 gap-4 text-center">
        {[
          { value: "30–40%", label: "Recurring commission" },
          { value: "90 days", label: "Cookie window" },
          { value: "$0", label: "To join" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
            <p className="text-xl font-black text-emerald-400">{s.value}</p>
            <p className="mt-1 text-xs text-white/40">{s.label}</p>
          </div>
        ))}
      </div>

      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-white/60">Your email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-white placeholder-white/25 outline-none focus:border-emerald-500/40"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-white/60">YouTube / TikTok / Blog URL</label>
          <input
            type="url"
            value={channelUrl}
            onChange={(e) => setChannelUrl(e.target.value)}
            placeholder="https://youtube.com/@yourchannel"
            required
            className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-white placeholder-white/25 outline-none focus:border-emerald-500/40"
          />
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 py-3 text-sm font-bold text-white shadow-[0_0_18px_rgba(16,185,129,0.25)] transition-all hover:shadow-[0_0_28px_rgba(16,185,129,0.4)] disabled:opacity-50"
        >
          {submitting ? "Submitting…" : "Apply to become an affiliate"}
        </button>
        <p className="text-center text-xs text-white/30">Free to join · Approved within 48 hours</p>
      </form>
    </div>
  );
}
