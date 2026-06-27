import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminShell } from "@/components/admin/admin-shell";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s — AutoClipr Admin" },
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) redirect("/login");

  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);

  if (!adminEmails.includes((session.user.email ?? "").toLowerCase())) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-[#1A222C]">
      <AdminShell userEmail={session.user.email ?? ""}>
        {children}
      </AdminShell>
    </div>
  );
}
