import { apiFetch, type Profile } from "@/lib/api";
import { DashboardSidebar } from "@/components/layout/dashboard-sidebar";
import { Navbar } from "@/components/layout/navbar";
import { PageBackground } from "@/components/ui/page-background";
import { ReferralTracker } from "@/components/affiliates/referral-tracker";

export async function DashboardShell({
  children,
  token,
}: {
  children: React.ReactNode;
  token: string;
}) {
  let credits = 10;
  const profileRes = await apiFetch<Profile>("/api/v1/users/me", { token });
  if (profileRes.success && profileRes.data) {
    credits = profileRes.data.credits;
  }

  return (
    <div className="relative min-h-screen">
      <ReferralTracker token={token} />
      <PageBackground variant="dashboard" />
      <Navbar />
      <DashboardSidebar credits={credits} />
      <div className="lg:pl-64">
        <div className="mx-auto max-w-6xl px-4 py-8 pt-20 sm:px-6 lg:pt-8">{children}</div>
      </div>
    </div>
  );
}
