import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { apiFetch } from "@/lib/api";
import { AffiliateDashboard, AffiliateApply } from "./client";

export const metadata: Metadata = { title: "Affiliate Dashboard — AutoClipr" };

export type AffiliateStats = {
  total_clicks: number;
  total_referrals: number;
  total_conversions: number;
  total_earnings_paise: number;
  pending_earnings_paise: number;
  paid_out_paise: number;
  available_paise: number;
  commission_rate: number;
};

export type AffiliateData = {
  affiliate: {
    id: string;
    ref_code: string;
    status: string;
    commission_rate: number;
    email: string | null;
    channel_url: string | null;
    applied_at: string;
    approved_at: string | null;
  };
  stats: AffiliateStats;
  referrals: Array<{
    id: string;
    status: string;
    plan_id: string | null;
    created_at: string;
    converted_at: string | null;
  }>;
  commissions: Array<{
    id: string;
    amount_paise: number;
    commission_rate: number;
    plan_id: string | null;
    billing_period: string | null;
    status: string;
    created_at: string;
  }>;
  payouts: Array<{
    id: string;
    amount_paise: number;
    status: string;
    payment_method: string;
    paid_at: string | null;
    created_at: string;
  }>;
};

export default async function AffiliatePage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const token = session!.access_token;

  const res = await apiFetch<AffiliateData>("/api/v1/affiliates/me", {
    token,
    cache: "no-store",
  });

  if (!res.success || !res.data) {
    // No affiliate account yet — show apply form
    return (
      <div className="mx-auto max-w-2xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold sm:text-3xl">Affiliate Program</h1>
          <p className="text-muted-foreground mt-1">Earn 30–40% recurring commission for every creator you refer.</p>
        </div>
        <AffiliateApply token={token} />
      </div>
    );
  }

  return <AffiliateDashboard data={res.data} token={token} />;
}
