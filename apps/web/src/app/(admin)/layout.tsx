import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminSidebar } from "@/components/admin/admin-sidebar";

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

  console.log("[admin-layout] ADMIN_EMAILS:", process.env.ADMIN_EMAILS);
  console.log("[admin-layout] user email:", session.user.email);
  console.log("[admin-layout] adminEmails list:", adminEmails);
  console.log("[admin-layout] match:", adminEmails.includes((session.user.email ?? "").toLowerCase()));

  if (!adminEmails.includes((session.user.email ?? "").toLowerCase())) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-[#06030f] text-white">
      <AdminSidebar />
      <div className="lg:pl-56">
        <div className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </div>
      </div>
    </div>
  );
}
