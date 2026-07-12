"use client";

import { useState } from "react";
import { Search, Flame, ArrowUpCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export type CreditTransaction = {
  id: string;
  amount: number;
  balance_after: number;
  reason: string;
  reference_id: string | null;
  created_at: string;
};

const REASON_LABELS: Record<string, string> = {
  clip_generation: "Clip generation",
  url_import_pipeline: "Video import & clipping",
};

function formatReason(reason: string): string {
  return REASON_LABELS[reason] ?? reason.replace(/_/g, " ");
}

export function CreditHistory({ transactions }: { transactions: CreditTransaction[] }) {
  const [search, setSearch] = useState("");

  const filtered = transactions.filter((tx) => {
    const q = search.toLowerCase();
    return (
      formatReason(tx.reason).toLowerCase().includes(q) ||
      new Date(tx.created_at).toLocaleDateString().includes(q) ||
      String(tx.amount).includes(q)
    );
  });

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02]">
      {/* Header */}
      <div className="flex flex-col gap-3 border-b border-white/[0.06] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center gap-2">
          <Flame className="h-4 w-4 text-orange-400" />
          <h2 className="font-semibold">Credit Usage History</h2>
          {transactions.length > 0 && (
            <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-xs text-muted-foreground">
              {transactions.length}
            </span>
          )}
        </div>
        <div className="relative w-full sm:w-56">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search history..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-8 text-sm"
          />
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-16 text-center text-muted-foreground">
          <Flame className="h-8 w-8 opacity-30" />
          <p className="text-sm">
            {search ? "No history matches your search." : "No credit usage yet — generate your first clips to see history here."}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06] text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-6 py-3">Activity</th>
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3">Change</th>
                <th className="px-6 py-3 text-right">Balance After</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((tx, i) => {
                const date = new Date(tx.created_at).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                });
                const time = new Date(tx.created_at).toLocaleTimeString("en-IN", {
                  hour: "2-digit",
                  minute: "2-digit",
                });
                const isCredit = tx.amount > 0;

                return (
                  <tr
                    key={tx.id}
                    className={`border-b border-white/[0.04] transition-colors hover:bg-white/[0.02] ${i === filtered.length - 1 ? "border-0" : ""}`}
                  >
                    <td className="px-6 py-4 font-medium capitalize">
                      <span className="flex items-center gap-2">
                        {isCredit ? (
                          <ArrowUpCircle className="h-3.5 w-3.5 text-emerald-400" />
                        ) : (
                          <Flame className="h-3.5 w-3.5 text-orange-400" />
                        )}
                        {formatReason(tx.reason)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {date} <span className="text-xs text-white/30">{time}</span>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={isCredit ? "success" : "outline"} className="text-xs font-mono">
                        {isCredit ? "+" : ""}
                        {tx.amount}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-white/70">
                      {tx.balance_after}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
