import type { Metadata } from "next";
import { XCircle, AlertTriangle, Info } from "lucide-react";

export const metadata: Metadata = { title: "Errors" };

const MOCK_ERRORS = [
  { id: "1", level: "error",   message: "Unhandled rejection: Cannot read property 'clips' of undefined", count: 3,  lastSeen: "2 min ago", service: "video-processor" },
  { id: "2", level: "warning", message: "Stripe webhook verification failed for event evt_xxx",           count: 1,  lastSeen: "14 min ago", service: "billing" },
  { id: "3", level: "error",   message: "Redis connection timeout after 5000ms",                         count: 8,  lastSeen: "1 hr ago",  service: "queue" },
  { id: "4", level: "info",    message: "Affiliate commission skipped — referral already recorded",       count: 22, lastSeen: "3 hr ago",  service: "affiliates" },
  { id: "5", level: "warning", message: "Storage bucket response slow (>2s)",                            count: 5,  lastSeen: "6 hr ago",  service: "storage" },
];

export default function ErrorsPage() {
  return (
    <div className="space-y-8 pb-12">
      <div>
        <h1 className="text-2xl font-bold text-white">Error Dashboard</h1>
        <p className="mt-1 text-sm text-white/35">Recent errors and warnings across services · sample data</p>
      </div>

      <div className="rounded-xl border border-amber-500/10 bg-amber-500/[0.04] px-4 py-3">
        <p className="text-xs text-amber-400">Showing sample data. Connect Sentry or a logging service to see real error streams.</p>
      </div>

      <div className="space-y-2">
        {MOCK_ERRORS.map((e) => (
          <div
            key={e.id}
            className={`flex items-start gap-4 rounded-xl border p-4 ${
              e.level === "error"   ? "border-rose-500/20   bg-rose-500/[0.04]"   :
              e.level === "warning" ? "border-amber-500/20  bg-amber-500/[0.04]"  :
                                     "border-white/[0.06]   bg-white/[0.025]"
            }`}
          >
            <div className="mt-0.5 shrink-0">
              {e.level === "error"   && <XCircle       className="h-4 w-4 text-rose-400" />}
              {e.level === "warning" && <AlertTriangle  className="h-4 w-4 text-amber-400" />}
              {e.level === "info"    && <Info           className="h-4 w-4 text-blue-400" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-mono text-white/80 break-all">{e.message}</p>
              <div className="mt-1.5 flex gap-3 text-[11px] text-white/30">
                <span className="rounded bg-white/[0.06] px-1.5 py-0.5 font-medium">{e.service}</span>
                <span>×{e.count}</span>
                <span>last: {e.lastSeen}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
