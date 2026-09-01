import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { CampaignManager, type Campaign } from "@/components/admin/campaign-manager";

// Read straight after mutating from this page, so never cached.
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Campaigns" };

const API = `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080"}/api/v1`;

async function fetchCampaigns(): Promise<{ campaigns: Campaign[]; token: string } | null> {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;

  const res = await fetch(`${API}/admin/campaigns`, {
    headers: { Authorization: `Bearer ${session.access_token}` },
    cache: "no-store",
  });
  if (!res.ok) return null;

  const body = await res.json();
  return { campaigns: body.data ?? [], token: session.access_token };
}

export default async function CampaignsPage() {
  const result = await fetchCampaigns();

  if (!result) {
    return (
      <div className="rounded-xl border border-white/[0.07] bg-[#24303F] p-8 text-center">
        <p className="text-sm text-white/50">
          Could not load campaigns. Check that you are signed in as an admin and the API is reachable.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Email campaigns</h1>
        <p className="mt-1 text-sm text-white/40">
          The Saturday offer emails free-tier users the currently featured coupon. Preview before
          sending — it reaches real customers.
        </p>
      </div>

      <CampaignManager initialCampaigns={result.campaigns} token={result.token} />
    </div>
  );
}
