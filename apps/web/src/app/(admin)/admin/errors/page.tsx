import type { Metadata } from "next";
import { XCircle, AlertTriangle, Info, CheckCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Errors" };

const API = `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080"}/api/v1`;

type ErrorEntry = {
  id: string;
  level: "error" | "warning" | "info";
  message: string;
  service: string;
  count: number;
  lastSeen: string;
};

type ErrorsData = {
  entries: ErrorEntry[];
  summary: { errors: number; warnings: number; total: number };
};

async function fetchErrors(): Promise<ErrorsData | null> {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;
  const res = await fetch(`${API}/admin/errors`, {
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
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  return `${Math.floor(hrs / 24)} day(s) ago`;
}

export default async function ErrorsPage() {
  const data = await fetchErrors();

  return (
    <div className="space-y-8 pb-12">
      <div>
        <h1 className="text-2xl font-bold text-white">Error Dashboard</h1>
        <p className="mt-1 text-sm text-white/35">
          Real failures from processing_jobs &amp; clip_publications · last 7 days
        </p>
      </div>

      {!data ? (
        <p className="text-sm text-white/40">Failed to load error data.</p>
      ) : data.entries.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <CheckCircle className="h-10 w-10 text-emerald-400" />
          <p className="text-lg font-semibold text-white">All clear</p>
          <p className="text-sm text-white/40">No errors or failed jobs in the last 7 days.</p>
        </div>
      ) : (
        <>
          {/* Summary chips */}
          <div className="flex flex-wrap gap-3">
            <span className="flex items-center gap-1.5 rounded-full border border-rose-500/20 bg-rose-500/10 px-3 py-1 text-xs font-medium text-rose-400">
              <XCircle className="h-3.5 w-3.5" />
              {data.summary.errors} error{data.summary.errors !== 1 ? "s" : ""}
            </span>
            <span className="flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-400">
              <AlertTriangle className="h-3.5 w-3.5" />
              {data.summary.warnings} warning{data.summary.warnings !== 1 ? "s" : ""}
            </span>
            <span className="ml-auto text-xs text-white/30">
              Refreshes every 30 s · last 7 days
            </span>
          </div>

          {/* Error list */}
          <div className="space-y-2">
            {data.entries.map((e) => (
              <div
                key={e.id}
                className={`flex items-start gap-4 rounded-xl border p-4 ${
                  e.level === "error"
                    ? "border-rose-500/20 bg-rose-500/[0.04]"
                    : e.level === "warning"
                      ? "border-amber-500/20 bg-amber-500/[0.04]"
                      : "border-white/[0.06] bg-white/[0.025]"
                }`}
              >
                <div className="mt-0.5 shrink-0">
                  {e.level === "error"   && <XCircle        className="h-4 w-4 text-rose-400" />}
                  {e.level === "warning" && <AlertTriangle   className="h-4 w-4 text-amber-400" />}
                  {e.level === "info"    && <Info            className="h-4 w-4 text-blue-400" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="break-all font-mono text-sm text-white/80">{e.message}</p>
                  <div className="mt-1.5 flex flex-wrap gap-3 text-[11px] text-white/30">
                    <span className="rounded bg-white/[0.06] px-1.5 py-0.5 font-medium">{e.service}</span>
                    <span>×{e.count}</span>
                    <span>last: {relativeTime(e.lastSeen)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
