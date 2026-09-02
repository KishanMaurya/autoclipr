/**
 * Suspense fallback for the pricing section.
 *
 * PricingSection reads searchParams, so Next suspends it during streaming.
 * With no fallback the section occupied zero height and the rest of the page
 * jumped upward as it resolved. These cards match the real layout's
 * dimensions so nothing moves when the swap happens.
 */
export function PricingSkeleton({ showHeader = true }: { showHeader?: boolean }) {
  return (
    <section className="px-4 py-12 sm:px-6" aria-busy="true" aria-label="Loading pricing">
      <div className="mx-auto max-w-6xl">
        {/* Mirrors PricingSection's own showHeader switch — /pricing renders
            its heading in the page, so a second one here would shift the
            layout on swap. */}
        {showHeader && (
          <div className="mb-10 flex flex-col items-center gap-3">
            <div className="h-8 w-64 animate-pulse rounded-lg bg-white/[0.06]" />
            <div className="h-4 w-80 animate-pulse rounded bg-white/[0.04]" />
          </div>
        )}

        <div className="grid items-start gap-5 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6"
              // The middle card is taller in the real layout; matching that
              // here is what stops the grid resizing on swap.
              style={{ minHeight: i === 1 ? 520 : 470 }}
            >
              <div className="h-10 w-10 animate-pulse rounded-xl bg-white/[0.06]" />
              <div className="mt-4 h-5 w-24 animate-pulse rounded bg-white/[0.06]" />
              <div className="mt-3 h-9 w-32 animate-pulse rounded-lg bg-white/[0.06]" />
              <div className="mt-6 h-11 w-full animate-pulse rounded-xl bg-white/[0.05]" />
              <div className="mt-6 space-y-3">
                {[0, 1, 2, 3, 4].map((r) => (
                  <div key={r} className="flex items-center gap-2">
                    <div className="h-3.5 w-3.5 shrink-0 animate-pulse rounded-full bg-white/[0.06]" />
                    <div
                      className="h-3 animate-pulse rounded bg-white/[0.04]"
                      style={{ width: `${70 - r * 6}%` }}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
