import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import {
  Users, DollarSign, Video, Scissors, Bot, CreditCard, TrendingUp,
  Link2, Server, AlertCircle, Activity, Globe, ArrowUpRight, ArrowDownRight,
} from "lucide-react";
import {
  UserGrowthChart, RevenueBarChart, FreePaidPieChart, FunnelChart,
} from "@/components/admin/charts";

export const metadata: Metadata = { title: "Dashboard" };

const API = `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080"}/api/v1`;

type AdminStats = Awaited<ReturnType<typeof fetchStats>>;

async function fetchStats() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) return null;

  const res = await fetch(`${API}/admin/stats`, {
    headers: { Authorization: `Bearer ${token}` },
    next: { revalidate: 60 },
  });
  if (!res.ok) return null;
  const json = await res.json();
  return json.data as {
    users: {
      total: number; paid: number; free: number; conversionRate: string; newToday: number;
      growth: { month: string; total: number; paid: number }[];
      recent: { id: string; email: string; full_name: string; subscription_tier: string; credits: number; created_at: string }[];
    };
    revenue: {
      mrrRupees: number; arrRupees: number; totalRupees: number; transactionCount: number; arpuRupees: number;
      byMonth: { month: string; revenue: number }[];
      recent: { id: string; invoice_number: string; plan_id: string; amount: string; billing_period: string; payment_date: string }[];
    };
    subscriptions: { active: number; cancelled: number; churnRate: number; renewalRate: number; refundRate: number };
    videos: { total: number; today: number; avgDurationSecs: number; storageFormatted: string; storagePct: number };
    clips: { total: number; today: number; avgPerVideo: number };
    ai: { hooksGenerated: number; titlesGenerated: number; captionsGenerated: number; scriptsGenerated: number; creditsConsumed: number };
    affiliates: { total: number; active: number; totalReferrals: number; totalRevenuePaise: number; top: { email: string; conversions: number; earningsPaise: number }[] };
    countries: { country: string; users: number; revenueRupees: number }[];
    funnel: { stage: string; value: number }[];
    system: { cpuPercent: number; memoryPercent: number; queueSize: number; processingJobs: number; failedJobs: number };
  };
}

function fmtInr(rupees: number) {
  if (rupees >= 1e7) return `₹${(rupees / 1e7).toFixed(2)}Cr`;
  if (rupees >= 1e5) return `₹${(rupees / 1e5).toFixed(1)}L`;
  if (rupees >= 1e3) return `₹${(rupees / 1e3).toFixed(1)}K`;
  return `₹${rupees.toLocaleString("en-IN")}`;
}

function KpiCard({
  icon: Icon, label, value, sub, color = "indigo", trend,
}: {
  icon: React.ElementType; label: string; value: string; sub?: string;
  color?: "indigo" | "emerald" | "amber" | "rose" | "blue" | "violet"; trend?: "up" | "down";
}) {
  const colors = {
    indigo: "bg-indigo-500/10 text-indigo-400",
    emerald: "bg-emerald-500/10 text-emerald-400",
    amber:  "bg-amber-500/10 text-amber-400",
    rose:   "bg-rose-500/10 text-rose-400",
    blue:   "bg-blue-500/10 text-blue-400",
    violet: "bg-violet-500/10 text-violet-400",
  };
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-4 hover:bg-white/[0.04] transition-colors">
      <div className="flex items-start justify-between">
        <div className={`rounded-lg p-2 ${colors[color]}`}>
          <Icon className="h-4 w-4" />
        </div>
        {trend === "up" && <ArrowUpRight className="h-4 w-4 text-emerald-400" />}
        {trend === "down" && <ArrowDownRight className="h-4 w-4 text-rose-400" />}
      </div>
      <p className="mt-3 text-2xl font-bold text-white">{value}</p>
      <p className="text-xs text-white/45 mt-0.5">{label}</p>
      {sub && <p className="text-[11px] text-white/25 mt-1">{sub}</p>}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-white/25">{title}</h2>
      {children}
    </section>
  );
}

function Card({ title, children, className = "" }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-white/[0.06] bg-white/[0.025] p-5 ${className}`}>
      {title && <h3 className="mb-4 text-sm font-semibold text-white/70">{title}</h3>}
      {children}
    </div>
  );
}

function Stat({ label, value, accent = false }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div className="text-center">
      <p className={`text-xl font-bold ${accent ? "text-emerald-400" : "text-white"}`}>{value}</p>
      <p className="text-[11px] text-white/35 mt-0.5">{label}</p>
    </div>
  );
}

function SystemBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs">
        <span className="text-white/50">{label}</span>
        <span className="font-medium text-white">{value}%</span>
      </div>
      <div className="h-2 rounded-full bg-white/[0.06]">
        <div className="h-full rounded-full transition-all" style={{ width: `${value}%`, background: color }} />
      </div>
    </div>
  );
}

export default async function AdminDashboardPage() {
  const stats = await fetchStats();

  if (!stats) {
    return (
      <div className="flex h-72 flex-col items-center justify-center gap-3">
        <AlertCircle className="h-10 w-10 text-rose-400" />
        <p className="text-white/50">Could not load admin stats. Check your session or API connection.</p>
      </div>
    );
  }

  const { users, revenue, subscriptions, videos, clips, ai, affiliates, countries, funnel, system } = stats;

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Executive Dashboard</h1>
        <p className="mt-1 text-sm text-white/35">Real-time overview · {new Date().toLocaleDateString("en-IN", { dateStyle: "long" })}</p>
      </div>

      {/* KPI Row 1 — Users */}
      <Section title="Users">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <KpiCard icon={Users}     label="Total Users"    value={users.total.toLocaleString()} sub={`+${users.newToday} today`} color="indigo" trend="up" />
          <KpiCard icon={CreditCard} label="Paid Users"    value={users.paid.toLocaleString()}  sub={`${users.conversionRate}% conversion`} color="emerald" />
          <KpiCard icon={Users}     label="Free Users"     value={users.free.toLocaleString()}  color="blue" />
          <KpiCard icon={TrendingUp} label="Conversion"   value={`${users.conversionRate}%`}   color="violet" />
          <KpiCard icon={Activity}  label="Active Subs"   value={subscriptions.active.toLocaleString()} color="amber" />
        </div>
      </Section>

      {/* KPI Row 2 — Revenue */}
      <Section title="Revenue">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <KpiCard icon={DollarSign} label="MRR"           value={fmtInr(revenue.mrrRupees)}  color="emerald" trend="up" />
          <KpiCard icon={DollarSign} label="ARR"           value={fmtInr(revenue.arrRupees)}  color="emerald" />
          <KpiCard icon={DollarSign} label="Total Revenue" value={fmtInr(revenue.totalRupees)} sub={`${revenue.transactionCount} txns`} color="indigo" />
          <KpiCard icon={TrendingUp} label="ARPU"          value={fmtInr(revenue.arpuRupees)} sub="per paid user" color="violet" />
          <KpiCard icon={CreditCard} label="Churn Rate"    value={`${subscriptions.churnRate}%`} sub="monthly" color="rose" trend="down" />
        </div>
      </Section>

      {/* KPI Row 3 — Content */}
      <Section title="Content & AI">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <KpiCard icon={Video}    label="Videos"       value={videos.total.toLocaleString()} sub={`+${videos.today} today`} color="blue" />
          <KpiCard icon={Scissors} label="Clips"        value={clips.total.toLocaleString()}  sub={`+${clips.today} today`} color="violet" />
          <KpiCard icon={Server}   label="Storage"      value={videos.storageFormatted}        color="amber" />
          <KpiCard icon={Bot}      label="Hooks Gen."   value={ai.hooksGenerated.toLocaleString()} color="indigo" />
          <KpiCard icon={Bot}      label="Captions Gen." value={ai.captionsGenerated.toLocaleString()} color="violet" />
          <KpiCard icon={Bot}      label="Credits Used" value={ai.creditsConsumed.toLocaleString()} color="rose" />
        </div>
      </Section>

      {/* Charts row */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="User Growth (6 months)" className="lg:col-span-2">
          <UserGrowthChart data={users.growth} />
        </Card>
        <Card title="Free vs Paid">
          <FreePaidPieChart free={users.free} paid={users.paid} />
          <div className="mt-2 flex justify-around">
            <Stat label="Paid" value={`${users.conversionRate}%`} accent />
            <Stat label="Free" value={`${(100 - parseFloat(users.conversionRate)).toFixed(1)}%`} />
          </div>
        </Card>
      </div>

      {/* Revenue chart + subscription stats */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Revenue by Month" className="lg:col-span-2">
          <RevenueBarChart data={revenue.byMonth} />
        </Card>
        <Card title="Subscription Health">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Stat label="Active"    value={subscriptions.active}              accent />
              <Stat label="Cancelled" value={subscriptions.cancelled}           />
              <Stat label="Renewal"   value={`${subscriptions.renewalRate}%`}   accent />
              <Stat label="Refund"    value={`${subscriptions.refundRate}%`}    />
            </div>
            <div className="border-t border-white/[0.06] pt-4 space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-white/40">Churn rate</span>
                <span className={subscriptions.churnRate < 5 ? "text-emerald-400" : "text-rose-400"}>
                  {subscriptions.churnRate}%
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-white/40">Renewal rate</span>
                <span className="text-emerald-400">{subscriptions.renewalRate}%</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-white/40">Refund rate</span>
                <span className="text-white/60">{subscriptions.refundRate}%</span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* User funnel + Countries */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Conversion Funnel">
          <FunnelChart data={funnel} />
        </Card>
        <Card title="Top Countries">
          <div className="space-y-3">
            {countries.map((c) => (
              <div key={c.country} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Globe className="h-4 w-4 text-white/20" />
                  <span className="text-sm text-white/70">{c.country}</span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-white">{fmtInr(c.revenueRupees)}</p>
                  <p className="text-[10px] text-white/30">{c.users.toLocaleString()} users</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* AI + Affiliates */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="AI Feature Usage">
          <div className="space-y-3">
            {[
              { label: "Hooks Generated",    value: ai.hooksGenerated,    color: "#6366f1" },
              { label: "Captions Generated", value: ai.captionsGenerated, color: "#10b981" },
              { label: "Titles Generated",   value: ai.titlesGenerated,   color: "#f59e0b" },
              { label: "Scripts Generated",  value: ai.scriptsGenerated,  color: "#3b82f6" },
            ].map((item) => {
              const max = ai.captionsGenerated || 1;
              return (
                <div key={item.label}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="text-white/50">{item.label}</span>
                    <span className="font-medium text-white">{item.value.toLocaleString()}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/[0.06]">
                    <div className="h-full rounded-full" style={{ width: `${(item.value / max) * 100}%`, background: item.color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card title="Affiliate Program">
          <div className="mb-4 grid grid-cols-3 gap-3">
            <Stat label="Affiliates"  value={affiliates.total}         accent />
            <Stat label="Active"      value={affiliates.active}        />
            <Stat label="Referrals"   value={affiliates.totalReferrals} />
          </div>
          <div className="space-y-2">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-white/25">Top Affiliates</p>
            {affiliates.top.map((a, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg bg-white/[0.03] px-3 py-2">
                <span className="text-xs text-white/60">{a.email}</span>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-white/40">{a.conversions} conv.</span>
                  <span className="text-xs font-semibold text-emerald-400">
                    {fmtInr(Math.round(a.earningsPaise / 100))}
                  </span>
                </div>
              </div>
            ))}
            {affiliates.top.length === 0 && (
              <p className="text-center text-xs text-white/25 py-4">No affiliate data yet</p>
            )}
          </div>
        </Card>
      </div>

      {/* System health + Recent users */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="System Health">
          <div className="space-y-4">
            <SystemBar label="CPU Usage"    value={system.cpuPercent}    color="#6366f1" />
            <SystemBar label="Memory Usage" value={system.memoryPercent} color="#f59e0b" />
            <SystemBar label="Storage"      value={videos.storagePct}    color="#10b981" />
          </div>
          <div className="mt-5 grid grid-cols-3 gap-3 border-t border-white/[0.06] pt-4">
            <Stat label="Queue"      value={system.queueSize}     />
            <Stat label="Processing" value={system.processingJobs} accent />
            <Stat label="Failed"     value={system.failedJobs}    />
          </div>
        </Card>

        <Card title="Recent Users">
          <div className="space-y-2">
            {users.recent.map((u) => (
              <div key={u.id} className="flex items-center justify-between rounded-lg bg-white/[0.03] px-3 py-2">
                <div>
                  <p className="text-xs font-medium text-white">{u.full_name || u.email}</p>
                  <p className="text-[10px] text-white/30">{new Date(u.created_at).toLocaleDateString()}</p>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                  u.subscription_tier === "free" || u.subscription_tier === "starter"
                    ? "bg-white/[0.06] text-white/40"
                    : "bg-emerald-500/15 text-emerald-400"
                }`}>
                  {u.subscription_tier}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Section title="Recent Transactions">
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  {["Invoice", "Plan", "Amount", "Period", "Date"].map((h) => (
                    <th key={h} className="pb-3 pr-4 text-left font-semibold uppercase tracking-widest text-white/25">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {revenue.recent.map((tx) => (
                  <tr key={tx.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                    <td className="py-2.5 pr-4 font-mono text-white/50">{tx.invoice_number}</td>
                    <td className="py-2.5 pr-4 text-white/70">{tx.plan_id}</td>
                    <td className="py-2.5 pr-4 font-semibold text-emerald-400">{tx.amount}</td>
                    <td className="py-2.5 pr-4 text-white/40 capitalize">{tx.billing_period}</td>
                    <td className="py-2.5 text-white/40">{new Date(tx.payment_date).toLocaleDateString()}</td>
                  </tr>
                ))}
                {revenue.recent.length === 0 && (
                  <tr><td colSpan={5} className="py-6 text-center text-white/25">No transactions yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </Section>
    </div>
  );
}

