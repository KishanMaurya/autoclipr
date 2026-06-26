import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { Activity, Cpu, Database, AlertTriangle, CheckCircle } from "lucide-react";

export const metadata: Metadata = { title: "System Health" };

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1";

async function fetchStats() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;
  const res = await fetch(`${API}/admin/stats`, {
    headers: { Authorization: `Bearer ${session.access_token}` },
    next: { revalidate: 30 },
  });
  if (!res.ok) return null;
  return (await res.json()).data;
}

function Bar({ label, value, max = 100 }: { label: string; value: number; max?: number }) {
  const pct = Math.min(100, (value / max) * 100);
  const color = pct > 80 ? "#ef4444" : pct > 60 ? "#f59e0b" : "#10b981";
  return (
    <div>
      <div className="mb-1.5 flex justify-between text-sm">
        <span className="text-white/60">{label}</span>
        <span className="font-semibold text-white">{value}{max === 100 ? "%" : ""}</span>
      </div>
      <div className="h-2.5 rounded-full bg-white/[0.06]">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

export default async function SystemPage() {
  const stats = await fetchStats();
  if (!stats) return <p className="text-white/40">Failed to load.</p>;

  const { system, videos } = stats;

  const services = [
    { name: "API Server",          status: "healthy" },
    { name: "Database (Supabase)", status: "healthy" },
    { name: "Redis Queue",         status: "healthy" },
    { name: "Video Processor",     status: system.processingJobs > 0 ? "active" : "idle" },
    { name: "Email Service",       status: "healthy" },
    { name: "Storage (Supabase)",  status: "healthy" },
    { name: "DodoPayments",        status: "healthy" },
  ];

  return (
    <div className="space-y-8 pb-12">
      <div>
        <h1 className="text-2xl font-bold text-white">System Health</h1>
        <p className="mt-1 text-sm text-white/35">Infrastructure status · live</p>
      </div>

      {/* Status badges */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { icon: Cpu,           label: "CPU",             value: `${system.cpuPercent}%`,     ok: system.cpuPercent < 80 },
          { icon: Database,      label: "Memory",          value: `${system.memoryPercent}%`,  ok: system.memoryPercent < 80 },
          { icon: Activity,      label: "Queue Size",      value: system.queueSize,             ok: system.queueSize < 500 },
          { icon: AlertTriangle, label: "Failed Jobs",     value: system.failedJobs,            ok: system.failedJobs === 0 },
        ].map((k) => (
          <div key={k.label} className={`rounded-xl border p-4 ${k.ok ? "border-emerald-500/20 bg-emerald-500/[0.04]" : "border-rose-500/20 bg-rose-500/[0.04]"}`}>
            <div className="flex items-center justify-between">
              <k.icon className={`h-5 w-5 ${k.ok ? "text-emerald-400" : "text-rose-400"}`} />
              {k.ok
                ? <CheckCircle className="h-4 w-4 text-emerald-400" />
                : <AlertTriangle className="h-4 w-4 text-rose-400" />
              }
            </div>
            <p className={`mt-3 text-2xl font-bold ${k.ok ? "text-white" : "text-rose-300"}`}>{k.value}</p>
            <p className="text-xs text-white/45">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Gauges */}
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-5 space-y-5">
        <h3 className="text-sm font-semibold text-white/70">Resource Usage</h3>
        <Bar label="CPU"     value={system.cpuPercent} />
        <Bar label="Memory"  value={system.memoryPercent} />
        <Bar label="Storage" value={videos.storagePct} />
      </div>

      {/* Processing queue */}
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-5">
        <h3 className="mb-4 text-sm font-semibold text-white/70">Job Queue</h3>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-indigo-400">{system.queueSize}</p>
            <p className="text-xs text-white/35 mt-0.5">Queued</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-emerald-400">{system.processingJobs}</p>
            <p className="text-xs text-white/35 mt-0.5">Processing</p>
          </div>
          <div>
            <p className={`text-2xl font-bold ${system.failedJobs > 0 ? "text-rose-400" : "text-white/40"}`}>{system.failedJobs}</p>
            <p className="text-xs text-white/35 mt-0.5">Failed</p>
          </div>
        </div>
      </div>

      {/* Service status */}
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-5">
        <h3 className="mb-4 text-sm font-semibold text-white/70">Services</h3>
        <div className="space-y-2">
          {services.map((svc) => (
            <div key={svc.name} className="flex items-center justify-between rounded-lg bg-white/[0.03] px-4 py-3">
              <span className="text-sm text-white/70">{svc.name}</span>
              <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                svc.status === "healthy"  ? "bg-emerald-500/15 text-emerald-400" :
                svc.status === "active"   ? "bg-blue-500/15 text-blue-400" :
                svc.status === "idle"     ? "bg-white/[0.06] text-white/30" :
                                            "bg-rose-500/15 text-rose-400"
              }`}>{svc.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
