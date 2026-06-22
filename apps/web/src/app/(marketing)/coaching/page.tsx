import type { Metadata } from "next";
import Link from "next/link";
import { Construction, ArrowLeft } from "lucide-react";

export const metadata: Metadata = { title: "Coaching — AutoClipr" };

export default function CoachingPage() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10">
        <Construction className="h-8 w-8 text-emerald-400" />
      </div>
      <h1 className="text-3xl font-bold text-white">Coaching</h1>
      <p className="mt-3 max-w-md text-white/50">
        1-on-1 creator coaching is coming soon. We&apos;re building something special.
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-5 py-2.5 text-sm text-white/70 transition-colors hover:bg-white/[0.08] hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to home
      </Link>
    </div>
  );
}
