import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminThemeToggle } from "@/components/admin/admin-header";

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
    <div className="min-h-screen bg-[#06030f] text-white">
      <AdminSidebar />
      <div className="lg:pl-60">
        {/* Top bar */}
        <div className="sticky top-0 z-20 flex h-12 items-center justify-end border-b border-white/[0.05] bg-[#06030f]/80 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
          <AdminThemeToggle />
        </div>
        <div className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </div>
      </div>
    </div>
  );
}
