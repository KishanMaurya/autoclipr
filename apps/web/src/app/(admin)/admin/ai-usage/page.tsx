import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { Bot, Zap, Type, Hash } from "lucide-react";

export const metadata: Metadata = { title: "AI Usage" };

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
  return (await res.json()).data;
}

export default async function AiUsagePage() {
  const stats = await fetchStats();
  if (!stats) return <p className="text-white/40">Failed to load.</p>;

  const { ai, clips } = stats;

  const features = [
    { icon: Zap,  label: "Hooks Generated",    value: ai.hooksGenerated,    color: "#6366f1", pct: Math.round((ai.hooksGenerated / Math.max(1, clips.total)) * 100) },
    { icon: Type, label: "Titles Generated",   value: ai.titlesGenerated,   color: "#10b981", pct: Math.round((ai.titlesGenerated / Math.max(1, clips.total)) * 100) },
    { icon: Hash, label: "Captions Generated", value: ai.captionsGenerated, color: "#f59e0b", pct: Math.round((ai.captionsGenerated / Math.max(1, clips.total)) * 100) },
    { icon: Bot,  label: "Scripts Generated",  value: ai.scriptsGenerated,  color: "#3b82f6", pct: Math.round((ai.scriptsGenerated / Math.max(1, clips.total)) * 100) },
  ];

  return (
    <div className="space-y-8 pb-12">
      <div>
        <h1 className="text-2xl font-bold text-white">AI Usage Analytics</h1>
        <p className="mt-1 text-sm text-white/35">Credits consumed and feature adoption rates</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {features.map((f) => (
          <div key={f.label} className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-4">
            <div className="mb-3 inline-flex rounded-lg p-2 bg-white/[0.06]">
              <f.icon className="h-4 w-4 text-white/60" />
            </div>
            <p className="text-2xl font-bold text-white">{f.value.toLocaleString()}</p>
            <p className="text-xs text-white/45">{f.label}</p>
            <p className="text-[11px] text-white/25 mt-0.5">~{f.pct}% of clips</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-5">
        <h3 className="mb-4 text-sm font-semibold text-white/70">Feature Adoption</h3>
        <div className="space-y-4">
          {features.map((f) => (
            <div key={f.label}>
              <div className="mb-1.5 flex justify-between text-xs">
                <span className="text-white/60">{f.label}</span>
                <span className="font-semibold text-white">{f.value.toLocaleString()} <span className="text-white/30">({f.pct}% of clips)</span></span>
              </div>
              <div className="h-2 rounded-full bg-white/[0.06]">
                <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, f.pct)}%`, background: f.color }} />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-5 border-t border-white/[0.06] pt-4">
          <div className="flex justify-between text-xs">
            <span className="text-white/40">Total Credits Consumed</span>
            <span className="font-bold text-white">{ai.creditsConsumed.toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
