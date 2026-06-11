import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PRIVATE_ROBOTS } from "@/lib/seo";

export const metadata: Metadata = {
  robots: PRIVATE_ROBOTS,
};
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/layout/dashboard-shell";

const ONBOARDING_COOKIE = "autoclipr_onboarding_complete";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/login");
  }

  const cookieStore = await cookies();
  const onboardingDone = cookieStore.get(ONBOARDING_COOKIE)?.value === "1";

  if (!onboardingDone) {
    redirect("/setup/platforms");
  }

  return (
    <DashboardShell token={session.access_token}>{children}</DashboardShell>
  );
}
