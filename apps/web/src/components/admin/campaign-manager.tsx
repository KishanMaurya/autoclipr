"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Mail, Eye, Send, AlertTriangle } from "lucide-react";

const API = `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080"}/api/v1`;

export type Campaign = {
  id: string;
  name: string;
  type: string;
  status: "pending" | "running" | "completed" | "failed" | "skipped";
  scheduled_for: string;
  skip_reason: string | null;
  completed_at: string | null;
};

type RunResult = {
  dryRun: boolean;
  couponCode: string | null;
  scanned: number;
  claimed: number;
  sent: number;
  failed: number;
  skippedUnsubscribed: number;
  skipReason?: string;
};

const STATUS_STYLE: Record<Campaign["status"], string> = {
  completed: "bg-emerald-500/15 text-emerald-400",
  running: "bg-blue-500/15 text-blue-400",
  pending: "bg-white/10 text-white/50",
  skipped: "bg-amber-500/15 text-amber-400",
  failed: "bg-red-500/15 text-red-400",
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
  });
}

export function CampaignManager({
  initialCampaigns,
  token,
}: {
  initialCampaigns: Campaign[];
  token: string;
}) {
  const router = useRouter();
  // Read from props, never copied into state — router.refresh() passes fresh
  // data down and useState would keep showing the first render's copy.
  const campaigns = initialCampaigns;

  const [busy, setBusy] = useState<"preview" | "run" | null>(null);
  const [preview, setPreview] = useState<RunResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function call(path: string): Promise<RunResult | null> {
    setError(null);
    try {
      const res = await fetch(`${API}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.message ?? "Request failed.");
      return body.data as RunResult;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed.");
      return null;
    }
  }

  async function runPreview() {
    setBusy("preview");
    setPreview(await call("/admin/campaigns/saturday/preview"));
    setBusy(null);
  }

  async function runNow() {
    if (
      !window.confirm(
        preview
          ? `Send the Saturday offer to ${preview.claimed} user${preview.claimed === 1 ? "" : "s"}? This emails real customers and cannot be recalled.`
          : "Send the Saturday offer now? This emails real customers and cannot be recalled. Preview first if you are unsure.",
      )
    ) {
      return;
    }

    setBusy("run");
    const result = await call("/admin/campaigns/saturday/run");
    setBusy(null);
    if (result) {
      setPreview(null);
      router.refresh();
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={runPreview}
          disabled={busy !== null}
          className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2 text-sm text-white/70 transition-colors hover:bg-white/[0.06] disabled:opacity-40"
        >
          {busy === "preview" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
          Preview
        </button>
        <button
          type="button"
          onClick={runNow}
          disabled={busy !== null}
          className="inline-flex items-center gap-2 rounded-lg bg-[#3C50E0] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#3242c4] disabled:opacity-50"
        >
          {busy === "run" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Send now
        </button>
      </div>

      {preview && (
        <div className="rounded-xl border border-white/[0.07] bg-[#24303F] p-5">
          <h2 className="text-sm font-semibold text-white">Preview — nothing has been sent</h2>
          {preview.skipReason ? (
            <p className="mt-3 flex items-center gap-2 text-sm text-amber-400">
              <AlertTriangle className="h-4 w-4" />
              {preview.skipReason}
            </p>
          ) : (
            <>
              <p className="mt-1 text-xs text-white/40">
                Advertising <span className="font-mono text-white/70">{preview.couponCode}</span>
              </p>
              <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
                <Stat label="Would email" value={preview.claimed} tint="#3C50E0" />
                <Stat label="Scanned" value={preview.scanned} tint="#8B5CF6" />
                <Stat label="Unsubscribed" value={preview.skippedUnsubscribed} tint="#F59E0B" />
              </div>
            </>
          )}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-white/[0.07] bg-[#24303F]">
        {campaigns.length === 0 ? (
          <div className="p-10 text-center">
            <Mail className="mx-auto h-8 w-8 text-white/20" />
            <p className="mt-3 text-sm text-white/50">No campaigns yet.</p>
            <p className="mt-1 text-xs text-white/30">
              One is created the first time the Saturday job runs.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-white/[0.07] text-left text-xs uppercase tracking-wider text-white/30">
                  <th className="px-5 py-3 font-medium">Campaign</th>
                  <th className="px-5 py-3 font-medium">Scheduled</th>
                  <th className="px-5 py-3 font-medium">Completed</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c) => (
                  <tr key={c.id} className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02]">
                    <td className="px-5 py-4">
                      <span className="text-white">{c.name}</span>
                      {c.skip_reason && (
                        <span className="ml-2 text-xs text-amber-400/70">{c.skip_reason}</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-white/50">{formatDate(c.scheduled_for)}</td>
                    <td className="px-5 py-4 text-white/50">{formatDate(c.completed_at)}</td>
                    <td className="px-5 py-4">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLE[c.status]}`}>
                        {c.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, tint }: { label: string; value: number; tint: string }) {
  return (
    <div>
      <div className="text-2xl font-semibold" style={{ color: tint }}>
        {value.toLocaleString()}
      </div>
      <div className="mt-0.5 text-xs text-white/40">{label}</div>
    </div>
  );
}
