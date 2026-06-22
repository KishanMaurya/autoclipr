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
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Manage Your Membership</h1>
          <p className="text-muted-foreground">View your subscription and credit usage</p>
        </div>
        <Button variant="gradient" asChild className="shrink-0 self-start">
          <Link href="/pricing">Change Subscription</Link>
        </Button>
      </div>

      <Card className="glass relative overflow-hidden">
        <Badge variant="success" className="absolute right-6 top-6">
          Active
        </Badge>
        <CardHeader>
          <CardTitle>Current Plan</CardTitle>
          <p className="text-3xl font-bold capitalize">{planId}</p>
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
              <span className="font-medium">{credits}</span>
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
