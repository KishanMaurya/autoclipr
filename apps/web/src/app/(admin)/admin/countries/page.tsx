import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { Globe, Users, DollarSign, TrendingUp } from "lucide-react";

export const metadata: Metadata = { title: "Countries" };

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

export default async function CountriesPage() {
  const stats = await fetchStats();
  if (!stats) return <p className="text-white/40">Failed to load.</p>;

  const { countries, users } = stats;
  const maxUsers = countries[0]?.users || 1;
  const totalRevenue = countries.reduce((sum: number, c: { revenueRupees: number }) => sum + c.revenueRupees, 0);
  const topCountry = countries[0]?.country ?? "—";

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="text-[22px] font-bold text-white">Country Analytics</h1>
        <p className="mt-0.5 text-sm text-white/40">User distribution and revenue by geography &middot; estimated</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { icon: Globe,     label: "Countries Tracked", value: countries.length.toString(),           iconBg: "#3C50E0" },
          { icon: Users,     label: "Total Users",        value: users.total.toLocaleString(),          iconBg: "#10B981" },
          { icon: DollarSign,label: "Total Revenue",      value: fmtInr(totalRevenue),                  iconBg: "#8B5CF6" },
          { icon: TrendingUp,label: "Top Country",        value: topCountry,                            iconBg: "#F59E0B" },
        ].map((k) => (
          <div key={k.label} className="rounded-xl border border-white/[0.07] bg-[#24303F] p-5">
            <div className="rounded-xl p-3 w-fit" style={{ background: k.iconBg + "22" }}>
              <k.icon className="h-5 w-5" style={{ color: k.iconBg }} />
            </div>
            <p className="mt-4 text-2xl font-bold text-white">{k.value}</p>
            <p className="mt-1 text-[13px] font-medium text-white/50">{k.label}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-amber-500/10 bg-amber-500/[0.04] px-4 py-3">
        <p className="text-xs text-amber-400">Country data is estimated based on user demographics. Full geo-tracking requires IP-based analytics integration.</p>
      </div>

      <div className="rounded-xl border border-white/[0.07] bg-[#24303F] p-5">
        <h3 className="mb-5 text-[15px] font-semibold text-white">Top Countries</h3>
        <div className="space-y-5">
          {countries.map((c: { country: string; users: number; revenueRupees: number }) => (
            <div key={c.country}>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-medium text-white">{c.country}</span>
                <div className="flex items-center gap-4 text-xs">
                  <span className="text-white/40">{c.users.toLocaleString()} users</span>
                  <span className="font-semibold text-emerald-400">{fmtInr(c.revenueRupees)}</span>
                </div>
              </div>
              <div className="h-2 rounded-full bg-white/[0.06]">
                <div
                  className="h-full rounded-full bg-indigo-500/60"
                  style={{ width: `${(c.users / maxUsers) * 100}%` }}
                />
              </div>
              <p className="mt-1 text-right text-[10px] text-white/20">
                {Math.round((c.users / users.total) * 100)}% of total users
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

