import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import {
  UserPlus, Video, CreditCard, Share2, Youtube,
  XCircle, CheckCircle2, AlertTriangle, Info,
} from "lucide-react";

export const metadata: Metadata = { title: "Audit Logs" };

const API = `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080"}/api/v1`;

type AuditEntry = {
  id: string;
  ts: string;
  actor: string;
  action: string;
  detail: string;
  category: "user" | "video" | "billing" | "publish" | "channel" | "error";
  severity: "info" | "success" | "warning" | "error";
};

type AuditData = { entries: AuditEntry[]; total: number };

async function fetchAuditLogs(days: number): Promise<AuditData | null> {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;
  const res = await fetch(`${API}/admin/audit-logs?days=${days}&limit=200`, {
    headers: { Authorization: `Bearer ${session.access_token}` },
    next: { revalidate: 30 },
  });
  if (!res.ok) return null;
  return (await res.json()).data;
}

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function absTime(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

const CATEGORY_ICON: Record<string, React.ReactNode> = {
  user:    <UserPlus   className="h-3.5 w-3.5" />,
  video:   <Video      className="h-3.5 w-3.5" />,
  billing: <CreditCard className="h-3.5 w-3.5" />,
  publish: <Share2     className="h-3.5 w-3.5" />,
  channel: <Youtube    className="h-3.5 w-3.5" />,
  error:   <XCircle    className="h-3.5 w-3.5" />,
};

const SEVERITY_STYLES: Record<string, string> = {
  info:    "bg-blue-500/10    text-blue-400    border-blue-500/20",
  success: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  warning: "bg-amber-500/10   text-amber-400   border-amber-500/20",
  error:   "bg-rose-500/10    text-rose-400    border-rose-500/20",
};

const SEVERITY_DOT: Record<string, string> = {
  info:    "bg-blue-400",
  success: "bg-emerald-400",
  warning: "bg-amber-400",
  error:   "bg-rose-400",
};

const SEVERITY_ICON: Record<string, React.ReactNode> = {
  info:    <Info           className="h-3 w-3" />,
  success: <CheckCircle2  className="h-3 w-3" />,
  warning: <AlertTriangle className="h-3 w-3" />,
  error:   <XCircle       className="h-3 w-3" />,
};

const CATEGORY_LABELS: Record<string, string> = {
  user: "User", video: "Video", billing: "Billing",
  publish: "Publish", channel: "Channel", error: "Error",
};

export default async function AuditLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string; category?: string }>;
}) {
  const { days: daysParam, category: catFilter } = await searchParams;
  const days = Math.min(90, Math.max(7, parseInt(daysParam ?? "30", 10)));
  const data = await fetchAuditLogs(days);

  const entries = data?.entries ?? [];
  const filtered =
    catFilter && catFilter !== "all"
      ? entries.filter((e) => e.category === catFilter)
      : entries;

  const counts = entries.reduce<Record<string, number>>((acc, e) => {
    acc[e.category] = (acc[e.category] ?? 0) + 1;
    return acc;
  }, {});

  const categories = ["all", "user", "video", "billing", "publish", "channel", "error"];

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Audit Logs</h1>
          <p className="mt-1 text-sm text-white/35">
            Unified event timeline · last {days} days
            {data ? ` · ${data.total} events` : ""}
          </p>
        </div>
        <div className="flex gap-2">
          {[7, 30, 90].map((d) => (
            <a
              key={d}
              href={`?days=${d}${catFilter ? `&category=${catFilter}` : ""}`}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                days === d ? "bg-white/10 text-white" : "text-white/40 hover:text-white/70"
              }`}
            >
              {d}d
            </a>
          ))}
        </div>
      </div>

      {!data ? (
        <p className="text-sm text-white/40">Failed to load audit logs.</p>
      ) : (
        <>
          {/* Category filter tabs */}
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => {
              const isActive = (catFilter ?? "all") === cat;
              const count = cat === "all" ? entries.length : (counts[cat] ?? 0);
              return (
                <a
                  key={cat}
                  href={`?days=${days}&category=${cat}`}
                  className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                    isActive
                      ? "border-white/20 bg-white/10 text-white"
                      : "border-transparent text-white/40 hover:text-white/60"
                  }`}
                >
                  {cat !== "all" && CATEGORY_ICON[cat]}
                  <span className="capitalize">{cat === "all" ? "All" : CATEGORY_LABELS[cat]}</span>
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] ${isActive ? "bg-white/15" : "bg-white/5"}`}
                  >
                    {count}
                  </span>
                </a>
              );
            })}
          </div>

          {filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-20 text-center">
              <CheckCircle2 className="h-10 w-10 text-emerald-400" />
              <p className="text-sm text-white/40">No events found for this filter.</p>
            </div>
          ) : (
            <div className="relative">
              {/* Vertical timeline line */}
              <div className="absolute left-[19px] top-0 h-full w-px bg-white/[0.06]" />

              <div className="space-y-1">
                {filtered.map((e) => (
                  <div key={e.id} className="flex gap-4 py-1">
                    {/* Timeline dot */}
                    <div className="relative z-10 mt-3 flex h-4 w-4 flex-shrink-0 items-center justify-center">
                      <span className={`h-2 w-2 rounded-full ${SEVERITY_DOT[e.severity]}`} />
                    </div>

                    {/* Entry card */}
                    <div className={`flex-1 rounded-xl border p-3 ${SEVERITY_STYLES[e.severity]}`}>
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          {SEVERITY_ICON[e.severity]}
                          <span className="text-sm font-medium">{e.action}</span>
                          <span className="hidden rounded-full bg-white/[0.08] px-1.5 py-0.5 text-[10px] text-white/40 sm:inline">
                            {CATEGORY_LABELS[e.category]}
                          </span>
                        </div>
                        <time
                          dateTime={e.ts}
                          title={absTime(e.ts)}
                          className="flex-shrink-0 text-[11px] text-white/25"
                        >
                          {relativeTime(e.ts)}
                        </time>
                      </div>
                      <p className="mt-1 truncate text-xs text-white/50">{e.detail}</p>
                      <p className="mt-0.5 truncate text-[11px] text-white/25">
                        actor:{" "}
                        {e.actor.length === 36
                          ? `${e.actor.slice(0, 8)}…`
                          : e.actor}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
