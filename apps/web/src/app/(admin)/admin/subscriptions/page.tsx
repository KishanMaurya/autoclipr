import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { CreditCard, TrendingUp, TrendingDown, RefreshCw } from "lucide-react";

export const metadata: Metadata = { title: "Subscriptions" };

const API = `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080"}/api/v1`;

async function fetchStats() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;
  const res = await fetch(`${API}/admin/stats`, {
    headers: { Authorization: `Bearer ${session.access_token}` },
    next: { revalidate: 60 },
  });
  if (!res.ok) return null;
  return (await res.json()).data;
}

export default async function SubscriptionsPage() {
  const stats = await fetchStats();
  if (!stats) return <p className="text-white/40">Failed to load.</p>;

  const { subscriptions } = stats;

  const planLabels: Record<string, string> = {
    "creator-monthly": "Creator Monthly",
    "creator-yearly":  "Creator Yearly",
    "business-monthly": "Business Monthly",
    "business-yearly":  "Business Yearly",
  };

  return (
    <div className="space-y-8 pb-12">
      <div>
        <h1 className="text-2xl font-bold text-white">Subscription Analytics</h1>
        <p className="mt-1 text-sm text-white/35">Active subscriptions, churn, and renewal rates</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { icon: CreditCard,  label: "Active",       value: subscriptions.active,               color: "bg-emerald-500/10 text-emerald-400" },
          { icon: TrendingUp,  label: "Renewal Rate", value: `${subscriptions.renewalRate}%`,    color: "bg-indigo-500/10 text-indigo-400" },
          { icon: TrendingDown,label: "Churn Rate",   value: `${subscriptions.churnRate}%`,      color: "bg-rose-500/10 text-rose-400" },
          { icon: RefreshCw,   label: "Refund Rate",  value: `${subscriptions.refundRate}%`,     color: "bg-amber-500/10 text-amber-400" },
        ].map((k) => (
          <div key={k.label} className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-4">
            <div className={`mb-3 inline-flex rounded-lg p-2 ${k.color}`}>
              <k.icon className="h-4 w-4" />
            </div>
            <p className="text-2xl font-bold text-white">{k.value}</p>
            <p className="text-xs text-white/45">{k.label}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-5">
        <h3 className="mb-4 text-sm font-semibold text-white/70">Active by Plan</h3>
        <div className="space-y-3">
          {Object.entries(subscriptions.byPlan).map(([plan, count]) => {
            const total = subscriptions.active || 1;
            const pct = Math.round(((count as number) / (total as number)) * 100);
            return (
              <div key={plan}>
                <div className="mb-1 flex justify-between text-xs">
                  <span className="text-white/60">{planLabels[plan] ?? plan}</span>
                  <span className="font-semibold text-white">{count as number} <span className="text-white/30">({pct}%)</span></span>
                </div>
                <div className="h-2 rounded-full bg-white/[0.06]">
                  <div className="h-full rounded-full bg-indigo-500/60" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
          {Object.keys(subscriptions.byPlan).length === 0 && (
            <p className="text-center text-xs text-white/25 py-6">No active subscriptions yet</p>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {[
          { label: "Churn Rate",    value: `${subscriptions.churnRate}%`,   note: "Monthly. <5% is healthy.", ok: subscriptions.churnRate < 5 },
          { label: "Renewal Rate",  value: `${subscriptions.renewalRate}%`, note: "Auto-renewals processed.", ok: subscriptions.renewalRate > 90 },
          { label: "Refund Rate",   value: `${subscriptions.refundRate}%`,  note: "Refunds / total paid.",    ok: subscriptions.refundRate < 2 },
        ].map((m) => (
          <div key={m.label} className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-5 text-center">
            <p className={`text-3xl font-bold ${m.ok ? "text-emerald-400" : "text-rose-400"}`}>{m.value}</p>
            <p className="mt-1 text-sm font-semibold text-white/70">{m.label}</p>
            <p className="mt-1 text-xs text-white/25">{m.note}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

