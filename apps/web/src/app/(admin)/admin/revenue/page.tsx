import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { DollarSign, TrendingUp, CreditCard, BarChart2 } from "lucide-react";
import { RevenueBarChart } from "@/components/admin/charts";

export const metadata: Metadata = { title: "Revenue" };

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1";

async function fetchStats() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;
  const res = await fetch(`${API}/admin/stats`, {
    headers: { Authorization: `Bearer ${session.access_token}` },
    next: { revalidate: 60 },
  });
  if (!res.ok) return null;
  const json = await res.json();
  return json.data;
}

function fmtInr(r: number) {
  if (r >= 1e7) return `₹${(r / 1e7).toFixed(2)}Cr`;
  if (r >= 1e5) return `₹${(r / 1e5).toFixed(1)}L`;
  if (r >= 1e3) return `₹${(r / 1e3).toFixed(1)}K`;
  return `₹${r.toLocaleString("en-IN")}`;
}

export default async function RevenuePage() {
  const stats = await fetchStats();
  if (!stats) return <p className="text-white/40">Failed to load.</p>;

  const { revenue, subscriptions } = stats;

  const kpis = [
    { icon: DollarSign, label: "MRR",           value: fmtInr(revenue.mrrRupees),   color: "bg-emerald-500/10 text-emerald-400" },
    { icon: DollarSign, label: "ARR",           value: fmtInr(revenue.arrRupees),   color: "bg-emerald-500/10 text-emerald-400" },
    { icon: TrendingUp, label: "Total Revenue", value: fmtInr(revenue.totalRupees), color: "bg-indigo-500/10 text-indigo-400" },
    { icon: BarChart2,  label: "ARPU",          value: fmtInr(revenue.arpuRupees),  color: "bg-violet-500/10 text-violet-400" },
    { icon: CreditCard, label: "Transactions",  value: revenue.transactionCount,    color: "bg-blue-500/10 text-blue-400" },
    { icon: TrendingUp, label: "Churn",         value: `${subscriptions.churnRate}%`, color: "bg-rose-500/10 text-rose-400" },
  ];

  return (
    <div className="space-y-8 pb-12">
      <div>
        <h1 className="text-2xl font-bold text-white">Revenue Dashboard</h1>
        <p className="mt-1 text-sm text-white/35">Financial metrics from DodoPayments</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-4">
            <div className={`mb-3 inline-flex rounded-lg p-2 ${k.color}`}>
              <k.icon className="h-4 w-4" />
            </div>
            <p className="text-2xl font-bold text-white">{typeof k.value === 'number' ? k.value.toLocaleString() : k.value}</p>
            <p className="text-xs text-white/45">{k.label}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-5">
        <h3 className="mb-4 text-sm font-semibold text-white/70">Revenue by Month</h3>
        <RevenueBarChart data={revenue.byMonth} />
      </div>

      <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-5">
        <h3 className="mb-4 text-sm font-semibold text-white/70">Recent Transactions</h3>
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
              {revenue.recent.map((tx: { id: string; invoice_number: string; plan_id: string; amount: string; billing_period: string; payment_date: string }) => (
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
      </div>
    </div>
  );
}
