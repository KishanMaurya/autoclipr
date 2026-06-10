import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { Navbar } from "@/components/layout/navbar";
import { PlatformConnectionSetup } from "@/components/setup/platform-connection-setup";
import { PageBackground } from "@/components/ui/page-background";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Platform Connection" };

const ONBOARDING_COOKIE = "autoclipr_onboarding_complete";

export default async function SetupPlatformsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/login?redirect=/setup/platforms");
  }

  const params = await searchParams;
  const fromDashboard = params.from === "dashboard";
  const cookieStore = await cookies();
  const onboardingDone = cookieStore.get(ONBOARDING_COOKIE)?.value === "1";

  const mode: "trial" | "dashboard" =
    fromDashboard || onboardingDone ? "dashboard" : "trial";

  return (
    <div className="relative min-h-screen">
      <PageBackground variant="auth" />
      <Navbar />
      <main className="px-4 pb-16 pt-24 sm:px-6">
        <PlatformConnectionSetup mode={mode} />
      </main>
    </div>
  );
}
