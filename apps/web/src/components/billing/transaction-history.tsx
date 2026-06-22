"use client";

import { useState } from "react";
import { Search, Download, Receipt } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { Transaction } from "@/app/(dashboard)/billing/page";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

export function TransactionHistory({ transactions }: { transactions: Transaction[] }) {
  const [search, setSearch] = useState("");

  const filtered = transactions.filter((tx) => {
    const q = search.toLowerCase();
    return (
      tx.invoice_number.toLowerCase().includes(q) ||
      tx.plan_id.toLowerCase().includes(q) ||
      tx.amount.toLowerCase().includes(q) ||
      new Date(tx.payment_date).toLocaleDateString().includes(q)
    );
  });

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02]">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 border-b border-white/[0.06] px-6 py-4">
        <div className="flex items-center gap-2">
          <Receipt className="h-4 w-4 text-emerald-400" />
          <h2 className="font-semibold">Transaction History</h2>
          {transactions.length > 0 && (
            <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-xs text-muted-foreground">
              {transactions.length}
            </span>
          )}
        </div>
        <div className="relative w-56">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search transactions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-8 text-sm"
          />
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-16 text-center text-muted-foreground">
          <Receipt className="h-8 w-8 opacity-30" />
          <p className="text-sm">
            {search ? "No transactions match your search." : "No transactions yet."}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06] text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-6 py-3">Invoice</th>
                <th className="px-6 py-3">Plan</th>
                <th className="px-6 py-3">Amount</th>
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3">Next Billing</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-right">Receipt</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((tx, i) => {
                const date = new Date(tx.payment_date).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                });
                const nextBilling = tx.period_end
                  ? new Date(tx.period_end).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })
                  : "—";
                const downloadUrl = `${API_URL}/api/v1/billing/invoice/download?invoiceNumber=${encodeURIComponent(tx.invoice_number)}&plan=${encodeURIComponent(tx.plan_id.charAt(0).toUpperCase() + tx.plan_id.slice(1))}&amount=${encodeURIComponent(tx.amount)}&date=${encodeURIComponent(date)}${tx.transaction_id ? `&txId=${encodeURIComponent(tx.transaction_id)}` : ""}`;

                return (
                  <tr
                    key={tx.id}
                    className={`border-b border-white/[0.04] transition-colors hover:bg-white/[0.02] ${i === filtered.length - 1 ? "border-0" : ""}`}
                  >
                    <td className="px-6 py-4 font-mono text-xs text-white/70">
                      #{tx.invoice_number}
                    </td>
                    <td className="px-6 py-4 capitalize font-medium">
                      {tx.plan_id}
                      {tx.billing_period && (
                        <span className="ml-1.5 text-[10px] text-white/30 capitalize">
                          · {tx.billing_period}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-semibold text-emerald-400">{tx.amount}</td>
                    <td className="px-6 py-4 text-muted-foreground">{date}</td>
                    <td className="px-6 py-4 text-muted-foreground">{nextBilling}</td>
                    <td className="px-6 py-4">
                      <Badge variant="success" className="text-xs">
                        {tx.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <a
                        href={downloadUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-xs text-white/70 transition-colors hover:bg-white/[0.08] hover:text-white"
                      >
                        <Download className="h-3 w-3" />
                        PDF
                      </a>
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
