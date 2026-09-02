/**
 * Suspense fallback for the dashboard view.
 *
 * The boundary had no fallback, so the content area collapsed to nothing
 * while streaming and the page snapped into place when it resolved.
 */
export function DashboardSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading dashboard">
      <div className="space-y-2">
        <div className="h-7 w-56 animate-pulse rounded-lg bg-white/[0.06]" />
        <div className="h-4 w-72 animate-pulse rounded bg-white/[0.04]" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5"
          >
            <div className="h-9 w-9 animate-pulse rounded-xl bg-white/[0.06]" />
            <div className="mt-4 h-6 w-16 animate-pulse rounded bg-white/[0.06]" />
            <div className="mt-2 h-3 w-20 animate-pulse rounded bg-white/[0.04]" />
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5"
          >
            <div className="aspect-video w-full animate-pulse rounded-xl bg-white/[0.05]" />
            <div className="mt-4 h-4 w-3/4 animate-pulse rounded bg-white/[0.06]" />
            <div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-white/[0.04]" />
          </div>
        ))}
      </div>
    </div>
  );
}
