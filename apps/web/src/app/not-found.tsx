import Link from "next/link";
import { Scissors, ArrowLeft, Sparkles } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      {/* Icon */}
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/10 ring-1 ring-white/[0.08]">
        <Sparkles className="h-9 w-9 text-emerald-400" />
      </div>

      {/* Badge */}
      <span className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
        <Scissors className="h-3 w-3" />
        Coming Soon
      </span>

      {/* Heading */}
      <h1 className="text-3xl font-extrabold text-white sm:text-4xl">
        We&apos;re building something special.
      </h1>
      <p className="mt-3 max-w-sm text-base text-white/40">
        This page is on its way. Check back soon — it&apos;ll be worth the wait.
      </p>

      {/* CTA */}
      <Link
        href="/"
        className="mt-8 inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-900/40 transition hover:bg-emerald-400"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to home
      </Link>
    </div>
  );
}
