import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { Users, TrendingUp, CreditCard, UserCheck } from "lucide-react";
import { UserGrowthChart, FreePaidPieChart } from "@/components/admin/charts";

export const metadata: Metadata = { title: "Users" };

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

function KpiCard({ icon: Icon, label, value, sub, color }: {
  icon: React.ElementType; label: string; value: string; sub?: string; color: string;
}) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-4">
      <div className={`mb-3 inline-flex rounded-lg p-2 ${color}`}>
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-xs text-white/45">{label}</p>
      {sub && <p className="text-[11px] text-white/25 mt-0.5">{sub}</p>}
    </div>
  );
}

export default async function UsersPage() {
  const stats = await fetchStats();
  if (!stats) return <p className="text-white/40">Failed to load.</p>;

  const { users, subscriptions } = stats;

  return (
    <div className="space-y-8 pb-12">
      <div>
        <h1 className="text-2xl font-bold text-white">User Analytics</h1>
        <p className="mt-1 text-sm text-white/35">All user metrics and growth data</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard icon={Users}    label="Total Users"    value={users.total.toLocaleString()} sub={`+${users.newToday} today`} color="bg-indigo-500/10 text-indigo-400" />
        <KpiCard icon={CreditCard} label="Paid Users"  value={users.paid.toLocaleString()} sub={`${users.conversionRate}% conversion`} color="bg-emerald-500/10 text-emerald-400" />
        <KpiCard icon={UserCheck} label="Free Users"   value={users.free.toLocaleString()} color="bg-blue-500/10 text-blue-400" />
        <KpiCard icon={TrendingUp} label="Conversion"  value={`${users.conversionRate}%`} color="bg-violet-500/10 text-violet-400" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-5 lg:col-span-2">
          <h3 className="mb-4 text-sm font-semibold text-white/70">User Growth (6 months)</h3>
          <UserGrowthChart data={users.growth} />
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-5">
          <h3 className="mb-4 text-sm font-semibold text-white/70">Free vs Paid Split</h3>
          <FreePaidPieChart free={users.free} paid={users.paid} />
          <div className="mt-2 grid grid-cols-2 gap-4 border-t border-white/[0.06] pt-4">
            <div className="text-center">
              <p className="text-xl font-bold text-emerald-400">{users.conversionRate}%</p>
              <p className="text-[11px] text-white/35">Paid</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-white">{(100 - parseFloat(users.conversionRate)).toFixed(1)}%</p>
              <p className="text-[11px] text-white/35">Free</p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-5">
        <h3 className="mb-4 text-sm font-semibold text-white/70">Recent Signups</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/[0.06]">
                {["Name", "Email", "Plan", "Credits", "Joined"].map((h) => (
                  <th key={h} className="pb-3 pr-4 text-left font-semibold uppercase tracking-widest text-white/25">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.recent.map((u: { id: string; email: string; full_name: string; subscription_tier: string; credits: number; created_at: string }) => (
                <tr key={u.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                  <td className="py-2.5 pr-4 font-medium text-white">{u.full_name || "—"}</td>
                  <td className="py-2.5 pr-4 text-white/50">{u.email}</td>
                  <td className="py-2.5 pr-4">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                      u.subscription_tier === "free" || u.subscription_tier === "starter"
                        ? "bg-white/[0.06] text-white/40"
                        : "bg-emerald-500/15 text-emerald-400"
                    }`}>{u.subscription_tier}</span>
                  </td>
                  <td className="py-2.5 pr-4 text-white/60">{u.credits}</td>
                  <td className="py-2.5 text-white/40">{new Date(u.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
