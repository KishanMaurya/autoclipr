import { createClient } from "@/lib/supabase/server";
import { apiFetch, type AnalyticsOverview } from "@/lib/api";
import { AnalyticsDashboard } from "@/components/dashboard/analytics-dashboard";

export const metadata = { title: "Analytics" };

export default async function AnalyticsPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const res = await apiFetch<AnalyticsOverview>("/api/v1/analytics", {
    token: session!.access_token,
  });

  const initialData: AnalyticsOverview = res.data ?? {
    summary: {
      posted_count: 0,
      failed_count: 0,
      pending_count: 0,
      total_views: 0,
      total_likes: 0,
      connected_platforms_count: 0,
    },
    connected_platforms: [],
    by_platform: {},
    publications: [],
  };

  return <AnalyticsDashboard initialData={initialData} />;
}
