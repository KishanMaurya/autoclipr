import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { CouponDetail, type CouponDetailData } from "@/components/admin/coupon-detail";

export const metadata: Metadata = { title: "Coupon" };

const API = `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080"}/api/v1`;

async function fetchCoupon(
  id: string,
): Promise<{ data: CouponDetailData; token: string } | null> {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;

  const res = await fetch(`${API}/coupons/${id}`, {
    headers: { Authorization: `Bearer ${session.access_token}` },
    // Never cached — the page is read straight after mutating from it.
    cache: "no-store",
  });
  if (!res.ok) return null;

  const body = await res.json();
  return { data: body.data, token: session.access_token };
}

export default async function CouponDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await fetchCoupon(id);

  if (!result) notFound();

  return (
    <div className="space-y-6">
      <Link
        href="/admin/coupons"
        className="inline-flex items-center gap-2 text-sm text-white/40 transition-colors hover:text-white/70"
      >
        <ArrowLeft className="h-4 w-4" />
        All coupons
      </Link>

      <CouponDetail data={result.data} token={result.token} />
    </div>
  );
}
