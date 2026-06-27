import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { Link2, Users, DollarSign, TrendingUp } from "lucide-react";

export const metadata: Metadata = { title: "Affiliates" };

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

function fmtInr(r: number) {
  if (r >= 1e5) return `₹${(r / 1e5).toFixed(1)}L`;
  if (r >= 1e3) return `₹${(r / 1e3).toFixed(1)}K`;
  return `₹${r.toLocaleString("en-IN")}`;
}

export default async function AffiliatesAdminPage() {
  const stats = await fetchStats();
  if (!stats) return <p className="text-white/40">Failed to load.</p>;

  const { affiliates } = stats;
  const totalEarningsRupees = Math.round(affiliates.totalRevenuePaise / 100);

  return (
    <div className="space-y-8 pb-12">
      <div>
        <h1 className="text-2xl font-bold text-white">Affiliate Program</h1>
        <p className="mt-1 text-sm text-white/35">Program health, referrals, commissions</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { icon: Link2,      label: "Total Affiliates",  value: affiliates.total.toLocaleString(),        color: "bg-violet-500/10 text-violet-400" },
          { icon: Users,      label: "Active Affiliates", value: affiliates.active.toLocaleString(),       color: "bg-emerald-500/10 text-emerald-400" },
          { icon: TrendingUp, label: "Total Referrals",   value: affiliates.totalReferrals.toLocaleString(), color: "bg-blue-500/10 text-blue-400" },
          { icon: DollarSign, label: "Commissions Paid",  value: fmtInr(totalEarningsRupees),              color: "bg-amber-500/10 text-amber-400" },
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
        <h3 className="mb-4 text-sm font-semibold text-white/70">Top Affiliates by Conversions</h3>
        {affiliates.top.length === 0 ? (
          <p className="py-8 text-center text-sm text-white/25">No affiliate data yet. Share the program!</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  {["#", "Affiliate", "Conversions", "Earnings"].map((h) => (
                    <th key={h} className="pb-3 pr-4 text-left font-semibold uppercase tracking-widest text-white/25">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {affiliates.top.map((a: { email: string; conversions: number; earningsPaise: number }, i: number) => (
                  <tr key={i} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                    <td className="py-3 pr-4 text-white/30">#{i + 1}</td>
                    <td className="py-3 pr-4 font-medium text-white">{a.email}</td>
                    <td className="py-3 pr-4 text-white/70">{a.conversions}</td>
                    <td className="py-3 font-semibold text-emerald-400">{fmtInr(Math.round(a.earningsPaise / 100))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-amber-500/10 bg-amber-500/[0.04] p-4">
        <p className="text-sm font-semibold text-amber-400">Commission Tiers</p>
        <div className="mt-3 grid grid-cols-3 gap-3 text-center text-xs">
          <div className="rounded-lg bg-white/[0.04] p-3">
            <p className="text-xl font-bold text-white">30%</p>
            <p className="text-white/40 mt-1">1–5 conversions</p>
          </div>
          <div className="rounded-lg bg-white/[0.04] p-3">
            <p className="text-xl font-bold text-emerald-400">35%</p>
            <p className="text-white/40 mt-1">6–20 conversions</p>
          </div>
          <div className="rounded-lg bg-white/[0.04] p-3">
            <p className="text-xl font-bold text-emerald-300">40%</p>
            <p className="text-white/40 mt-1">21+ conversions</p>
          </div>
        </div>
      </div>
    </div>
  );
}

