"use client";

import {
  AreaChart, Area, BarChart, Bar,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

const COLORS = ["#10b981", "#6366f1", "#f59e0b", "#ef4444", "#3b82f6", "#8b5cf6"];

function fmt(v: number) {
  if (v >= 1e6) return `₹${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `₹${(v / 1e3).toFixed(0)}K`;
  return `₹${v}`;
}

export function UserGrowthChart({ data }: { data: { month: string; total: number; paid: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="totalGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="paidGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
        <XAxis dataKey="month" tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 11 }} axisLine={false} tickLine={false} width={36} />
        <Tooltip
          contentStyle={{ background: "#0d0d1a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#fff", fontSize: 12 }}
          cursor={{ stroke: "rgba(255,255,255,0.08)" }}
        />
        <Area type="monotone" dataKey="total" stroke="#6366f1" strokeWidth={2} fill="url(#totalGrad)" name="Total Users" />
        <Area type="monotone" dataKey="paid" stroke="#10b981" strokeWidth={2} fill="url(#paidGrad)" name="Paid Users" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function RevenueBarChart({ data }: { data: { month: string; revenue: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
        <XAxis dataKey="month" tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 11 }} axisLine={false} tickLine={false} width={48} tickFormatter={fmt} />
        <Tooltip
          contentStyle={{ background: "#0d0d1a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#fff", fontSize: 12 }}
          formatter={(v) => [`₹${Number(v).toLocaleString("en-IN")}`, "Revenue"]}
        />
        <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function FreePaidPieChart({ free, paid }: { free: number; paid: number }) {
  const data = [
    { name: "Paid", value: paid },
    { name: "Free", value: free },
  ];
  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value">
          <Cell fill="#10b981" />
          <Cell fill="rgba(255,255,255,0.08)" />
        </Pie>
        <Tooltip
          contentStyle={{ background: "#0d0d1a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#fff", fontSize: 12 }}
        />
        <Legend formatter={(v) => <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 12 }}>{v}</span>} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function FunnelChart({ data }: { data: { stage: string; value: number }[] }) {
  const max = data[0]?.value || 1;
  return (
    <div className="space-y-2">
      {data.map((item, i) => (
        <div key={item.stage}>
          <div className="mb-1 flex justify-between text-xs">
            <span className="text-white/60">{item.stage}</span>
            <span className="font-semibold text-white">{item.value.toLocaleString()}</span>
          </div>
          <div className="h-7 overflow-hidden rounded-md bg-white/[0.05]">
            <div
              className="h-full rounded-md transition-all"
              style={{
                width: `${(item.value / max) * 100}%`,
                background: `linear-gradient(90deg, ${COLORS[i % COLORS.length]}cc, ${COLORS[i % COLORS.length]}66)`,
              }}
            />
          </div>
          {i < data.length - 1 && (
            <p className="mt-1 text-right text-[10px] text-white/20">
              ↓ {(((data[i + 1]?.value ?? 0) / item.value) * 100).toFixed(0)}% continued
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
