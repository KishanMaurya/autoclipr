import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";

export const metadata: Metadata = { title: "Admin Team" };

export default function TeamPage() {
  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",").map((e) => e.trim()).filter(Boolean);

  return (
    <div className="space-y-8 pb-12">
      <div>
        <h1 className="text-2xl font-bold text-white">Admin Team</h1>
        <p className="mt-1 text-sm text-white/35">Admins are controlled via the ADMIN_EMAILS environment variable</p>
      </div>

      <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-5">
        <h3 className="mb-4 text-sm font-semibold text-white/70">Active Admins</h3>
        <div className="space-y-2">
          {adminEmails.map((email) => (
            <div key={email} className="flex items-center gap-3 rounded-lg bg-white/[0.04] px-4 py-3">
              <ShieldCheck className="h-4 w-4 text-red-400 shrink-0" />
              <span className="text-sm text-white/80">{email}</span>
              <span className="ml-auto rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-red-400">Admin</span>
            </div>
          ))}
          {adminEmails.length === 0 && (
            <p className="text-center text-sm text-white/25 py-6">No admins configured. Set ADMIN_EMAILS in your .env</p>
          )}
        </div>
        <p className="mt-4 text-xs text-white/25">To add or remove admins, update the ADMIN_EMAILS env var and redeploy.</p>
      </div>
    </div>
  );
}
