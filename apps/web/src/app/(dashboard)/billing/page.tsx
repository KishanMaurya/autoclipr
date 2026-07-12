import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TransactionHistory } from "@/components/billing/transaction-history";

export const metadata = { title: "Billing" };

type BillingData = {
  profile: { credits: number; subscription_tier: string };
  subscription: { plan_id: string; status: string; current_period_end?: string } | null;
  credits: number;
};

export type Transaction = {
  id: string;
  invoice_number: string;
  plan_id: string;
  amount: string;
  status: string;
  transaction_id: string | null;
  payment_date: string;
  period_end: string | null;
  billing_period: string | null;
};

export default async function BillingPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const [billingRes, txRes] = await Promise.all([
    apiFetch<BillingData>("/api/v1/billing/subscription", { token: session!.access_token }),
    apiFetch<Transaction[]>("/api/v1/billing/transactions", { token: session!.access_token }),
  ]);

  const billing = billingRes.data;
  const tier = billing?.profile?.subscription_tier ?? "free";
  const credits = billing?.credits ?? 10;
  const planId = billing?.subscription?.plan_id ?? "free";
  const maxCredits = planId === "business" ? 1200 : planId === "creator" ? 500 : 100;
  const transactions = txRes.data ?? [];

  return (
    <div className="relative mx-auto max-w-3xl space-y-8">
      <div className="pointer-events-none absolute -top-16 left-1/2 h-52 w-[420px] -translate-x-1/2 rounded-full bg-amber-500/[0.06] blur-3xl" aria-hidden />

      <div className="relative flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">
            Manage Your{" "}
            <span className="bg-gradient-to-r from-amber-400 to-orange-300 bg-clip-text text-transparent">
              Membership
            </span>
          </h1>
          <p className="text-muted-foreground">View your subscription and credit usage</p>
        </div>
        <Button variant="gradient" asChild className="shrink-0 self-start shadow-lg shadow-emerald-500/20">
          <Link href="/pricing">Change Subscription</Link>
        </Button>
      </div>

      <Card className="glass relative overflow-hidden border-white/[0.08]">
        {/* Accent hairline + corner glow */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-amber-500/0 via-amber-500/60 to-amber-500/0" />
        <div className="pointer-events-none absolute -right-14 -top-14 h-44 w-44 rounded-full bg-amber-500/[0.08] blur-3xl" />

        <Badge variant="success" className="absolute right-6 top-6">
          <span className="mr-1.5 flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-1.5 w-1.5 animate-ping rounded-full bg-emerald-400 opacity-70" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
          </span>
          Active
        </Badge>
        <CardHeader>
          <CardTitle>Current Plan</CardTitle>
          <p className="text-3xl font-bold capitalize">
            <span className="bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">{planId}</span>
          </p>
          <p className="text-sm text-muted-foreground">
            {tier === "free" || tier === "starter"
              ? "Limited trial access to AutoClipr."
              : "Full access to your plan features."}
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <div className="mb-2 flex justify-between text-sm">
              <span>Credits remaining</span>
              <span className="font-semibold">
                {credits} <span className="text-xs font-normal text-muted-foreground">/ {maxCredits}</span>
              </span>
            </div>
            <Progress value={Math.min(100, (credits / maxCredits) * 100)} />
          </div>
          {billing?.subscription?.current_period_end && (
            <p className="text-xs text-muted-foreground">
              Cycle ending:{" "}
              {new Date(billing.subscription.current_period_end).toLocaleDateString()}
            </p>
          )}
        </CardContent>
      </Card>

      <TransactionHistory transactions={transactions} />
    </div>
  );
}
