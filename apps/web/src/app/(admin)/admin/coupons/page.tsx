import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { CouponManager, type Coupon } from "@/components/admin/coupon-manager";

// Rendered per request, never prerendered or cached at the edge. These pages
// are read immediately after mutating from them, so a cached RSC payload would
// hand the admin back the state they just changed.
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Coupons" };

const API = `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080"}/api/v1`;

async function fetchCoupons(): Promise<{ coupons: Coupon[]; token: string } | null> {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;

  const res = await fetch(`${API}/coupons`, {
    headers: { Authorization: `Bearer ${session.access_token}` },
    // Never cached: an admin who just paused a coupon must see it paused.
    // A revalidate window would serve the pre-mutation response back to them.
    cache: "no-store",
  });
  if (!res.ok) return null;

  const body = await res.json();
  return { coupons: body.data ?? [], token: session.access_token };
}

export default async function CouponsPage() {
  const result = await fetchCoupons();

  if (!result) {
    return (
      <div className="rounded-xl border border-white/[0.07] bg-[#24303F] p-8 text-center">
        <p className="text-sm text-white/50">
          Could not load coupons. Check that you are signed in as an admin and the API is reachable.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Coupons</h1>
        <p className="mt-1 text-sm text-white/40">
          Discount codes for campaigns and partnerships. Percentage coupons are registered with
          the payment provider when created.
        </p>
      </div>

      <CouponManager initialCoupons={result.coupons} token={result.token} />
    </div>
  );
}
