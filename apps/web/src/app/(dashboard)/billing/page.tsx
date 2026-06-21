import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

export const metadata = { title: "Billing" };

type BillingData = {
  profile: { credits: number; subscription_tier: string };
  subscription: { plan_id: string; status: string; current_period_end?: string } | null;
  credits: number;
};

export default async function BillingPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const billingRes = await apiFetch<BillingData>("/api/v1/billing/subscription", {
    token: session!.access_token,
  });

  const billing = billingRes.data;
  const tier = billing?.profile?.subscription_tier ?? "free";
  const credits = billing?.credits ?? 10;
  const planId = billing?.subscription?.plan_id ?? "free";

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Manage Your Membership</h1>
          <p className="text-muted-foreground">View your subscription and credit usage</p>
        </div>
        <Button variant="gradient" asChild className="shrink-0">
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
            {tier === "free"
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
            <Progress value={Math.min(100, (credits / 100) * 100)} />
          </div>
          {billing?.subscription?.current_period_end && (
            <p className="text-xs text-muted-foreground">
              Cycle ending:{" "}
              {new Date(billing.subscription.current_period_end).toLocaleDateString()}
            </p>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
