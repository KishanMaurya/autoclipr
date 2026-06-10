import { Navbar } from "@/components/layout/navbar";
import { AddChannelSetup } from "@/components/setup/add-channel-setup";
import { PageBackground } from "@/components/ui/page-background";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const metadata = { title: "Channel Setup" };

export default async function SetupChannelPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session) {
    redirect("/channels");
  }

  return (
    <div className="relative min-h-screen">
      <PageBackground variant="auth" />
      <Navbar />
      <main className="px-4 pb-16 pt-24 sm:px-6">
        <AddChannelSetup />
      </main>
    </div>
  );
}
