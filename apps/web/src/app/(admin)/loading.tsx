/**
 * Loading state for every admin route.
 *
 * Sixteen admin pages fetch from the API server-side, and without this the
 * browser sits on the previous page until the response lands — on a slow
 * query that reads as a dead click.
 */
export default function AdminLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading">
      <div className="space-y-2">
        <div className="h-6 w-48 animate-pulse rounded-lg bg-white/[0.06]" />
        <div className="h-4 w-80 animate-pulse rounded bg-white/[0.04]" />
      </div>

      {/* KPI row — the shape most admin pages open with. */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-xl border border-white/[0.07] bg-[#24303F] p-5"
          >
            <div className="h-10 w-10 animate-pulse rounded-xl bg-white/[0.06]" />
            <div className="mt-4 h-7 w-20 animate-pulse rounded bg-white/[0.06]" />
            <div className="mt-2 h-3 w-16 animate-pulse rounded bg-white/[0.04]" />
          </div>
        ))}
      </div>

      {/* Table body. */}
      <div className="overflow-hidden rounded-xl border border-white/[0.07] bg-[#24303F]">
        <div className="border-b border-white/[0.07] px-5 py-3">
          <div className="h-3 w-32 animate-pulse rounded bg-white/[0.06]" />
        </div>
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="flex items-center gap-4 border-b border-white/[0.04] px-5 py-4 last:border-0"
          >
            <div className="h-4 flex-1 animate-pulse rounded bg-white/[0.04]" />
            <div className="h-4 w-24 animate-pulse rounded bg-white/[0.04]" />
            <div className="h-6 w-16 animate-pulse rounded-full bg-white/[0.05]" />
          </div>
        ))}
      </div>
    </div>
  );
}
