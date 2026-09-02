"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCw, Home } from "lucide-react";

/**
 * Route-level error boundary.
 *
 * Without this, a render error anywhere in a page subtree gives the visitor a
 * blank white document — on the marketing pages that is a lost signup with no
 * signal that anything went wrong.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // The digest is the only handle on the server-side stack, which is not
    // sent to the browser. Without logging it here a production error is
    // effectively unreportable.
    console.error("Route error:", error.message, error.digest);
  }, [error]);

  return (
    <main className="flex min-h-[70vh] items-center justify-center px-4 py-16">
      <div className="w-full max-w-md rounded-2xl border border-white/[0.07] bg-white/[0.02] p-8 text-center backdrop-blur">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/15">
          <AlertTriangle className="h-6 w-6 text-amber-400" aria-hidden />
        </div>

        <h1 className="mt-5 text-xl font-semibold text-white">Something went wrong</h1>
        <p className="mt-2 text-sm text-white/50">
          This page hit an unexpected error. Trying again often clears it.
        </p>

        {error.digest && (
          <p className="mt-3 font-mono text-[11px] text-white/25">
            Reference: {error.digest}
          </p>
        )}

        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#030014]"
          >
            <RotateCw className="h-4 w-4" aria-hidden />
            Try again
          </button>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 px-5 py-2.5 text-sm text-white/70 transition-colors hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#030014]"
          >
            <Home className="h-4 w-4" aria-hidden />
            Back home
          </Link>
        </div>
      </div>
    </main>
  );
}
